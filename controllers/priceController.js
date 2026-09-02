const ExcelJS = require('exceljs');
const fs = require('fs');
const { db } = require('../config/database');

function list(req, res) {
  const { produkId } = req.query;
  let rows;
  if (produkId) {
    rows = db.prepare(`
      SELECT h.*, p.nama AS produkNama FROM harga h JOIN produk p ON p.id = h.produkId
      WHERE h.produkId = ? ORDER BY h.tanggal DESC
    `).all(produkId);
  } else {
    rows = db.prepare(`
      SELECT h.*, p.nama AS produkNama FROM harga h JOIN produk p ON p.id = h.produkId
      ORDER BY h.tanggal DESC LIMIT 200
    `).all();
  }
  res.json(rows);
}

// Input manual satu harga (juga dipakai oleh alur agentic AI setelah ekstraksi gambar)
const insertHarga = db.transaction((tanggal, produkId, hargaBeli, hargaJual, sumber) => {
  db.prepare('INSERT INTO harga (tanggal, produkId, hargaBeli, hargaJual, sumber) VALUES (?, ?, ?, ?, ?)')
    .run(tanggal, produkId, hargaBeli, hargaJual, sumber);
  db.prepare('UPDATE produk SET hargaBeliTerakhir = ?, hargaJualTerakhir = ? WHERE id = ?')
    .run(hargaBeli, hargaJual, produkId);
  db.prepare(`
    INSERT INTO price_history (tanggal, produkId, hargaBeli, hargaJual, sumber)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tanggal, produkId) DO UPDATE SET
      hargaBeli = excluded.hargaBeli,
      hargaJual = excluded.hargaJual,
      sumber = excluded.sumber
  `).run(tanggal, produkId, hargaBeli, hargaJual, sumber);
});

function create(req, res) {
  const { tanggal, produkId, hargaBeli, hargaJual } = req.body;
  if (!tanggal || !produkId) return res.status(400).json({ error: 'tanggal dan produkId wajib diisi.' });
  insertHarga(tanggal, produkId, hargaBeli || 0, hargaJual || 0, 'manual');
  res.status(201).json({ message: 'Harga tersimpan.' });
}

function update(req, res) {
  const { tanggal, produkId, hargaBeli, hargaJual } = req.body;
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM harga WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Data harga tidak ditemukan.' });
  db.prepare('UPDATE harga SET tanggal = ?, produkId = ?, hargaBeli = ?, hargaJual = ? WHERE id = ?')
    .run(tanggal || row.tanggal, produkId || row.produkId, hargaBeli != null ? hargaBeli : row.hargaBeli, hargaJual != null ? hargaJual : row.hargaJual, id);
  db.prepare('UPDATE produk SET hargaBeliTerakhir = ?, hargaJualTerakhir = ? WHERE id = ?')
    .run(hargaBeli != null ? hargaBeli : row.hargaBeli, hargaJual != null ? hargaJual : row.hargaJual, produkId || row.produkId);
  res.json({ message: 'Harga diperbarui.' });
}

function remove(req, res) {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM harga WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Data harga tidak ditemukan.' });
  db.prepare('DELETE FROM harga WHERE id = ?').run(id);
  res.json({ message: 'Data harga dihapus.' });
}

// Upload Excel: kolom yang diharapkan -> kode_produk | harga_beli | harga_jual
// Baris pertama dianggap header.
async function uploadExcel(req, res) {
  if (!req.file) return res.status(400).json({ error: 'File Excel wajib diunggah.' });

  const tanggal = req.body.tanggal || new Date().toISOString().slice(0, 10);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];

    const hasil = { berhasil: 0, gagal: [] };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const kode = String(row.getCell(1).value || '').trim();
      const hargaBeli = Number(row.getCell(2).value) || 0;
      const hargaJual = Number(row.getCell(3).value) || 0;

      if (!kode) return;

      const produk = db.prepare('SELECT id FROM produk WHERE kode = ?').get(kode);
      if (!produk) {
        hasil.gagal.push({ baris: rowNumber, kode, alasan: 'Kode produk tidak ditemukan' });
        return;
      }

      insertHarga(tanggal, produk.id, hargaBeli, hargaJual, 'excel_upload');
      hasil.berhasil += 1;
    });

    fs.unlink(req.file.path, () => {});
    res.json({ message: 'Upload selesai.', ...hasil });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: 'Gagal membaca file Excel: ' + err.message });
  }
}

module.exports = { list, create, update, remove, uploadExcel };
