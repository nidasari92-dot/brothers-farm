const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './data/brothersfarm.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin','user')) DEFAULT 'user',
    salesId INTEGER,
    supplierId INTEGER,
    status TEXT DEFAULT 'Aktif',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    hp TEXT,
    rekening TEXT,
    status TEXT DEFAULT 'Aktif',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    rekening TEXT,
    hp TEXT,
    totalUtang REAL DEFAULT 0,
    totalBayar REAL DEFAULT 0,
    status TEXT DEFAULT 'Aktif',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS produk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE,
    kategori TEXT,
    nama TEXT NOT NULL,
    satuan TEXT,
    supplierId INTEGER REFERENCES supplier(id),
    insentif REAL DEFAULT 0,
    hargaBeliTerakhir REAL DEFAULT 0,
    hargaJualTerakhir REAL DEFAULT 0,
    status TEXT DEFAULT 'Aktif',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE,
    nama TEXT NOT NULL,
    jenis TEXT,
    alamat TEXT,
    hp TEXT,
    salesId INTEGER REFERENCES sales(id),
    saldoAwal REAL DEFAULT 0,
    status TEXT DEFAULT 'Aktif',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS harga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    produkId INTEGER NOT NULL REFERENCES produk(id),
    hargaBeli REAL DEFAULT 0,
    hargaJual REAL DEFAULT 0,
    sumber TEXT DEFAULT 'manual',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    produkId INTEGER NOT NULL REFERENCES produk(id),
    hargaBeli REAL DEFAULT 0,
    hargaJual REAL DEFAULT 0,
    sumber TEXT DEFAULT 'manual',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_unique ON price_history(tanggal, produkId);

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    noOrder TEXT UNIQUE NOT NULL,
    tanggal TEXT NOT NULL,
    customerId INTEGER REFERENCES customer(id),
    salesId INTEGER REFERENCES sales(id),
    metodeBayar TEXT DEFAULT 'Tempo',
    jatuhTempo TEXT,
    total REAL DEFAULT 0,
    totalInsentif REAL DEFAULT 0,
    status TEXT DEFAULT 'Belum Lunas',
    keterangan TEXT,
    createdBy INTEGER,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    produkId INTEGER NOT NULL REFERENCES produk(id),
    qty REAL NOT NULL,
    satuan TEXT,
    hargaJual REAL NOT NULL,
    hargaBeli REAL DEFAULT 0,
    insentifPerUnit REAL DEFAULT 0,
    subtotal REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pembayaran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    noPembayaran TEXT UNIQUE NOT NULL,
    tanggal TEXT NOT NULL,
    customerId INTEGER REFERENCES customer(id),
    supplierId INTEGER REFERENCES supplier(id),
    salesId INTEGER REFERENCES sales(id),
    jumlahBayar REAL NOT NULL,
    jenis TEXT NOT NULL CHECK(jenis IN ('penerimaan_customer','pengeluaran_supplier','pembayaran_bonus')),
    keterangan TEXT,
    createdBy INTEGER,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    noInvoice TEXT UNIQUE NOT NULL,
    tanggal TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK(jenis IN ('supplier','customer','bonus')),
    refId INTEGER NOT NULL,
    total REAL DEFAULT 0,
    logo TEXT,
    caption TEXT,
    createdBy INTEGER,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_harga_produk ON harga(produkId, tanggal);
  CREATE INDEX IF NOT EXISTS idx_orders_sales ON orders(salesId);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customerId);
  CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(orderId);
  CREATE INDEX IF NOT EXISTS idx_pembayaran_sales ON pembayaran(salesId, jenis);
  `);

  // default settings (nama perusahaan, logo, dsb)
  const settingCount = db.prepare('SELECT COUNT(*) c FROM settings').get().c;
  if (settingCount === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('nama_perusahaan', 'CV Brothers Farm');
    insertSetting.run('logo', '/images/logo.png');
  }
}

module.exports = { db, init };
