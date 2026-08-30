const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const { formatRupiah } = require('../utils/format');

const csvPath = path.join(__dirname, '..', 'data', 'price_list_japfa_magelang_31jul_6ags.csv');

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  });
}

function loadPriceList() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const rows = parseCsv(csvPath);
  console.log(`Loaded ${rows.length} products from CSV\n`);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  rows.forEach(row => {
    const existing = db.prepare('SELECT id, nama, hargaJualTerakhir FROM produk WHERE kode = ?').get(row.kode);
    
    if (existing) {
      // Update existing product
      db.prepare('UPDATE produk SET hargaJualTerakhir = ? WHERE id = ?').run(row.harga_baru, existing.id);
      console.log(`✅ Updated ${row.kode}: ${row.nama} - ${formatRupiah(row.harga_baru)} (was ${formatRupiah(existing.hargaJualTerakhir)})`);
      updated++;
    } else {
      // Insert new product
      try {
        const info = db.prepare(`
          INSERT INTO produk (kode, nama, kategori, satuan, hargaBeliTerakhir, hargaJualTerakhir, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          row.kode,
          row.nama,
          row.kategori || 'Lainnya',
          row.satuan || 'kg',
          0,
          row.harga_baru,
          row.status || 'Aktif'
        );
        console.log(`✅ Inserted ${row.kode}: ${row.nama} - ${formatRupiah(row.harga_baru)} (new id: ${info.lastInsertRowid})`);
        inserted++;
      } catch (err) {
        console.log(`⚠️  Skipped ${row.kode}: ${err.message}`);
        skipped++;
      }
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total processed: ${rows.length}`);

  return { updated, inserted, skipped, total: rows.length };
}

// Run if called directly
if (require.main === module) {
  try {
    const result = loadPriceList();
    if (result.skipped > 0 || result.total === 0) {
      process.exit(1);
    }
    console.log('\n🎉 Price list loaded successfully!');
  } catch (err) {
    console.error('❌ Failed to load price list:', err.message);
    process.exit(1);
  }
}

module.exports = { loadPriceList };
