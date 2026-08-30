const { db } = require('../config/database');

function list(req, res) {
  res.json(db.prepare('SELECT * FROM sales ORDER BY id DESC').all());
}

function get(req, res) {
  const row = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Sales tidak ditemukan.' });
  res.json(row);
}

function create(req, res) {
  const { nama, hp, rekening } = req.body;
  if (!nama) return res.status(400).json({ error: 'Nama sales wajib diisi.' });
  const info = db.prepare('INSERT INTO sales (nama, hp, rekening) VALUES (?, ?, ?)').run(nama, hp || null, rekening || null);
  res.status(201).json({ id: info.lastInsertRowid });
}

function update(req, res) {
  const { nama, hp, rekening, status } = req.body;
  const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Sales tidak ditemukan.' });
  db.prepare('UPDATE sales SET nama = ?, hp = ?, rekening = ?, status = ? WHERE id = ?')
    .run(nama, hp || null, rekening || null, status || 'Aktif', req.params.id);
  res.json({ message: 'Data sales diperbarui.' });
}

function remove(req, res) {
  const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Sales tidak ditemukan.' });
  db.prepare("UPDATE sales SET status = 'Nonaktif' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Sales dinonaktifkan.' });
}

// Dashboard bonus per sales:
// Total Bonus = sigma(qty terjual x insentif per unit produk) dari seluruh order_items
// Sisa Bonus = Total Bonus - total pembayaran bonus yang sudah dibayarkan
function dashboard(req, res) {
  const salesId = req.params.id;
  const sales = db.prepare('SELECT * FROM sales WHERE id = ?').get(salesId);
  if (!sales) return res.status(404).json({ error: 'Sales tidak ditemukan.' });

  const totalBonusRow = db.prepare(`
    SELECT COALESCE(SUM(oi.qty * oi.insentifPerUnit), 0) AS total
    FROM order_items oi
    JOIN orders o ON o.id = oi.orderId
    WHERE o.salesId = ?
  `).get(salesId);

  const totalDibayarRow = db.prepare(`
    SELECT COALESCE(SUM(jumlahBayar), 0) AS total
    FROM pembayaran
    WHERE salesId = ? AND jenis = 'pembayaran_bonus'
  `).get(salesId);

  const totalBonus = totalBonusRow.total;
  const totalDibayar = totalDibayarRow.total;
  const sisaBonus = totalBonus - totalDibayar;

  const historiPembayaran = db.prepare(`
    SELECT id, noPembayaran, tanggal, jumlahBayar, keterangan
    FROM pembayaran
    WHERE salesId = ? AND jenis = 'pembayaran_bonus'
    ORDER BY tanggal DESC
  `).all(salesId);

  const totalOrder = db.prepare('SELECT COUNT(*) c FROM orders WHERE salesId = ?').get(salesId).c;

  res.json({
    sales,
    totalBonus,
    totalDibayar,
    sisaBonus,
    totalOrder,
    historiPembayaran
  });
}

module.exports = { list, get, create, update, remove, dashboard };
