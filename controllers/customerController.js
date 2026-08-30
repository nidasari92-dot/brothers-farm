const { db } = require('../config/database');

function list(req, res) {
  res.json(db.prepare('SELECT * FROM customer ORDER BY id DESC').all());
}

function get(req, res) {
  const row = db.prepare('SELECT * FROM customer WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Customer tidak ditemukan.' });
  res.json(row);
}

function create(req, res) {
  const { nama, hp, email, alamat } = req.body;
  if (!nama) return res.status(400).json({ error: 'Nama customer wajib diisi.' });
  const info = db.prepare('INSERT INTO customer (nama, hp, email, alamat) VALUES (?, ?, ?, ?)').run(nama, hp || null, email || null, alamat || null);
  res.status(201).json({ id: info.lastInsertRowid });
}

function update(req, res) {
  const { nama, hp, email, alamat, status } = req.body;
  const existing = db.prepare('SELECT id FROM customer WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer tidak ditemukan.' });
  db.prepare('UPDATE customer SET nama = ?, hp = ?, email = ?, alamat = ?, status = ? WHERE id = ?')
    .run(nama, hp || null, email || null, alamat || null, status || 'Aktif', req.params.id);
  res.json({ message: 'Data customer diperbarui.' });
}

function remove(req, res) {
  const existing = db.prepare('SELECT id FROM customer WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer tidak ditemukan.' });
  db.prepare("UPDATE customer SET status = 'Nonaktif' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Customer dinonaktifkan.' });
}

module.exports = { list, get, create, update, remove };
