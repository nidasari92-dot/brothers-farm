const { db } = require('../config/database');

function list(req, res) {
  res.json(db.prepare('SELECT * FROM supplier ORDER BY id DESC').all());
}

function get(req, res) {
  const row = db.prepare('SELECT * FROM supplier WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
  res.json(row);
}

function create(req, res) {
  const { nama, hp, rekening } = req.body;
  if (!nama) return res.status(400).json({ error: 'Nama supplier wajib diisi.' });
  const info = db.prepare('INSERT INTO supplier (nama, hp, rekening) VALUES (?, ?, ?)').run(nama, hp || null, rekening || null);
  res.status(201).json({ id: info.lastInsertRowid });
}

function update(req, res) {
  const { nama, hp, rekening, status } = req.body;
  const existing = db.prepare('SELECT id FROM supplier WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
  db.prepare('UPDATE supplier SET nama = ?, hp = ?, rekening = ?, status = ? WHERE id = ?')
    .run(nama, hp || null, rekening || null, status || 'Aktif', req.params.id);
  res.json({ message: 'Data supplier diperbarui.' });
}

function remove(req, res) {
  const existing = db.prepare('SELECT id FROM supplier WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
  db.prepare("UPDATE supplier SET status = 'Nonaktif' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Supplier dinonaktifkan.' });
}

// Dashboard terpisah per supplier: barang yang disuplai, total utang, histori pembayaran
function dashboard(req, res) {
  const supplierId = req.params.id;
  const supplier = db.prepare('SELECT * FROM supplier WHERE id = ?').get(supplierId);
  if (!supplier) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });

  const produkList = db.prepare('SELECT id, kode, nama, satuan, hargaBeliTerakhir FROM produk WHERE supplierId = ?').all(supplierId);

  const historiPembayaran = db.prepare(`
    SELECT id, noPembayaran, tanggal, jumlahBayar, keterangan
    FROM pembayaran
    WHERE supplierId = ? AND jenis = 'pengeluaran_supplier'
    ORDER BY tanggal DESC
  `).all(supplierId);

  res.json({
    supplier,
    produkDisuplai: produkList,
    totalUtang: supplier.totalUtang,
    totalBayar: supplier.totalBayar,
    sisaUtang: supplier.totalUtang - supplier.totalBayar,
    historiPembayaran
  });
}

module.exports = { list, get, create, update, remove, dashboard };
