const { db } = require('../../config/database');

const rows = db.prepare(`
  SELECT id, keterangan
  FROM pembayaran
  WHERE keterangan LIKE '{%' AND keterangan LIKE '%}%'
`).all();

let updated = 0;
for (const row of rows) {
  try {
    const obj = JSON.parse(row.keterangan);
    let formatted = null;
    if (obj.orderNo && obj.customerName) {
      formatted = `Order: ${obj.orderNo}, Customer: ${obj.customerName}`;
    } else if (typeof obj === 'object' && obj !== null) {
      const values = Object.values(obj)
        .map(v => String(v))
        .filter(Boolean);
      formatted = values.length ? values.join(', ') : null;
    }
    if (formatted !== row.keterangan) {
      db.prepare('UPDATE pembayaran SET keterangan = ? WHERE id = ?').run(formatted, row.id);
      updated++;
    }
  } catch {
    db.prepare('UPDATE pembayaran SET keterangan = NULL WHERE id = ?').run(row.id);
    updated++;
  }
}

console.log(`Migration 001_clean_pembayaran_keterangan: updated ${updated} row(s).`);
