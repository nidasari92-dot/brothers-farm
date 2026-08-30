const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.status !== 'Aktif') {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    customerId: user.customerId || null,
    salesId: user.salesId || null,
    supplierId: user.supplierId || null
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });

  res.json({ token, user: payload });
}

function logout(req, res) {
  // Stateless JWT: logout ditangani di sisi client dengan menghapus token.
  res.json({ message: 'Logout berhasil.' });
}

function me(req, res) {
  res.json({ user: req.user });
}

// Admin membuat user baru (opsional, dipakai untuk provisioning akun sales/supplier/customer login)
function createUser(req, res) {
  const { username, password, nama, role, salesId, supplierId, customerId } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, dan role wajib diisi.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(`
      INSERT INTO users (username, password, nama, role, salesId, supplierId, customerId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, hash, nama || null, role, salesId || null, supplierId || null, customerId || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Gagal membuat user (username mungkin sudah dipakai).' });
  }
}

function listUsers(req, res) {
  const rows = db.prepare(`
    SELECT id, username, nama, role, status, createdAt
    FROM users
    ORDER BY role ASC, username ASC
  `).all();
  res.json({ users: rows });
}

function resetUserPassword(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
  res.json({ ok: true, username: user.username });
}

module.exports = { login, logout, me, createUser, listUsers, resetUserPassword };
