const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'invoices_output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function createWorkflowDoc() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filePath = path.join(OUTPUT_DIR, 'WORKFLOW-Brothers-Farm.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(22).font('Helvetica-Bold').text('CV Brothers Farm', { align: 'center' });
  doc.fontSize(16).text('Dokumentasi Workflow Sistem', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('gray').text('Versi 1.0 - Agustus 2026');
  doc.moveDown();
  doc.fillColor('black');

  const workflows = [
    {
      title: '1. Workflow Order & Pembayaran',
      steps: [
        'Customer membuat order via Portal',
        'Order masuk ke sistem dengan status "Menunggu Pembayaran"',
        'Customer memilih metode pembayaran: Transfer/QRIS/VA/Midtrans',
        'Sistem generate payment record',
        'Customer melakukan pembayaran',
        'Admin verifikasi pembayaran / sistem auto-update via webhook',
        'Order status berubah menjadi "Lunas"',
        'Saldo customer berkurang sesuai pembayaran',
        'Invoice PDF otomatis ter-generate'
      ]
    },
    {
      title: '2. Workflow Invoice',
      steps: [
        'Admin memilih order yang sudah lunas',
        'Generate invoice PDF dengan kop perusahaan',
        'Tabel produk, qty, harga, subtotal otomatis',
        'Download/print invoice untuk customer',
        'Invoice tersimpan di folder invoices_output/'
      ]
    },
    {
      title: '3. Workflow Katalog Harian',
      steps: [
        'Admin buka menu Katalog',
        'Pilih penerima: Customer / Sales / Supplier',
        'Sistem generate PDF katalog dengan daftar produk aktif',
        'Kop header + logo perusahaan',
        'Email blast dikirim ke semua penerima terpilih',
        'Attachment: KATALOG-YYYYMMDD.pdf'
      ]
    },
    {
      title: '4. Workflow OCR Import Harga',
      steps: [
        'Admin upload foto/scan daftar harga supplier',
        'Sistem OCR ekstrak text dari gambar',
        'Tampilkan hasil OCR untuk validasi',
        'Admin cocokkan dengan database produk',
        'Update harga existing / Insert produk baru',
        'Generate CSV untuk import massal'
      ]
    },
    {
      title: '5. Workflow Backup',
      steps: [
        'Admin klik Backup di menu',
        'Sistem generate: database .db + file uploads',
        'Download ZIP backup',
        'Simpan di lokasi aman'
      ]
    },
    {
      title: '6. Workflow Portal Customer',
      steps: [
        'Customer login dengan no HP + password',
        'Lihat daftar order saya',
        'Buat order baru via form',
        'Lihat riwayat pembayaran',
        'Lihat invoice saya',
        'Buat pembayaran via portal',
        'Chatbot untuk FAQ'
      ]
    }
  ];

  workflows.forEach(wf => {
    doc.fontSize(14).font('Helvetica-Bold').text(wf.title);
    doc.moveDown(0.3);
    wf.steps.forEach((step, idx) => {
      doc.fontSize(11).font('Helvetica').text(`${idx + 1}. ${step}`);
    });
    doc.moveDown();
  });

  doc.fontSize(10).fillColor('gray').text('Catatan: Workflow ini adalah alur standar sistem. Bisa disesuaikan sesuai kebutuhan bisnis.');
  doc.end();

  console.log('Workflow PDF created:', filePath);
  return filePath;
}

createWorkflowDoc();
