const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'invoices_output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function createUatChecklist() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filePath = path.join(OUTPUT_DIR, 'UAT-CHECKLIST-Brothers-Farm.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('CV Brothers Farm', { align: 'left' });
  doc.fontSize(14).font('Helvetica').text('UAT Checklist - Admin Testing', { align: 'left' });
  doc.moveDown();
  doc.fontSize(10).fillColor('gray').text('Tanggal: _______________');
  doc.text('Tester: _______________');
  doc.text('Versi Aplikasi: 1.0.0');
  doc.moveDown();
  doc.fillColor('black');

  const sections = [
    {
      title: 'A. Autentikasi & Manajemen User',
      items: [
        'Login dengan username/password admin',
        'Login dengan username/password sales',
        'Login dengan username/password customer',
        'Logout dan session berakhir',
        'Akses ditolak untuk user tanpa role'
      ]
    },
    {
      title: 'B. Dashboard',
      items: [
        'Menampilkan total order hari ini',
        'Menampilkan total pembayaran masuk',
        'Menampilkan total piutang',
        'Grafik/statistik tampil dengan benar',
        'Refresh data dashboard'
      ]
    },
    {
      title: 'C. Manajemen Produk',
      items: [
        'Tambah produk baru',
        'Edit produk existing',
        'Hapus produk',
        'Upload gambar produk',
        'Filter/search produk'
      ]
    },
    {
      title: 'D. Manajemen Customer',
      items: [
        'Tambah customer baru',
        'Edit data customer',
        'Lihat riwayat order customer',
        'Lihat riwayat pembayaran customer',
        'Set saldo awal customer'
      ]
    },
    {
      title: 'E. Manajemen Sales',
      items: [
        'Tambah sales baru',
        'Edit data sales',
        'Lihat target sales',
        'Lihat komisi sales'
      ]
    },
    {
      title: 'F. Manajemen Supplier',
      items: [
        'Tambah supplier baru',
        'Edit data supplier',
        'Lihat riwayat pembelian',
        'Upload bukti transfer supplier'
      ]
    },
    {
      title: 'G. Order Management',
      items: [
        'Buat order manual untuk customer',
        'Customer membuat order via portal',
        'Edit order sebelum lunas',
        'Cancel order dengan alasan',
        'Print/invoice order'
      ]
    },
    {
      title: 'H. Pembayaran',
      items: [
        'Buat pembayaran transfer',
        'Buat pembayaran QRIS',
        'Buat pembayaran Virtual Account',
        'Simulate pembayaran berhasil',
        'Status order berubah jadi Lunas',
        'Saldo customer berkurang'
      ]
    },
    {
      title: 'I. Invoice & PDF',
      items: [
        'Generate invoice PDF',
        'Logo perusahaan tampil di kop',
        'Tabel item invoice rapi',
        'Download PDF invoice',
        'Print preview invoice'
      ]
    },
    {
      title: 'J. Katalog Harian',
      items: [
        'Generate katalog PDF',
        'Logo tampil di header katalog',
        'Daftar produk aktif lengkap',
        'Pilih penerima (Customer/Sales/Supplier)',
        'Kirim email blast dengan attachment PDF',
        'Email sampai ke inbox penerima'
      ]
    },
    {
      title: 'K. OCR Import Harga',
      items: [
        'Upload foto daftar harga supplier',
        'OCR ekstrak text dari gambar',
        'Validasi hasil OCR',
        'Update harga existing',
        'Insert produk baru'
      ]
    },
    {
      title: 'L. Backup & Restore',
      items: [
        'Download backup database',
        'Download backup file uploads',
        'Restore dari backup',
        'Verify data setelah restore'
      ]
    },
    {
      title: 'M. Portal Customer',
      items: [
        'Login customer berhasil',
        'Lihat daftar order saya',
        'Buat order baru via portal',
        'Lihat riwayat pembayaran',
        'Lihat invoice saya',
        'Buat pembayaran via portal',
        'Chatbot merespon pertanyaan'
      ]
    },
    {
      title: 'N. Pengaturan Sistem',
      items: [
        'Ubah nama perusahaan',
        'Upload logo baru',
        'Ubah alamat/telepon',
        'Ubah footer invoice',
        'Simpan dan perubahan berlaku'
      ]
    },
    {
      title: 'O. Performance & Edge Case',
      items: [
        'Akses dari laptop lain (network)',
        'Browser: Chrome, Firefox',
        'Mobile browser: Chrome Mobile',
        'Data 1000+ produk tetap cepat',
        'Error handling: input invalid'
      ]
    }
  ];

  sections.forEach(section => {
    doc.fontSize(14).font('Helvetica-Bold').text(section.title);
    doc.moveDown(0.3);
    section.items.forEach((item, idx) => {
      doc.fontSize(11).font('Helvetica').text(`[ ] ${idx + 1}. ${item}`);
    });
    doc.moveDown();
  });

  doc.fontSize(10).fillColor('gray').text('Catatan: Checklist ini untuk UAT sebelum deployment produksi.');
  doc.end();

  console.log('UAT Checklist PDF created:', filePath);
  return filePath;
}

createUatChecklist();
