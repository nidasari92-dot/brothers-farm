const { db } = require('../config/database');

function generateKode() {
  const row = db.prepare("SELECT id FROM produk ORDER BY id DESC LIMIT 1").get();
  const next = row ? row.id + 1 : 1;
  return 'PRD' + String(next).padStart(4, '0');
}

function list(req, res) {
  const rows = db.prepare(`
    SELECT p.*, s.nama AS supplierNama
    FROM produk p
    LEFT JOIN supplier s ON s.id = p.supplierId
    ORDER BY p.id DESC
  `).all();
  res.json(rows);
}

function get(req, res) {
  const row = db.prepare(`
    SELECT p.*, s.nama AS supplierNama
    FROM produk p LEFT JOIN supplier s ON s.id = p.supplierId
    WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  res.json(row);
}

function create(req, res) {
  const { kategori, nama, satuan, supplierId, insentif, hargaBeliTerakhir, hargaJualTerakhir } = req.body;
  if (!nama) return res.status(400).json({ error: 'Nama produk wajib diisi.' });
  const kode = generateKode();
  const info = db.prepare(`
    INSERT INTO produk (kode, kategori, nama, satuan, supplierId, insentif, hargaBeliTerakhir, hargaJualTerakhir)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(kode, kategori || null, nama, satuan || null, supplierId || null,
         insentif || 0, hargaBeliTerakhir || 0, hargaJualTerakhir || 0);
  res.status(201).json({ id: info.lastInsertRowid, kode });
}

function update(req, res) {
  const { kategori, nama, satuan, supplierId, insentif, status, hargaBeliTerakhir, hargaJualTerakhir } = req.body;
  const existing = db.prepare('SELECT id FROM produk WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

  db.prepare(`
    UPDATE produk SET kategori = ?, nama = ?, satuan = ?, supplierId = ?, insentif = ?,
      status = ?, hargaBeliTerakhir = ?, hargaJualTerakhir = ?
    WHERE id = ?
  `).run(
    kategori || null, nama, satuan || null, supplierId || null, insentif || 0,
    status || 'Aktif', hargaBeliTerakhir || 0, hargaJualTerakhir || 0, req.params.id
  );
  res.json({ message: 'Produk diperbarui.' });
}

function remove(req, res) {
  const existing = db.prepare('SELECT id FROM produk WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  db.prepare('UPDATE produk SET status = ? WHERE id = ?').run('Nonaktif', req.params.id);
  res.json({ message: 'Produk dinonaktifkan.' });
}

module.exports = { list, get, create, update, remove };
