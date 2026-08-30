const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { userRegisteredTemplate, sendMail } = require('../services/emailService');

// Customer self-registration
function register(req, res) {
  const { nama, hp, email, password, alamat } = req.body;
  if (!nama || !password) {
    return res.status(400).json({ error: 'Nama dan password wajib diisi.' });
  }

  const username = email || hp;
  if (!username) {
    return res.status(400).json({ error: 'Email atau HP wajib diisi untuk username.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: 'Username/email/HP sudah terdaftar.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  // Create customer in customer table first
  const custInfo = db.prepare(`
    INSERT INTO customer (nama, hp, email, alamat, status)
    VALUES (?, ?, ?, ?, 'Aktif')
  `).run(nama, hp || null, email || null, alamat || null);

  // Create user account with role=customer
  const userInfo = db.prepare(`
    INSERT INTO users (username, password, nama, role, customerId, status)
    VALUES (?, ?, ?, 'customer', ?, 'Aktif')
  `).run(username, hash, nama, custInfo.lastInsertRowid);

  res.status(201).json({
    message: 'Registrasi berhasil. Silakan login.',
    customerId: custInfo.lastInsertRowid,
    userId: userInfo.lastInsertRowid
  });

  // Send welcome email (non-blocking)
  const customerEmail = email || hp;
  if (customerEmail) {
    const mail = userRegisteredTemplate({ username, email: customerEmail, role: 'customer' });
    sendMail(mail).catch(err => console.error('Failed to send welcome email:', err));
  }
}

// Customer login (same endpoint as admin/user, but returns customer data)
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

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
