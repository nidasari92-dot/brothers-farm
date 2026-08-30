require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, init } = require('./database');

init();

const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (!existing) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (username, password, nama, role, status) VALUES (?, ?, ?, 'admin', 'Aktif')`)
    .run(username, hash, 'Administrator');
  console.log(`Akun admin dibuat -> username: ${username} / password: ${password}`);
  console.log('PENTING: segera ganti password ini setelah login pertama kali.');
} else {
  console.log('Akun admin sudah ada, seed dilewati.');
}
