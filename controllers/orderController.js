const { db } = require('../config/database');

function generateNoOrder() {
  const row = db.prepare('SELECT id FROM orders ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${ymd}-${String(next).padStart(4, '0')}`;
}

const createOrderTransaction = db.transaction((payload, userId) => {
  const { tanggal, customerId, salesId, metodeBayar, jatuhTempo, keterangan, items } = payload;

  const noOrder = generateNoOrder();
  let total = 0;
  let totalInsentif = 0;

  const orderInfo = db.prepare(`
    INSERT INTO orders (noOrder, tanggal, customerId, salesId, metodeBayar, jatuhTempo, keterangan, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noOrder, tanggal, customerId, salesId, metodeBayar || 'Tempo', jatuhTempo || null, keterangan || null, userId);

  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (orderId, produkId, qty, satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    const produk = db.prepare('SELECT * FROM produk WHERE id = ?').get(item.produkId);
    if (!produk) throw new Error(`Produk id ${item.produkId} tidak ditemukan.`);

    const qty = Number(item.qty);
    if (!qty || qty <= 0) throw new Error('Qty harus lebih besar dari 0.');
    const hargaJual = item.hargaJual != null ? Number(item.hargaJual) : produk.hargaJualTerakhir;
    const hargaBeli = item.hargaBeli != null ? Number(item.hargaBeli) : produk.hargaBeliTerakhir;
    const subtotal = qty * hargaJual;
    const insentifPerUnit = produk.insentif || 0;

    insertItem.run(orderId, item.produkId, qty, item.satuan || produk.satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal);

    total += subtotal;
    totalInsentif += qty * insentifPerUnit;
  }

  db.prepare('UPDATE orders SET total = ?, totalInsentif = ? WHERE id = ?').run(total, totalInsentif, orderId);

  // Auto-update total utang supplier berdasarkan harga beli order
  const supplierTotals = db.prepare(`
    SELECT p.supplierId, SUM(oi.qty * oi.hargaBeli) AS totalHutang
    FROM order_items oi JOIN produk p ON p.id = oi.produkId
    WHERE oi.orderId = ?
    GROUP BY p.supplierId
  `).all(orderId);
  const upsertSupplier = db.prepare('UPDATE supplier SET totalUtang = totalUtang + ? WHERE id = ?');
  for (const row of supplierTotals) {
    if (row.supplierId) upsertSupplier.run(row.totalHutang, row.supplierId);
  }

  return { orderId, noOrder, total, totalInsentif };
});

function list(req, res) {
  const rows = db.prepare(`
    SELECT o.*, c.nama AS customerNama, s.nama AS salesNama
    FROM orders o
    LEFT JOIN customer c ON c.id = o.customerId
    LEFT JOIN sales s ON s.id = o.salesId
    ORDER BY o.id DESC
  `).all();
  res.json(rows);
}

function get(req, res) {
  const order = db.prepare(`
    SELECT o.*, c.nama AS customerNama, s.nama AS salesNama
    FROM orders o
    LEFT JOIN customer c ON c.id = o.customerId
    LEFT JOIN sales s ON s.id = o.salesId
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  const items = db.prepare(`
    SELECT oi.*, p.nama AS produkNama, p.kode AS produkKode
    FROM order_items oi
    JOIN produk p ON p.id = oi.produkId
    WHERE oi.orderId = ?
  `).all(req.params.id);

  res.json({ ...order, items });
}

// items: [{ produkId, qty, satuan, hargaJual (opsional, default harga terbaru produk) }]
const createOrder = db.transaction((payload, userId) => {
  const { tanggal, customerId, salesId, metodeBayar, jatuhTempo, keterangan, items } = payload;

  const noOrder = generateNoOrder();
  let total = 0;
  let totalInsentif = 0;

  const orderInfo = db.prepare(`
    INSERT INTO orders (noOrder, tanggal, customerId, salesId, metodeBayar, jatuhTempo, keterangan, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noOrder, tanggal, customerId, salesId, metodeBayar || 'Tempo', jatuhTempo || null, keterangan || null, userId);

  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (orderId, produkId, qty, satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    const produk = db.prepare('SELECT * FROM produk WHERE id = ?').get(item.produkId);
    if (!produk) throw new Error(`Produk id ${item.produkId} tidak ditemukan.`);

    const qty = Number(item.qty);
    if (!qty || qty <= 0) throw new Error('Qty harus lebih besar dari 0.');
    const hargaJual = item.hargaJual != null ? Number(item.hargaJual) : produk.hargaJualTerakhir;
    const hargaBeli = item.hargaBeli != null ? Number(item.hargaBeli) : produk.hargaBeliTerakhir;
    const subtotal = qty * hargaJual;
    const insentifPerUnit = produk.insentif || 0;

    insertItem.run(orderId, item.produkId, qty, item.satuan || produk.satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal);

    total += subtotal;
    totalInsentif += qty * insentifPerUnit;
  }

  db.prepare('UPDATE orders SET total = ?, totalInsentif = ? WHERE id = ?').run(total, totalInsentif, orderId);

  // Auto-update total utang supplier berdasarkan harga beli order
  const supplierTotals = db.prepare(`
    SELECT p.supplierId, SUM(oi.qty * oi.hargaBeli) AS totalHutang
    FROM order_items oi JOIN produk p ON p.id = oi.produkId
    WHERE oi.orderId = ?
    GROUP BY p.supplierId
  `).all(orderId);
  const upsertSupplier = db.prepare('UPDATE supplier SET totalUtang = totalUtang + ? WHERE id = ?');
  for (const row of supplierTotals) {
    if (row.supplierId) upsertSupplier.run(row.totalHutang, row.supplierId);
  }

  return { orderId, noOrder, total, totalInsentif };
});

function create(req, res) {
  const { tanggal, customerId, salesId, items } = req.body;
  if (!tanggal || !customerId || !salesId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tanggal, customerId, salesId, dan items (minimal 1) wajib diisi.' });
  }
  try {
    const result = createOrder(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal membuat order.' });
  }
}

function updateStatus(req, res) {
  const { status } = req.body;
  const existing = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Status order diperbarui.' });
}

module.exports = { list, get, create, updateStatus, createOrderTransaction };
