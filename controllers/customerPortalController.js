const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { orderCreatedTemplate, paymentReceivedTemplate, sendMail } = require('../services/emailService');
const { formatRupiah } = require('../utils/format');

// Generate unique payment ID
function generatePaymentId() {
  const row = db.prepare('SELECT id FROM pembayaran ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PAY-${ymd}-${String(next).padStart(6, '0')}`;
}

// Get customer's own orders
function myOrders(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const orders = db.prepare(`
    SELECT o.*, s.nama as salesNama
    FROM orders o
    LEFT JOIN sales s ON s.id = o.salesId
    WHERE o.customerId = ?
    ORDER BY o.id DESC
  `).all(customerId);

  res.json(orders);
}

// Get customer's own order detail
function myOrderDetail(req, res) {
  const customerId = req.user.customerId;
  const orderId = req.params.id;

  const order = db.prepare(`
    SELECT o.*, s.nama as salesNama
    FROM orders o
    LEFT JOIN sales s ON s.id = o.salesId
    WHERE o.id = ? AND o.customerId = ?
  `).get(orderId, customerId);

  if (!order) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }

  const items = db.prepare(`
    SELECT oi.*, p.nama as produkNama, p.satuan
    FROM order_items oi
    JOIN produk p ON p.id = oi.produkId
    WHERE oi.orderId = ?
  `).all(orderId);

  res.json({ ...order, items });
}

// Get customer's own payments (penerimaan customer)
function myPayments(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const payments = db.prepare(`
    SELECT p.*
    FROM pembayaran p
    WHERE p.customerId = ? AND p.jenis = 'penerimaan_customer'
    ORDER BY p.id DESC
  `).all(customerId);

  res.json(payments);
}

// Get customer's own invoices
function myInvoices(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const invoices = db.prepare(`
    SELECT i.*
    FROM invoice i
    JOIN orders o ON o.id = i.refId
    WHERE o.customerId = ? AND i.jenis = 'customer'
    ORDER BY i.id DESC
  `).all(customerId);

  res.json(invoices);
}

// Get latest prices (read-only, for customer catalog reference)
function latestPrices(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10) || 20);
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT p.id, p.kode, p.nama, p.kategori, p.satuan, p.hargaJualTerakhir, s.nama as supplierNama
    FROM produk p
    LEFT JOIN supplier s ON s.id = p.supplierId
    WHERE p.status = 'Aktif' AND p.hargaJualTerakhir IS NOT NULL
    ORDER BY p.kategori, p.nama
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    data: rows,
    pagination: { page, limit, hasNext: rows.length === limit }
  });
}

// Get all active products for order form dropdown
function productsForOrder(req, res) {
  const rows = db.prepare(`
    SELECT p.id, p.kode, p.nama, p.kategori, p.satuan, p.hargaJualTerakhir
    FROM produk p
    WHERE p.status = 'Aktif' AND p.hargaJualTerakhir IS NOT NULL
    ORDER BY p.kategori, p.nama
  `).all();

  res.json(rows);
}

// Customer creates their own order
function createOrder(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'Akun ini tidak terasosiasi dengan customer.' });
  }

  const { tanggal, metodeBayar, jatuhTempo, keterangan, items } = req.body;
  if (!tanggal || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tanggal dan items (minimal 1) wajib diisi.' });
  }

  try {
    // Use same transaction logic as admin order creation
    const { createOrderTransaction } = require('../controllers/orderController');
    const result = createOrderTransaction({
      tanggal,
      customerId,
      salesId: null,
      metodeBayar: metodeBayar || 'Tempo',
      jatuhTempo: jatuhTempo || null,
      keterangan: keterangan || null,
      items
    }, req.user.id);

    // Notify admin about new order (non-blocking)
    const customer = db.prepare('SELECT nama FROM customer WHERE id = ?').get(customerId);
    const orderNo = result.noOrder || ('ORD-' + Date.now());
    const mail = orderCreatedTemplate({
      customerName: customer?.nama || 'Unknown',
      orderNo,
      total: result.total || 0,
      items: items || []
    });
    sendMail(mail).catch(err => console.error('Failed to send order email:', err));

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal membuat order.' });
  }
}

// Create payment for an order
function createPayment(req, res) {
  const customerId = req.user.customerId;
  const { orderId, amount, method } = req.body;
  
  if (!orderId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'orderId dan amount wajib diisi.' });
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

  // Generate payment ID
  const paymentId = generatePaymentId();
  const methodLower = (method || 'transfer').toLowerCase();

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

  // Update order status
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Menunggu Pembayaran', orderId);

  // Notify admin about new payment (non-blocking)
  const mail = paymentReceivedTemplate({
    customerName: order.customerNama || 'Unknown',
    orderNo: order.noOrder,
    amount: Number(amount),
    paymentMethod: methodLower,
    status: 'Menunggu Pembayaran'
  });
  sendMail(mail).catch(err => console.error('Failed to send payment email:', err));

  // Return payment details
  const paymentDetails = {
    transfer: {
      bank: 'BCA',
      accountNumber: '1234567890',
      accountName: 'CV Brothers Farm'
    },
    qris: {
      qrString: '00020101021226600116BCA12345678900213ID102001123456789011234567890202'
    },
    va: {
      vaNumber: '988' + String(Date.now()).slice(-10),
      bank: 'BCA'
    }
  };

  res.status(201).json({
    paymentId,
    orderId,
    amount: Number(amount),
    method: methodLower,
    status: 'Menunggu Pembayaran',
    details: paymentDetails[methodLower] || paymentDetails.transfer,
    instructions: `Silakan bayar sebesar ${formatRupiah(amount)} sebelum 24 jam.`
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

// Simulate payment success (for testing/demo)
function simulatePayment(req, res) {
  const paymentId = req.params.paymentId;
  
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
  db.prepare('UPDATE customer SET saldoAwal = saldoAwal - ? WHERE id = ?').run(amount, payment.customerId);

  // Notify admin about payment success (non-blocking)
  const orderNoRow = db.prepare('SELECT noOrder FROM orders WHERE id = ?').get(payment.orderId);
  const customerRow = db.prepare('SELECT nama FROM customer WHERE id = ?').get(payment.customerId);
  const successMail = paymentReceivedTemplate({
    customerName: customerRow?.nama || 'Unknown',
    orderNo: orderNoRow?.noOrder || '-',
    amount,
    paymentMethod: payment.metodeBayar,
    status: 'Lunas'
  });
  sendMail(successMail).catch(err => console.error('Failed to send payment success email:', err));

  res.json({ message: 'Pembayaran berhasil disimulasikan.', paymentId, status: 'Lunas' });
}

module.exports = {
  myOrders,
  myOrderDetail,
  myPayments,
  myInvoices,
  latestPrices,
  productsForOrder,
  createOrder,
  createPayment,
  getPaymentStatus,
  simulatePayment
};
