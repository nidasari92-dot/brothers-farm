const { db } = require('../config/database');

// Ringkasan finansial - hanya untuk Admin (dibatasi lewat middleware blockSensitiveFinancial)
function summary(req, res) {
  const totalPenjualan = db.prepare('SELECT COALESCE(SUM(total),0) t FROM orders').get().t;
  const totalPiutang = db.prepare(`
    SELECT COALESCE(SUM(o.total),0) - COALESCE((SELECT SUM(jumlahBayar) FROM pembayaran WHERE jenis='penerimaan_customer'),0) t
    FROM orders o
  `).get().t;
  const totalUtangSupplier = db.prepare('SELECT COALESCE(SUM(totalUtang - totalBayar),0) t FROM supplier').get().t;
  const totalBonusOutstanding = db.prepare(`
    SELECT
      COALESCE((SELECT SUM(oi.qty * oi.insentifPerUnit) FROM order_items oi),0) -
      COALESCE((SELECT SUM(jumlahBayar) FROM pembayaran WHERE jenis='pembayaran_bonus'),0) t
  `).get().t;

  const jumlahCustomer = db.prepare("SELECT COUNT(*) c FROM customer WHERE status='Aktif'").get().c;
  const jumlahSales = db.prepare("SELECT COUNT(*) c FROM sales WHERE status='Aktif'").get().c;
  const jumlahSupplier = db.prepare("SELECT COUNT(*) c FROM supplier WHERE status='Aktif'").get().c;
  const jumlahProduk = db.prepare("SELECT COUNT(*) c FROM produk WHERE status='Aktif'").get().c;

  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10) || 20);
  const offset = (page - 1) * limit;

  const orderTerbaru = db.prepare(`
    SELECT o.id, o.noOrder, o.tanggal, o.total, c.nama AS customerNama
    FROM orders o LEFT JOIN customer c ON c.id = o.customerId
    ORDER BY o.id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    totalPenjualan,
    totalPiutang,
    totalUtangSupplier,
    totalBonusOutstanding,
    jumlahCustomer,
    jumlahSales,
    jumlahSupplier,
    jumlahProduk,
    orderTerbaru,
    orderPagination: {
      page,
      limit,
      hasNext: orderTerbaru.length === limit
    }
  });
}

function getSettings(req, res) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
}

function updateSettings(req, res) {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const tx = db.transaction((body) => {
    for (const [key, value] of Object.entries(body)) {
      upsert.run(key, String(value));
    }
  });
  tx(req.body);
  res.json({ message: 'Pengaturan diperbarui.' });
}

module.exports = { summary, getSettings, updateSettings };
