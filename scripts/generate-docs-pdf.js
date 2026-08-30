const PDFDocument = require('pdfkit');
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'pdf');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function createUATChecklist() {
  const filePath = path.join(OUTPUT_DIR, 'UAT_Checklist_Admin.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('UAT Checklist - Admin', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('CV Brothers Farm - Sistem Penjualan v1.0.0', { align: 'center' });
  doc.moveDown(1);

  // Section 1: Login & Auth
  doc.fontSize(14).font('Helvetica-Bold').text('1. Login & Autentikasi');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const authItems = [
    'Login dengan kredensial admin (admin / admin123)',
    'Login dengan kredensial customer (testcustomer / testpass123)',
    'Verifikasi JWT token diterima setelah login',
    'Test logout dan redirect ke halaman login',
    'Test akses tanpa token = 401 Unauthorized'
  ];
  authItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 2: Dashboard
  doc.fontSize(14).font('Helvetica-Bold').text('2. Dashboard Admin');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const dashboardItems = [
    'Statistik total order terlihat',
    'Statistik total pendapatan terlihat',
    'Recent orders menampilkan maksimal 20 item',
    'Pagination berfungsi (prev/next + dropdown 10/20/50/100)',
    'Tema gelap/terang bisa di-toggle',
    'Data ter-update setelah ada order baru'
  ];
  dashboardItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 3: Produk & Harga
  doc.fontSize(14).font('Helvetica-Bold').text('3. Manajemen Produk & Harga');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const produkItems = [
    'Tambah produk baru',
    'Edit produk existing',
    'Hapus produk',
    'Tambah harga baru untuk produk',
    'History harga tercatat',
    'Katalog publik menampilkan produk aktif',
    'Pagination katalog berfungsi (10/20/50/100 per halaman)'
  ];
  produkItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 4: Order Management
  doc.fontSize(14).font('Helvetica-Bold').text('4. Manajemen Order');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const orderItems = [
    'Buat order baru untuk customer',
    'Tambah multiple item ke order',
    'Total order terhitung otomatis',
    'Order bisa di-update status',
    'Order bisa dihapus',
    'Invoice auto-generate setelah order dibuat'
  ];
  orderItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 5: Invoice
  doc.fontSize(14).font('Helvetica-Bold').text('5. Invoice & PDF');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const invoiceItems = [
    'List invoices menampilkan data correct',
    'Detail invoice menampilkan item & total',
    'Generate PDF invoice berhasil',
    'Preview invoice sebelum download',
    'Export Excel invoice',
    'Logo perusahaan muncul di PDF'
  ];
  invoiceItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 6: Portal Customer
  doc.fontSize(14).font('Helvetica-Bold').text('6. Portal Customer');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const portalItems = [
    'Customer bisa register mandiri',
    'Customer bisa login dengan email/phone + password',
    'Customer melihat daftar harga terkini',
    'Customer melihat history pembelian',
    'Theme toggle gelap/terang bekerja',
    'Pagination harga berfungsi'
  ];
  portalItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 7: Theme & UI
  doc.fontSize(14).font('Helvetica-Bold').text('7. Theme & User Interface');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const themeItems = [
    'Tema gelap pada halaman utama',
    'Tema terang pada halaman utama',
    'Logo adaptif sesuai tema (light: logo.png, dark: logo-sidebar.png)',
    'Header portal sesuai tema (light: #1b5e20, dark: #0b0e11)',
    'Sidebar gelap konsisten di mode gelap',
    'Login page logo sesuai tema',
    'Tema tersimpan di localStorage'
  ];
  themeItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });
  doc.moveDown(1);

  // Section 8: Performance & Stability
  doc.fontSize(14).font('Helvetica-Bold').text('8. Performance & Stability');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const perfItems = [
    'Server berjalan di port 3232',
    'Akses dari perangkat lain di jaringan lokal berhasil',
    'Database SQLite tidak corrupted',
    'Auto-start berjalan saat boot Termux',
    'Git auto-sync berjalan setiap 5 jam',
    'Tidak ada error di console browser'
  ];
  perfItems.forEach(item => {
    doc.text(`☐ ${item}`);
  });

  doc.end();

  return new Promise((resolve) => {
    stream.on('finish', () => resolve(filePath));
  });
}

async function createWorkflowPDF() {
  const filePath = path.join(OUTPUT_DIR, 'Workflow_Sistem.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).font('Helvetica-Bold').text('Workflow Sistem - CV Brothers Farm', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('Alur kerja sistem penjualan end-to-end', { align: 'center' });
  doc.moveDown(1);

  // Workflow 1: Admin
  doc.fontSize(14).font('Helvetica-Bold').text('1. Workflow Admin');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const adminWorkflow = [
    '1. Login ke halaman utama dengan akun admin',
    '2. Akses Dashboard untuk melihat ringkasan',
    '3. Kelola Produk: Tambah/Edit/Hapus produk',
    '4. Kelola Harga: Set harga baru, history tercatat',
    '5. Kelola Order: Terima order dari customer',
    '6. Generate Invoice dari order',
    '7. Download PDF invoice atau export Excel',
    '8. Monitor transaksi melalui dashboard'
  ];
  adminWorkflow.forEach(item => {
    doc.text(item);
  });
  doc.moveDown(1);

  // Workflow 2: Customer
  doc.fontSize(14).font('Helvetica-Bold').text('2. Workflow Customer');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const customerWorkflow = [
    '1. Buka portal customer',
    '2. Register akun baru (atau login jika sudah punya)',
    '3. Browse katalog produk & harga terkini',
    '4. Lihat history pembelian sebelumnya',
    '5. Buat order baru (via chatbot atau form)',
    '6. Terima invoice otomatis',
    '7. Download PDF invoice'
  ];
  customerWorkflow.forEach(item => {
    doc.text(item);
  });
  doc.moveDown(1);

  // Workflow 3: System
  doc.fontSize(14).font('Helvetica-Bold').text('3. Workflow Sistem (Automated)');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  const systemWorkflow = [
    '1. Git auto-sync setiap 5 jam ke GitHub',
    '2. GitHub Actions menjalankan test saat push',
    '3. Seed script menyiapkan test data',
    '4. Server restart otomatis via Termux:Boot',
    '5. Backup database rutin (manual/script)'
  ];
  systemWorkflow.forEach(item => {
    doc.text(item);
  });
  doc.moveDown(1);

  // Notes
  doc.fontSize(14).font('Helvetica-Bold').text('Catatan untuk Presentasi');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  doc.text('Sistem ini dikembangkan dengan arsitektur client-server menggunakan Node.js dan SQLite. Setiap modul diuji melalui API test automation sebelum di-release. Calon pengguna hanya perlu mengakses URL lokal (http://192.168.1.5:3232) untuk menggunakan sistem.');
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Oblique').text('Generated: ' + new Date().toLocaleString('id-ID'));

  doc.end();

  return new Promise((resolve) => {
    stream.on('finish', () => resolve(filePath));
  });
}

async function main() {
  console.log('Generating UAT Checklist PDF...');
  const uatPath = await createUATChecklist();
  console.log('UAT Checklist:', uatPath);

  console.log('Generating Workflow PDF...');
  const workflowPath = await createWorkflowPDF();
  console.log('Workflow PDF:', workflowPath);

  console.log('\nDone!');
  console.log('UAT:', uatPath);
  console.log('Workflow:', workflowPath);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
