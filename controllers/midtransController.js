const https = require('https');
const crypto = require('crypto');
const { db } = require('../config/database');

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_API_BASE = process.env.MIDTRANS_API_BASE || 'https://api.sandbox.midtrans.com';

function midtransRequest(path, body) {
  const auth = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
  const data = JSON.stringify(body);
  const options = {
    hostname: new URL(MIDTRANS_API_BASE).hostname,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': 'Basic ' + auth,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf.toString()) });
        } catch {
          resolve({ status: res.statusCode, body: buf.toString() });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createTransaction(req, res) {
  if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
    return res.status(500).json({ error: 'Midtrans belum dikonfigurasi di server.' });
  }

  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const { orderId, amount } = req.body;
  if (!orderId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'orderId dan amount wajib diisi.' });
  }

  const order = db.prepare(`
    SELECT o.*, c.nama as customerNama, c.email as customerEmail, c.hp as customerHp
    FROM orders o
    LEFT JOIN customer c ON c.id = o.customerId
    WHERE o.id = ? AND o.customerId = ?
  `).get(orderId, customerId);

  if (!order) {
    return res.status(404).json({ error: 'Order tidak ditemukan atau bukan milik Anda.' });
  }

  if (order.status === 'Lunas') {
    return res.status(400).json({ error: 'Order ini sudah lunas.' });
  }

  const transactionDetails = {
    order_id: order.noOrder || `ORDER-${order.id}`,
    gross_amount: Math.round(Number(amount)),
  };

  const customerDetails = {
    first_name: order.customerNama || 'Customer',
    email: order.customerEmail || '',
    phone: order.customerHp || '',
  };

  const itemDetails = {
    id: transactionDetails.order_id,
    price: Math.round(Number(amount)),
    quantity: 1,
    name: `Pembayaran Order ${transactionDetails.order_id}`,
  };

  const payload = {
    transaction_details: transactionDetails,
    customer_details: customerDetails,
    item_details: [itemDetails],
    enabled_payments: ['credit_card', 'bca_va', 'bni_va', 'bri_va', 'permata_va', 'gopay', 'shopeepay', 'qris'],
  };

  try {
    const result = await midtransRequest('/v1/transactions', payload);
    if (result.status !== 201 && result.status !== 200) {
      console.error('Midtrans create error:', result.body);
      return res.status(500).json({ error: 'Gagal membuat transaksi Midtrans.', detail: result.body });
    }

    const midtransOrderId = result.body.order_id || transactionDetails.order_id;
    const token = result.body.token;
    const redirectUrl = result.body.redirect_url;

    // Create local payment record
    const paymentId = generatePaymentId();
    db.prepare(`
      INSERT INTO pembayaran (noPembayaran, tanggal, jumlahBayar, jenis, metodeBayar, customerId, salesId, supplierId, orderId, keterangan, status, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      new Date().toISOString().slice(0, 10),
      Number(amount),
      'penerimaan_customer',
      'midtrans',
      customerId,
      null,
      null,
      orderId,
      JSON.stringify({ orderNo: order.noOrder, customerName: order.customerNama, midtransOrderId }),
      'Menunggu Pembayaran',
      req.user.id
    );

    db.prepare('UPDATE orders SET metodeBayar = ?, status = ? WHERE id = ?')
      .run('midtrans', 'Menunggu Pembayaran', orderId);

    res.json({
      paymentId,
      orderId,
      amount: Number(amount),
      method: 'midtrans',
      provider: 'midtrans',
      status: 'Menunggu Pembayaran',
      token,
      redirect_url: redirectUrl,
    });
  } catch (err) {
    console.error('Midtrans request failed:', err);
    res.status(500).json({ error: 'Gagal menghubungi Midtrans: ' + err.message });
  }
}

function generatePaymentId() {
  const row = db.prepare('SELECT id FROM pembayaran ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PAY-${ymd}-${String(next).padStart(6, '0')}`;
}

function midtransWebhook(req, res) {
  const event = req.body;
  console.log('Midtrans webhook:', event);

  const orderId = event.order_id;
  const transactionStatus = event.transaction_status;
  const grossAmount = event.gross_amount;
  const signatureKey = event.signature_key;

  // Validate signature if configured
  if (MIDTRANS_SERVER_KEY) {
    const serverKey = MIDTRANS_SERVER_KEY;
    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${transactionStatus}${grossAmount}${serverKey}`)
      .digest('hex');
    if (signatureKey && signatureKey !== expected) {
      console.warn('Invalid Midtrans signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }
  }

  if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
    const order = db.prepare('SELECT * FROM orders WHERE noOrder = ?').get(orderId);
    if (order && order.status !== 'Lunas') {
      db.prepare('UPDATE orders SET status = ?, metodeBayar = ? WHERE id = ?')
        .run('Lunas', 'midtrans', order.id);
      db.prepare('UPDATE pembayaran SET status = ? WHERE orderId = ?').run('Lunas', order.id);
    }
  } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
    const order = db.prepare('SELECT * FROM orders WHERE noOrder = ?').get(orderId);
    if (order) {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Dibatalkan', order.id);
      db.prepare('UPDATE pembayaran SET status = ? WHERE orderId = ?').run('Gagal', order.id);
    }
  }

  res.status(200).json({ received: true });
}

module.exports = {
  createTransaction,
  midtransWebhook,
};
