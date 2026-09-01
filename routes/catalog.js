const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/products', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10) || 20);
  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT id, kode, nama, kategori, satuan, hargaJualTerakhir, status
    FROM produk
    WHERE status = 'Aktif' AND hargaJualTerakhir IS NOT NULL
    ORDER BY kategori, nama
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ data: rows, pagination: { page, limit, hasNext: rows.length === limit } });
});

router.get('/prices/latest', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10) || 20);
  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT p.id, p.kode, p.nama, p.hargaJualTerakhir, p.supplierId,
           s.nama as supplierNama
    FROM produk p
    LEFT JOIN supplier s ON s.id = p.supplierId
    WHERE p.status = 'Aktif'
    ORDER BY p.kategori, p.nama
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ data: rows, pagination: { page, limit, hasNext: rows.length === limit } });
});

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { sendMail } = require('../services/emailService');
const { authenticate, adminOnly } = require('../middleware/auth');
const { formatRupiah } = require('../utils/format');

router.use(authenticate);
router.get('/recipients', (req, res) => {
  const custCols = db.prepare("PRAGMA table_info(customer)").all().map(c => c.name);
  const custEmail = custCols.includes('email') ? 'email' : custCols.includes('hp') ? 'hp' : 'NULL';
  const customers = db.prepare(`SELECT id, nama, ${custEmail} AS email FROM customer WHERE status = 'Aktif' AND (${custEmail} IS NOT NULL AND ${custEmail} != '')`).all();

  const salesCols = db.prepare("PRAGMA table_info(sales)").all().map(c => c.name);
  const salesEmail = salesCols.includes('email') ? 'email' : salesCols.includes('hp') ? 'hp' : 'NULL';
  const sales = db.prepare(`SELECT id, nama, ${salesEmail} AS email FROM sales WHERE status = 'Aktif' AND (${salesEmail} IS NOT NULL AND ${salesEmail} != '')`).all();

  const suppCols = db.prepare("PRAGMA table_info(supplier)").all().map(c => c.name);
  const suppEmail = suppCols.includes('email') ? 'email' : suppCols.includes('hp') ? 'hp' : 'NULL';
  const suppliers = db.prepare(`SELECT id, nama, ${suppEmail} AS email FROM supplier WHERE status = 'Aktif' AND (${suppEmail} IS NOT NULL AND ${suppEmail} != '')`).all();

  res.json({ customers, sales, suppliers });
});
router.post('/generate', adminOnly, async (req, res) => {
  try {
    const result = await generateCatalogPdf();
    res.json({ ok: true, file: result.fileName, productCount: result.productCount });
  } catch (err) {
    res.status(500).json({ error: 'Gagal generate katalog: ' + err.message });
  }
});
router.post('/blast', adminOnly, async (req, res) => {
  try {
    const { emails, subject, message } = req.body;
    if (!emails || !emails.length) return res.status(400).json({ error: 'Pilih minimal satu penerima.' });

    const result = await generateCatalogPdf();
    const pdfBuffer = fs.readFileSync(result.filePath);
    const attachments = [{ filename: result.fileName, content: pdfBuffer }];

    const html = `${message || 'Berikut katalog harga kami.'}<br><br><em>CV Brothers Farm</em>`;
    const text = `${message || 'Berikut katalog harga kami.'}\n\nCV Brothers Farm`;

    const blastResults = await sendCatalogBlast({
      recipients: emails,
      subject: subject || 'Katalog Harga CV Brothers Farm',
      html,
      text,
      attachments,
    });

    res.json({ ok: true, file: result.fileName, results: blastResults });
  } catch (err) {
    res.status(500).json({ error: 'Gagal blast katalog: ' + err.message });
  }
});

function generateCatalogPdf() {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  const products = db.prepare('SELECT * FROM produk WHERE status = ? OR status IS NULL ORDER BY nama ASC').all('Aktif');
  const now = new Date();
  const tanggal = now.toISOString().slice(0, 10);

  const outDir = path.join(__dirname, '..', 'invoices_output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const fileName = `KATALOG-${tanggal.replace(/-/g, '')}.pdf`;
  const filePath = path.join(outDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tableX = 50;
  const colNo = 40;
  const colProduk = pageWidth - colNo - 100 - 80;

  // Header / Kop
  const logoSettings = map.logo || '';
  const logoPath = logoSettings.startsWith('http') ? null : path.join(__dirname, '..', 'public', logoSettings.replace(/^\//, ''));
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 50, { height: 60 });
  }
  doc.fontSize(20).font('Helvetica-Bold').text(map.nama_perusahaan || 'CV Brothers Farm', { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor('gray');
  if (map.alamat) doc.text(map.alamat, { align: 'center' });
  if (map.telepon) doc.text(`Telp: ${map.telepon}${map.email ? ' | Email: ' + map.email : ''}`, { align: 'center' });
  if (map.npwp) doc.text(`NPWP: ${map.npwp}`, { align: 'center' });
  if (map.website) doc.text(map.website, { align: 'center' });
  doc.moveDown(0.5);

  // Garis pemisah kop
  doc.moveTo(tableX, doc.y).lineTo(tableX + pageWidth, doc.y).strokeColor('black').lineWidth(1).stroke();
  doc.moveDown(1);

  // Judul
  doc.fillColor('black');
  doc.font('Helvetica-Bold').fontSize(16).text('KATALOG HARGA', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).text(`Periode: ${tanggal}`, { align: 'center' });
  doc.moveDown(1);

  // Tabel
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('No', tableX, headerY, { width: colNo, align: 'center' });
  doc.text('Produk', tableX + colNo, headerY, { width: colProduk });
  doc.text('Harga', tableX + colNo + colProduk, headerY, { width: 100, align: 'right' });
  doc.text('Satuan', tableX + colNo + colProduk + 100, headerY, { width: 80, align: 'center' });

  const headerHeight = 20;
  const headerBottom = headerY + headerHeight;
  doc.moveTo(tableX, headerBottom).lineTo(tableX + pageWidth, headerBottom).strokeColor('black').lineWidth(1).stroke();

  // Vertikal header
  doc.moveTo(tableX, headerY).lineTo(tableX, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colNo, headerY).lineTo(tableX + colNo, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colNo + colProduk, headerY).lineTo(tableX + colNo + colProduk, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colNo + colProduk + 100, headerY).lineTo(tableX + colNo + colProduk + 100, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + pageWidth, headerY).lineTo(tableX + pageWidth, headerBottom).strokeColor('black').lineWidth(1).stroke();

  // Isi tabel
  let currentY = headerBottom;
  products.forEach((p, idx) => {
    doc.font('Helvetica').fontSize(10);
    const hargaText = formatRupiah(p.hargaJualTerakhir || 0);
    const noText = String(idx + 1);

    doc.text(noText, tableX, currentY, { width: colNo, align: 'center' });
    doc.text(p.nama || '', tableX + colNo, currentY, { width: colProduk });
    const hargaWidth = doc.widthOfString(hargaText);
    doc.text(hargaText, tableX + colNo + colProduk + 100 - hargaWidth, currentY);
    doc.text(p.satuan || '', tableX + colNo + colProduk + 100, currentY, { width: 80, align: 'center' });

    const rowBottom = currentY + 18;
    doc.moveTo(tableX, rowBottom).lineTo(tableX + pageWidth, rowBottom).strokeColor('#999').lineWidth(0.5).stroke();

    // Vertikal data
    doc.moveTo(tableX, currentY).lineTo(tableX, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colNo, currentY).lineTo(tableX + colNo, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colNo + colProduk, currentY).lineTo(tableX + colNo + colProduk, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colNo + colProduk + 100, currentY).lineTo(tableX + colNo + colProduk + 100, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + pageWidth, currentY).lineTo(tableX + pageWidth, rowBottom).strokeColor('black').lineWidth(1).stroke();

    currentY = rowBottom;
  });

  doc.moveDown(1);
  doc.font('Helvetica').fontSize(9).fillColor('gray').text('Dokumen ini dibuat otomatis oleh sistem CV Brothers Farm.', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ filePath, fileName, productCount: products.length }));
    stream.on('error', reject);
  });
}

async function sendCatalogBlast({ recipients, subject, html, text, attachments }) {
  const results = [];
  for (const email of recipients) {
    try {
      const res = await sendMail({ to: email, subject, html, text, attachments });
      results.push({ email, status: 'sent', messageId: res.messageId || null });
    } catch (err) {
      results.push({ email, status: 'failed', error: err.message });
    }
  }
  return results;
}

module.exports = router;
