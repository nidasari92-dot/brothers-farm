const { db } = require('../config/database');
const { formatRupiah } = require('../utils/format');

function ensureDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  return date;
}

function seedMissingHistory(tanggal) {
  const products = db.prepare("SELECT id, hargaBeliTerakhir, hargaJualTerakhir FROM produk WHERE status = 'Aktif'").all();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO price_history (tanggal, produkId, hargaBeli, hargaJual, sumber)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const p of products) {
    insert.run(tanggal, p.id, p.hargaBeliTerakhir || 0, p.hargaJualTerakhir || 0, 'auto-seed');
  }
}

function getHistoryByDate(tanggal) {
  const date = ensureDate(tanggal);
  seedMissingHistory(date);
  return db.prepare(`
    SELECT ph.tanggal, ph.produkId, p.kode, p.nama, p.satuan, ph.hargaBeli, ph.hargaJual
    FROM price_history ph
    JOIN produk p ON p.id = ph.produkId
    WHERE ph.tanggal = ?
    ORDER BY p.nama ASC
  `).all(date);
}

function getHistoryRange(start, end) {
  const s = ensureDate(start);
  const e = ensureDate(end);
  return db.prepare(`
    SELECT ph.tanggal, ph.produkId, p.kode, p.nama, p.satuan, ph.hargaBeli, ph.hargaJual
    FROM price_history ph
    JOIN produk p ON p.id = ph.produkId
    WHERE ph.tanggal BETWEEN ? AND ?
    ORDER BY p.nama ASC, ph.tanggal ASC
  `).all(s, e);
}

function getProductHistory(produkId, limit = 30) {
  return db.prepare(`
    SELECT tanggal, hargaBeli, hargaJual, sumber
    FROM price_history
    WHERE produkId = ?
    ORDER BY tanggal DESC
    LIMIT ?
  `).all(produkId, limit);
}

function upsertHistory(tanggal, produkId, hargaBeli, hargaJual, sumber = 'manual') {
  const date = ensureDate(tanggal);
  db.prepare(`
    INSERT INTO price_history (tanggal, produkId, hargaBeli, hargaJual, sumber)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tanggal, produkId) DO UPDATE SET
      hargaBeli = excluded.hargaBeli,
      hargaJual = excluded.hargaJual,
      sumber = excluded.sumber
  `).run(date, produkId, hargaBeli, hargaJual, sumber);
}

function getCompare(start, end) {
  const s = ensureDate(start);
  const e = ensureDate(end);
  return db.prepare(`
    WITH start_data AS (
      SELECT produkId, hargaJual AS hargaAwal FROM price_history WHERE tanggal = ?
    ),
    end_data AS (
      SELECT produkId, hargaJual AS hargaAkhir FROM price_history WHERE tanggal = ?
    )
    SELECT 
      p.id AS produkId,
      p.kode,
      p.nama,
      p.satuan,
      COALESCE(sd.hargaAwal, p.hargaJualTerakhir) AS hargaAwal,
      COALESCE(ed.hargaAkhir, p.hargaJualTerakhir) AS hargaAkhir,
      ROUND(COALESCE(ed.hargaAkhir, p.hargaJualTerakhir) - COALESCE(sd.hargaAwal, p.hargaJualTerakhir), 0) AS selisih
    FROM produk p
    LEFT JOIN start_data sd ON sd.produkId = p.id
    LEFT JOIN end_data ed ON ed.produkId = p.id
    WHERE p.status = 'Aktif'
    ORDER BY p.nama ASC
  `).all(s, e);
}

async function getOrCreateTodayPrice(produkId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT * FROM price_history WHERE tanggal = ? AND produkId = ?').get(today, produkId);
  if (existing) return existing;

  const product = db.prepare('SELECT hargaBeliTerakhir, hargaJualTerakhir FROM produk WHERE id = ?').get(produkId);
  if (!product) return null;

  db.prepare(`
    INSERT INTO price_history (tanggal, produkId, hargaBeli, hargaJual, sumber)
    VALUES (?, ?, ?, ?, ?)
  `).run(today, produkId, product.hargaBeliTerakhir || 0, product.hargaJualTerakhir || 0, 'auto-daily');
  return db.prepare('SELECT * FROM price_history WHERE tanggal = ? AND produkId = ?').get(today, produkId);
}

module.exports = {
  ensureDate,
  seedMissingHistory,
  getHistoryByDate,
  getHistoryRange,
  getProductHistory,
  upsertHistory,
  getCompare,
  getOrCreateTodayPrice
};
