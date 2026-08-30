const { db } = require('../config/database');

function generateNoPembayaran(jenis) {
  const prefix = jenis === 'penerimaan_customer' ? 'RCV' : jenis === 'pengeluaran_supplier' ? 'PAY' : 'BNS';
  const row = db.prepare('SELECT id FROM pembayaran ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${String(next).padStart(4, '0')}`;
}

function generateNoInvoice(jenis) {
  const prefix = jenis === 'customer' ? 'INV-C' : jenis === 'supplier' ? 'INV-S' : 'INV-B';
  const row = db.prepare('SELECT id FROM invoice ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${String(next).padStart(4, '0')}`;
}

function list(req, res) {
  const rows = db.prepare(`
    SELECT pb.*, c.nama AS customerNama, s.nama AS supplierNama, sl.nama AS salesNama
    FROM pembayaran pb
    LEFT JOIN customer c ON c.id = pb.customerId
    LEFT JOIN supplier s ON s.id = pb.supplierId
    LEFT JOIN sales sl ON sl.id = pb.salesId
    ORDER BY pb.id DESC
  `).all();
  res.json(rows);
}

// Mencatat pembayaran; jika jenis pengeluaran_supplier -> update totalBayar supplier.
// Jika jenis pembayaran_bonus -> mengurangi sisa bonus (dicek agar tidak melebihi sisa bonus)
// dan otomatis membuat Invoice Bonus ke Sales.
const createPayment = db.transaction((payload, userId) => {
  const { tanggal, customerId, supplierId, salesId, jumlahBayar, jenis, keterangan } = payload;
  const noPembayaran = generateNoPembayaran(jenis);
  const jumlah = Number(jumlahBayar);

  if (jenis === 'pembayaran_bonus') {
    if (!salesId) throw new Error('salesId wajib diisi untuk pembayaran bonus.');

    const totalBonusRow = db.prepare(`
      SELECT COALESCE(SUM(oi.qty * oi.insentifPerUnit), 0) AS total
      FROM order_items oi JOIN orders o ON o.id = oi.orderId
      WHERE o.salesId = ?
    `).get(salesId);
    const totalDibayarRow = db.prepare(`
      SELECT COALESCE(SUM(jumlahBayar), 0) AS total FROM pembayaran
      WHERE salesId = ? AND jenis = 'pembayaran_bonus'
    `).get(salesId);
    const sisaBonus = totalBonusRow.total - totalDibayarRow.total;

    if (jumlah > sisaBonus + 0.0001) {
      throw new Error(`Jumlah pembayaran (${jumlah}) melebihi sisa bonus (${sisaBonus}).`);
    }
  }

  const info = db.prepare(`
    INSERT INTO pembayaran (noPembayaran, tanggal, customerId, supplierId, salesId, jumlahBayar, jenis, keterangan, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noPembayaran, tanggal, customerId || null, supplierId || null, salesId || null, jumlah, jenis, keterangan || null, userId);

  const pembayaranId = info.lastInsertRowid;

  if (jenis === 'pengeluaran_supplier' && supplierId) {
    db.prepare('UPDATE supplier SET totalBayar = totalBayar + ? WHERE id = ?').run(jumlah, supplierId);
  }

  let invoiceId = null;
  if (jenis === 'pembayaran_bonus') {
    const noInvoice = generateNoInvoice('bonus');
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const invInfo = db.prepare(`
      INSERT INTO invoice (noInvoice, tanggal, jenis, refId, total, logo, caption, createdBy)
      VALUES (?, ?, 'bonus', ?, ?, ?, ?, ?)
    `).run(noInvoice, tanggal, pembayaranId, jumlah, map.logo || null, `Pembayaran bonus sales - ${keterangan || ''}`, userId);
    invoiceId = invInfo.lastInsertRowid;
  }

  return { pembayaranId, noPembayaran, invoiceId };
});

function create(req, res) {
  const { tanggal, jumlahBayar, jenis } = req.body;
  if (!tanggal || !jumlahBayar || !jenis) {
    return res.status(400).json({ error: 'tanggal, jumlahBayar, dan jenis wajib diisi.' });
  }
  try {
    const result = createPayment(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal mencatat pembayaran.' });
  }
}

module.exports = { list, create };
