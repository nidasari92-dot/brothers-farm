const bcrypt = require('bcryptjs');
const { db } = require('./database');

const TEST_USERNAME = 'testcustomer';
const TEST_PASSWORD = 'testpass123';
const TEST_NAME = 'Test Customer';
const TEST_EMAIL = 'testcustomer@example.com';
const TEST_PHONE = '081234567890';

const SALT_ROUNDS = 10;
const hash = bcrypt.hashSync(TEST_PASSWORD, SALT_ROUNDS);

try {
  // Start transaction
  db.prepare('BEGIN TRANSACTION').run();

  // Remove existing test customer
  const oldUser = db.prepare('SELECT id FROM users WHERE username = ?').get(TEST_USERNAME);
  if (oldUser) {
    const oldCustomer = db.prepare('SELECT id FROM customer WHERE id = ?').get(oldUser.customerId);
    if (oldCustomer) {
      db.prepare('DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE customerId = ?)').run(oldCustomer.id);
      db.prepare('DELETE FROM orders WHERE customerId = ?').run(oldCustomer.id);
      db.prepare('DELETE FROM customer WHERE id = ?').run(oldCustomer.id);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(oldUser.id);
  }

  // Create customer
  const custInfo = db.prepare(`
    INSERT INTO customer (nama, hp, email, alamat, status)
    VALUES (?, ?, ?, ?, 'Aktif')
  `).run(TEST_NAME, TEST_PHONE, TEST_EMAIL, 'Alamat test customer');

  // Create user with role customer
  const userInfo = db.prepare(`
    INSERT INTO users (username, password, nama, role, customerId, status)
    VALUES (?, ?, ?, 'customer', ?, 'Aktif')
  `).run(TEST_USERNAME, hash, TEST_NAME, custInfo.lastInsertRowid);

  // Ensure we have at least one active product and price for pagination tests
  const productCount = db.prepare("SELECT COUNT(*) as cnt FROM produk WHERE status = 'Aktif'").get().cnt;
  if (productCount === 0) {
    const sup = db.prepare('INSERT INTO supplier (nama, alamat, telepon, status) VALUES (?, ?, ?, ?)').run('Supplier Test', 'Alamat', '0812345678', 'Aktif');
    const prod1 = db.prepare('INSERT INTO produk (kode, nama, kategori, satuan, hargaJualTerakhir, supplierId, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run('P001', 'Produk Test 1', 'Kategori A', 'Pcs', 1000, sup.lastInsertRowid, 'Aktif');
    const prod2 = db.prepare('INSERT INTO produk (kode, nama, kategori, satuan, hargaJualTerakhir, supplierId, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run('P002', 'Produk Test 2', 'Kategori B', 'Pcs', 2000, sup.lastInsertRowid, 'Aktif');
  }

  // Ensure we have at least one invoice for PDF generation tests
  const invoiceCount = db.prepare('SELECT COUNT(*) as cnt FROM invoice').get().cnt;
  if (invoiceCount === 0) {
    // Create a minimal invoice row
    db.prepare(`
      INSERT INTO invoice (noInvoice, tanggal, jenis, refId, total, logo, caption, createdBy)
      VALUES (?, ?, 'customer', 1, 0, NULL, NULL, ?)
    `).run('INV-TEST-0001', new Date().toISOString().slice(0, 10), userInfo.lastInsertRowid);
  }

  db.prepare('COMMIT').run();

  console.log('Seed completed successfully');
  console.log('- customerId:', custInfo.lastInsertRowid);
  console.log('- userId:', userInfo.lastInsertRowid);
  console.log('- username:', TEST_USERNAME);
  console.log('- password:', TEST_PASSWORD);
} catch (err) {
  try { db.prepare('ROLLBACK').run(); } catch {}
  console.error('Seed failed:', err);
  process.exit(1);
}
