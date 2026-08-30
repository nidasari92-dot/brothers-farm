const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require('../config/database');
const { formatRupiah } = require('../utils/format');

function generateNoInvoice(jenis) {
  const prefix = jenis === 'customer' ? 'INV-C' : jenis === 'supplier' ? 'INV-S' : 'INV-B';
  const row = db.prepare('SELECT id FROM invoice ORDER BY id DESC LIMIT 1').get();
  const next = row ? row.id + 1 : 1;
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${String(next).padStart(4, '0')}`;
}

function list(req, res) {
  res.json(db.prepare('SELECT * FROM invoice ORDER BY id DESC').all());
}

function get(req, res) {
  const row = db.prepare('SELECT * FROM invoice WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
  res.json(row);
}

function getPreview(req, res) {
  const invoice = db.prepare('SELECT * FROM invoice WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });

  const settings = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  let items = [];
  let pihakNama = '-';

  if (invoice.jenis === 'customer') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(invoice.refId);
    const customer = order ? db.prepare('SELECT * FROM customer WHERE id = ?').get(order.customerId) : null;
    pihakNama = customer ? customer.nama : '-';
    items = order ? db.prepare(`
      SELECT oi.*, p.nama AS produkNama FROM order_items oi JOIN produk p ON p.id = oi.produkId WHERE oi.orderId = ?
    `).all(order.id) : [];
  } else if (invoice.jenis === 'bonus') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const sales = pembayaran ? db.prepare('SELECT * FROM sales WHERE id = ?').get(pembayaran.salesId) : null;
    pihakNama = sales ? sales.nama : '-';
  } else if (invoice.jenis === 'supplier') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const supplier = pembayaran ? db.prepare('SELECT * FROM supplier WHERE id = ?').get(pembayaran.supplierId) : null;
    pihakNama = supplier ? supplier.nama : '-';
  }

  res.json({ invoice, items, pihakNama, map });
}

// Membuat invoice manual untuk jenis 'customer' atau 'supplier', mengacu ke order/pembayaran yang sudah ada
function create(req, res) {
  const { tanggal, jenis, refId, total, caption } = req.body;
  if (!tanggal || !jenis || !refId) {
    return res.status(400).json({ error: 'tanggal, jenis, dan refId wajib diisi.' });
  }
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const noInvoice = generateNoInvoice(jenis);
  const info = db.prepare(`
    INSERT INTO invoice (noInvoice, tanggal, jenis, refId, total, logo, caption, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noInvoice, tanggal, jenis, refId, total || 0, map.logo || null, caption || null, req.user.id);
  res.status(201).json({ id: info.lastInsertRowid, noInvoice });
}

// Admin mengedit kop logo dan caption invoice
function update(req, res) {
  const { logo, caption } = req.body;
  const existing = db.prepare('SELECT id FROM invoice WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });
  db.prepare('UPDATE invoice SET logo = ?, caption = ? WHERE id = ?').run(logo || null, caption || null, req.params.id);
  res.json({ message: 'Invoice diperbarui.' });
}

function generatePdf(req, res) {
  const invoice = db.prepare('SELECT * FROM invoice WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });

  const settings = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  let items = [];
  let pihakNama = '-';

  if (invoice.jenis === 'customer') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(invoice.refId);
    const customer = order ? db.prepare('SELECT * FROM customer WHERE id = ?').get(order.customerId) : null;
    pihakNama = customer ? customer.nama : '-';
    items = order ? db.prepare(`
      SELECT oi.*, p.nama AS produkNama FROM order_items oi JOIN produk p ON p.id = oi.produkId WHERE oi.orderId = ?
    `).all(order.id) : [];
  } else if (invoice.jenis === 'bonus') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const sales = pembayaran ? db.prepare('SELECT * FROM sales WHERE id = ?').get(pembayaran.salesId) : null;
    pihakNama = sales ? sales.nama : '-';
  } else if (invoice.jenis === 'supplier') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const supplier = pembayaran ? db.prepare('SELECT * FROM supplier WHERE id = ?').get(pembayaran.supplierId) : null;
    pihakNama = supplier ? supplier.nama : '-';
  }

  const outDir = path.join(__dirname, '..', 'invoices_output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${invoice.noInvoice}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colProduk = 230;
  const colQty = 60;
  const colHarga = 100;
  const colSubtotal = pageWidth - colProduk - colQty - colHarga;
  const tableX = 50;

  // Kop
  const logoSettings = map.logo || '';
  const logoPath = logoSettings.startsWith('http') ? null : path.join(__dirname, '..', 'public', logoSettings.replace(/^\//, ''));
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 50, { height: 60 });
  }
  doc.fontSize(18).font('Helvetica-Bold').text(map.nama_perusahaan || 'CV Brothers Farm', { align: 'left' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('gray');
  if (map.alamat) doc.text(map.alamat, { align: 'left' });
  if (map.telepon) doc.text(`Telp: ${map.telepon}${map.email ? ' | Email: ' + map.email : ''}`, { align: 'left' });
  if (map.npwp) doc.text(`NPWP: ${map.npwp}`, { align: 'left' });
  if (map.website) doc.text(map.website, { align: 'left' });
  if (map.bank && map.no_rekening) doc.text(`${map.bank}: ${map.no_rekening}`, { align: 'left' });
  doc.moveDown();
  if (map.caption) { doc.text(invoice.caption, { align: 'left' }); doc.moveDown(); }

  doc.fillColor('black');
  doc.font('Helvetica-Bold').fontSize(14).text(`INVOICE - ${invoice.jenis.toUpperCase()}`, { align: 'right' });
  doc.font('Helvetica').fontSize(10).text(`No: ${invoice.noInvoice}`, { align: 'right' });
  doc.text(`Tanggal: ${invoice.tanggal}`, { align: 'right' });
  doc.moveDown();
  doc.fontSize(11).text(`Kepada: ${pihakNama}`);
  doc.moveDown();

  // Header tabel
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Produk', tableX, headerY, { width: colProduk });
  doc.text('Qty', tableX + colProduk, headerY, { width: colQty, align: 'center' });
  doc.text('Harga', tableX + colProduk + colQty, headerY, { width: colHarga, align: 'right' });
  doc.text('Subtotal', tableX + colProduk + colQty + colHarga, headerY, { width: colSubtotal, align: 'right' });

  const headerHeight = 18;
  const headerBottom = headerY + headerHeight;
  doc.moveTo(tableX, headerBottom).lineTo(tableX + pageWidth, headerBottom).strokeColor('black').lineWidth(1).stroke();

  // Garis vertikal header
  doc.moveTo(tableX, headerY).lineTo(tableX, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colProduk, headerY).lineTo(tableX + colProduk, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colProduk + colQty, headerY).lineTo(tableX + colProduk + colQty, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + colProduk + colQty + colHarga, headerY).lineTo(tableX + colProduk + colQty + colHarga, headerBottom).strokeColor('black').lineWidth(1).stroke();
  doc.moveTo(tableX + pageWidth, headerY).lineTo(tableX + pageWidth, headerBottom).strokeColor('black').lineWidth(1).stroke();

  // Isi tabel
  const rowHeight = 18;
  let currentY = doc.y;
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(10);

    const produkText = item.produkNama || '';
    const produkHeight = doc.heightOfString(produkText, { width: colProduk, lineGap: 2 });
    const qtyText = String(item.qty || 0);
    const hargaText = formatRupiah(item.hargaJual || 0);
    const subText = formatRupiah(item.subtotal || 0);

    const cellHeight = Math.max(rowHeight, produkHeight + 6);

    // Produk: wrap allowed
    doc.text(produkText, tableX, currentY, { width: colProduk, lineGap: 2 });

    // Qty: center vertical-ish
    const qtyWidth = doc.widthOfString(qtyText);
    doc.text(qtyText, tableX + colProduk + (colQty - qtyWidth) / 2, currentY + 4);

    // Harga: right aligned
    const hargaWidth = doc.widthOfString(hargaText);
    doc.text(hargaText, tableX + colProduk + colQty + colHarga - hargaWidth, currentY + 4);

    // Subtotal: right aligned
    const subWidth = doc.widthOfString(subText);
    doc.text(subText, tableX + colProduk + colQty + colHarga + colSubtotal - subWidth, currentY + 4);

    const rowBottom = currentY + cellHeight;
    doc.moveTo(tableX, rowBottom).lineTo(tableX + pageWidth, rowBottom).strokeColor('#999').lineWidth(0.5).stroke();

    // Garis vertikal data
    doc.moveTo(tableX, currentY).lineTo(tableX, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colProduk, currentY).lineTo(tableX + colProduk, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colProduk + colQty, currentY).lineTo(tableX + colProduk + colQty, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + colProduk + colQty + colHarga, currentY).lineTo(tableX + colProduk + colQty + colHarga, rowBottom).strokeColor('black').lineWidth(1).stroke();
    doc.moveTo(tableX + pageWidth, currentY).lineTo(tableX + pageWidth, rowBottom).strokeColor('black').lineWidth(1).stroke();

    doc.y = rowBottom;
    currentY = rowBottom;
  });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('black');
  doc.text(`Total: ${formatRupiah(invoice.total || 0)}`, { align: 'right' });
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(9).fillColor('gray').text('Dokumen ini dibuat otomatis oleh sistem CV Brothers Farm.', { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    res.download(filePath, `${invoice.noInvoice}.pdf`);
  });
}

function generateExcel(req, res) {
  const invoice = db.prepare('SELECT * FROM invoice WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice tidak ditemukan.' });

  const settings = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  let items = [];
  let pihakNama = '-';

  if (invoice.jenis === 'customer') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(invoice.refId);
    const customer = order ? db.prepare('SELECT * FROM customer WHERE id = ?').get(order.customerId) : null;
    pihakNama = customer ? customer.nama : '-';
    items = order ? db.prepare(`
      SELECT oi.*, p.nama AS produkNama FROM order_items oi JOIN produk p ON p.id = oi.produkId WHERE oi.orderId = ?
    `).all(order.id) : [];
  } else if (invoice.jenis === 'bonus') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const sales = pembayaran ? db.prepare('SELECT * FROM sales WHERE id = ?').get(pembayaran.salesId) : null;
    pihakNama = sales ? sales.nama : '-';
  } else if (invoice.jenis === 'supplier') {
    const pembayaran = db.prepare('SELECT * FROM pembayaran WHERE id = ?').get(invoice.refId);
    const supplier = pembayaran ? db.prepare('SELECT * FROM supplier WHERE id = ?').get(pembayaran.supplierId) : null;
    pihakNama = supplier ? supplier.nama : '-';
  }

  const outDir = path.join(__dirname, '..', 'invoices_output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${invoice.noInvoice}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Invoice');

  // Kop
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = map.nama_perusahaan || 'CV Brothers Farm';
  sheet.getCell('A1').font = { bold: true, size: 18 };

  if (map.alamat) { sheet.mergeCells('A2:D2'); sheet.getCell('A2').value = map.alamat; }
  if (map.telepon) { sheet.mergeCells('A3:D3'); sheet.getCell('A3').value = `Telp: ${map.telepon}${map.email ? ' | Email: ' + map.email : ''}`; }
  if (map.npwp) { sheet.mergeCells('A4:D4'); sheet.getCell('A4').value = `NPWP: ${map.npwp}`; }
  if (map.website) { sheet.mergeCells('A5:D5'); sheet.getCell('A5').value = map.website; }
  if (map.bank && map.no_rekening) { sheet.mergeCells('A6:D6'); sheet.getCell('A6').value = `${map.bank}: ${map.no_rekening}`; }

  let startRow = 8;
  if (map.caption) { sheet.mergeCells(`A${startRow}:D${startRow}`); sheet.getCell(`A${startRow}`).value = invoice.caption; startRow += 2; }

  // Judul
  sheet.mergeCells(`A${startRow}:D${startRow}`);
  sheet.getCell(`A${startRow}`).value = `INVOICE - ${invoice.jenis.toUpperCase()}`;
  sheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'right' };
  startRow += 1;

  sheet.mergeCells(`A${startRow}:D${startRow}`);
  sheet.getCell(`A${startRow}`).value = `No: ${invoice.noInvoice}`;
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'right' };
  startRow += 1;

  sheet.mergeCells(`A${startRow}:D${startRow}`);
  sheet.getCell(`A${startRow}`).value = `Tanggal: ${invoice.tanggal}`;
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'right' };
  startRow += 2;

  sheet.getCell(`A${startRow}`).value = `Kepada: ${pihakNama}`;
  startRow += 2;

  // Tabel
  const headers = ['Produk', 'Qty', 'Harga', 'Subtotal'];
  headers.forEach((h, idx) => {
    const cell = sheet.getCell(startRow, idx + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = idx === 0 ? { horizontal: 'left' } : idx === 1 ? { horizontal: 'center' } : { horizontal: 'right' };
  });
  startRow += 1;

  items.forEach((item) => {
    const row = [
      item.produkNama || '',
      item.qty || 0,
      formatRupiah(item.hargaJual || 0),
      formatRupiah(item.subtotal || 0)
    ];
    row.forEach((val, idx) => {
      const cell = sheet.getCell(startRow, idx + 1);
      cell.value = val;
      cell.alignment = idx === 0 ? { horizontal: 'left' } : idx === 1 ? { horizontal: 'center' } : { horizontal: 'right' };
    });
    startRow += 1;
  });

  startRow += 1;
  sheet.mergeCells(`C${startRow}:D${startRow}`);
  sheet.getCell(`C${startRow}`).value = `Total: ${formatRupiah(invoice.total || 0)}`;
  sheet.getCell(`C${startRow}`).font = { bold: true };
  sheet.getCell(`C${startRow}`).alignment = { horizontal: 'right' };

  startRow += 2;
  sheet.mergeCells(`A${startRow}:D${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'Dokumen ini dibuat otomatis oleh sistem CV Brothers Farm.';
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;

  workbook.xlsx.writeFile(filePath).then(() => {
    res.download(filePath, `${invoice.noInvoice}.xlsx`);
  }).catch(err => {
    res.status(500).json({ error: 'Gagal membuat Excel: ' + err.message });
  });
}

module.exports = { list, get, getPreview, create, update, generatePdf, generateExcel };
