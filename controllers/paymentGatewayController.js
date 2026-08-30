const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const { paymentReceivedTemplate, sendMail } = require('../services/emailService');
const { formatRupiah } = require('../utils/format');

// Generate unique payment ID
function generatePaymentId() {
  const row = db.prepare('SELECT id FROM payments ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PAY-${ymd}-${String(next).padStart(6, '0')}`;
}

// Create payment intent
function createPayment(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const { orderId, amount, method, provider } = req.body;
  if (!orderId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'orderId dan amount wajib diisi dengan benar.' });
  }

  // Verify order belongs to customer
  const order = db.prepare(`
    SELECT o.*, c.nama as customerNama
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

  // Generate payment details based on method
  let paymentDetails = {};
  const paymentId = generatePaymentId();
  const methodLower = (method || 'transfer').toLowerCase();

  if (methodLower === 'transfer') {
    paymentDetails = {
      bank: 'BCA',
      accountNumber: '1234567890',
      accountName: 'CV Brothers Farm',
      amount: Number(amount),
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  } else if (methodLower === 'qris') {
    paymentDetails = {
      qrString: '00020101021226600116BCA12345678900213ID102001123456789011234567890202',
      amount: Number(amount),
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  } else if (methodLower === 'va') {
    const vaNumber = '988' + String(Date.now()).slice(-10);
    paymentDetails = {
      vaNumber: vaNumber,
      bank: 'BCA',
      amount: Number(amount),
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // Create payment record
  const info = db.prepare(`
    INSERT INTO pembayaran (noPembayaran, tanggal, jumlahBayar, jenis, metodeBayar, customerId, salesId, supplierId, orderId, keterangan, status, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId,
    new Date().toISOString().slice(0, 10),
    Number(amount),
    'penerimaan_customer',
    methodLower,
    customerId,
    null,
    null,
    orderId,
    JSON.stringify({ orderNo: order.noOrder, customerName: order.customerNama }),
    'Menunggu Pembayaran',
    req.user.id
  );

  // Update order payment status
  db.prepare('UPDATE orders SET metodeBayar = ?, status = ? WHERE id = ?')
    .run(methodLower, 'Menunggu Pembayaran', orderId);

  // Notify admin about new payment (non-blocking)
  const mail = paymentReceivedTemplate({
    customerName: order.customerNama || 'Unknown',
    orderNo: order.noOrder,
    amount: Number(amount),
    paymentMethod: methodLower,
    status: 'Menunggu Pembayaran'
  });
  sendMail(mail).catch(err => console.error('Failed to send payment email:', err));

  res.status(201).json({
    paymentId,
    orderId,
    amount: Number(amount),
    method: methodLower,
    provider: provider || 'dummy',
    status: 'Menunggu Pembayaran',
    details: paymentDetails,
    instructions: getPaymentInstructions(methodLower, paymentDetails)
  });
}

// Get payment status
function getPaymentStatus(req, res) {
  const customerId = req.user.customerId;
  const paymentId = req.params.paymentId;

  const payment = db.prepare(`
    SELECT p.*, o.noOrder, o.total
    FROM pembayaran p
    JOIN orders o ON o.id = p.orderId
    WHERE p.noPembayaran = ? AND p.customerId = ?
  `).get(paymentId, customerId);

  if (!payment) {
    return res.status(404).json({ error: 'Pembayaran tidak ditemukan.' });
  }

  res.json(payment);
}

// Simulate payment success (for testing)
function simulateSuccess(req, res) {
  const { paymentId } = req.params;
  
  const payment = db.prepare('SELECT * FROM pembayaran WHERE noPembayaran = ?').get(paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'Pembayaran tidak ditemukan.' });
  }

  if (payment.status === 'Lunas') {
    return res.status(400).json({ error: 'Pembayaran ini sudah lunas.' });
  }

  const amount = payment.jumlahBayar;

  // Update payment status
  db.prepare(`
    UPDATE pembayaran SET status = 'Lunas', tanggal = ? WHERE noPembayaran = ?
  `).run(new Date().toISOString().slice(0, 10), paymentId);

  // Update order status
  db.prepare(`
    UPDATE orders SET status = 'Lunas', metodeBayar = ? WHERE id = ?
  `).run(payment.metodeBayar, payment.orderId);

  // Update customer saldo (piutang berkurang)
  db.prepare(`
    UPDATE customer SET saldoAwal = saldoAwal - ? WHERE id = ?
  `).run(amount, payment.customerId);

  res.json({ message: 'Pembayaran berhasil disimulasikan.', paymentId, status: 'Lunas' });
}

// Webhook handlers (for future real gateway integration)
function xenditWebhook(req, res) {
  const event = req.body;
  console.log('Xendit webhook:', event);
  
  // In production, validate webhook signature here
  if (event.status === 'PAID') {
    const paymentId = event.payment_id;
    const amount = event.amount;
    
    const payment = db.prepare('SELECT * FROM pembayaran WHERE noPembayaran = ?').get(paymentId);
    if (payment && payment.status !== 'Lunas') {
      db.prepare('UPDATE pembayaran SET status = ? WHERE noPembayaran = ?').run('Lunas', paymentId);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Lunas', payment.orderId);
    }
  }
  
  res.status(200).json({ received: true });
}

function midtransWebhook(req, res) {
  const event = req.body;
  console.log('Midtrans webhook:', event);
  
  // In production, validate signature key here
  if (event.transaction_status === 'settlement') {
    const orderId = event.order_id;
    const amount = event.gross_amount;
    
    const order = db.prepare('SELECT * FROM orders WHERE noOrder = ?').get(orderId);
    if (order && order.status !== 'Lunas') {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Lunas', order.id);
      // Link payment record
      db.prepare('UPDATE pembayaran SET status = ? WHERE orderId = ?').run('Lunas', order.id);
    }
  }
  
  res.status(200).json({ received: true });
}

// Helper: payment instructions
function getPaymentInstructions(method, details) {
  if (method === 'transfer') {
    return `Transfer ke Bank ${details.bank} No. ${details.accountNumber} a.n. ${details.accountName} sebesar ${formatRupiah(details.amount)} sebelum ${new Date(details.expiredAt).toLocaleString('id-ID')}`;
  } else if (method === 'qris') {
    return `Scan QRIS di bawah ini sebesar ${formatRupiah(details.amount)}`;
  } else if (method === 'va') {
    return `Bayar ke Virtual Account BCA ${details.vaNumber} sebesar ${formatRupiah(details.amount)}`;
  }
  return 'Selesaikan pembayaran sesuai instruksi.';
}

module.exports = {
  createPayment,
  getPaymentStatus,
  simulateSuccess,
  xenditWebhook,
  midtransWebhook
};
