const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'invoices_output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function createPresentation() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filePath = path.join(OUTPUT_DIR, 'PRESENTASI-CALON-PENGGUNA.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(22).font('Helvetica-Bold').text('CV Brothers Farm', { align: 'center' });
  doc.fontSize(16).text('Presentasi untuk Calon Pengguna', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('gray').text('Versi 1.0 - Agustus 2026');
  doc.moveDown();
  doc.fillColor('black');

  const slides = [
    {
      title: 'Selamat Datang di CV Brothers Farm',
      content: [
        'Sistem Manajemen Penjualan & Pembayaran Terpadu',
        '',
        'Aplikasi web-based untuk mengelola operasional bisnis Anda'
      ]
    },
    {
      title: 'Apa yang Bisa Dilakukan?',
      content: [
        '• Kelola Produk, Customer, Sales, Supplier',
        '• Buat & track Order',
        '• Terima Pembayaran (Transfer, QRIS, VA, Midtrans)',
        '• Generate Invoice PDF otomatis',
        '• Kirim Katalog Harian via Email',
        '• Import harga dari foto supplier (OCR)',
        '• Portal Customer self-service',
        '• Backup & Restore sistem'
      ]
    },
    {
      title: 'Dashboard',
      content: [
        'Ringkasan bisnis dalam satu layar:',
        '• Order hari ini',
        '• Total pembayaran masuk',
        '• Total piutang',
        '• Statistik visual'
      ]
    },
    {
      title: 'Order Management',
      content: [
        'Buat order dalam 3 langkah:',
        '1. Pilih Customer',
        '2. Tambah produk + qty',
        '3. Simpan order',
        '',
        'Customer juga bisa order via Portal'
      ]
    },
    {
      title: 'Pembayaran',
      content: [
        'Metode pembayaran yang tersedia:',
        '• Transfer Bank',
        '• QRIS',
        '• Virtual Account',
        '• Midtrans (Kartu, VA, QRIS, E-Wallet)',
        '',
        'Status order otomatis berubah jadi Lunas'
      ]
    },
    {
      title: 'Invoice PDF',
      content: [
        'Invoice profesional dengan:',
        '• Kop CV Brothers Farm + Logo',
        '• Detail Customer & Order',
        '• Tabel Produk, Qty, Harga, Subtotal',
        '• Total & Status',
        '• Download/Print'
      ]
    },
    {
      title: 'Katalog Harian',
      content: [
        '• Generate PDF katalog produk aktif',
        '• Kop perusahaan + Logo',
        '• Kirim email blast ke:',
        '  - Customer',
        '  - Sales',
        '  - Supplier',
        '• Attachment PDF otomatis'
      ]
    },
    {
      title: 'OCR Import Harga',
      content: [
        '• Upload foto/scan daftar harga supplier',
        '• OCR ekstrak text otomatis',
        '• Validasi hasil',
        '• Update harga / Insert produk baru',
        '• Import CSV massal'
      ]
    },
    {
      title: 'Portal Customer',
      content: [
        'Customer bisa:',
        '• Login dengan no HP',
        '• Lihat order saya',
        '• Buat order baru',
        '• Bayar online',
        '• Lihat invoice & pembayaran',
        '• Tanya chatbot FAQ'
      ]
    },
    {
      title: 'Keunggulan Sistem',
      content: [
        '✓ Web-based, akses HP & Laptop',
        '✓ Responsive design',
        '✓ PDF otomatis (Invoice, Katalog)',
        '✓ Email blast katalog',
        '✓ OCR import harga',
        '✓ Portal customer self-service',
        '✓ Backup & restore mudah',
        '✓ Logo di semua dokumen'
      ]
    },
    {
      title: 'Akses Sistem',
      content: [
        'URL: http://192.168.1.5:3232',
        '',
        'Default Admin:',
        'Username: admin',
        'Password: admin123',
        '',
        'Portal Customer:',
        'Login dengan no HP + password yang didaftarkan'
      ]
    },
    {
      title: 'Workflow Singkat',
      content: [
        '1. Admin buat order untuk customer',
        '2. Customer terima order',
        '3. Customer bayar via portal',
        '4. Admin verifikasi / sistem auto-update',
        '5. Order jadi Lunas',
        '6. Invoice PDF ter-generate',
        '7. Admin generate katalog & kirim email'
      ]
    },
    {
      title: 'Support & Maintenance',
      content: [
        '• Server berjalan 24/7',
        '• Auto-start saat boot HP',
        '• Backup rutin',
        '• Log aktivitas tersimpan',
        '• Update fitur berkala'
      ]
    },
    {
      title: 'Mulai Sekarang',
      content: [
        '1. Buka browser ke http://192.168.1.5:3232',
        '2. Login sebagai admin',
        '3. Explore semua fitur',
        '4. Test dengan data sample',
        '5. Hubungi developer untuk customisasi'
      ]
    },
    {
      title: 'Q&A',
      content: [
        'CV Brothers Farm',
        'Sistem Manajemen Penjualan & Pembayaran Terpadu',
        '',
        'Terima kasih.'
      ]
    }
  ];

  slides.forEach(slide => {
    doc.fontSize(18).font('Helvetica-Bold').text(slide.title, { align: 'center' });
    doc.moveDown(0.3);
    slide.content.forEach(line => {
      doc.fontSize(11).font('Helvetica').text(line);
    });
    doc.moveDown();
  });

  doc.end();
  console.log('Presentation PDF created:', filePath);
  return filePath;
}

createPresentation();
