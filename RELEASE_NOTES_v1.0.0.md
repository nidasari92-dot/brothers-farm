# CV Brothers Farm - Sistem Penjualan v1.0.0

## Ringkasan
Sistem penjualan untuk CV Brothers Farm yang mencakup manajemen produk, harga, order, invoice, dan portal customer.

---

## Fitur Utama

### 1. Autentikasi & Authorization
- Login admin dengan JWT
- Registrasi customer mandiri
- Role-based access: Admin, Customer, Sales, Supplier

### 2. Dashboard Admin
- Ringkasan statistik: total order, pendapatan, customer aktif
- Recent orders (20 item default)
- Navigasi pagination dengan dropdown (10/20/50/100)
- Dark/light theme toggle

### 3. Manajemen Produk & Harga
- CRUD produk dengan supplier
- CRUD harga dengan history tracking
- Katalog publik dengan pagination
- Tema gelap/terang konsisten

### 4. Order Management
- Create order dengan multiple items
- Auto-generate invoice
- Order list dengan status tracking

### 5. Invoice & PDF
- Generate invoice PDF otomatis
- Preview invoice sebelum download
- Excel export untuk invoice
- Logo perusahaan di invoice

### 6. Portal Customer
- Login/register customer
- Browse produk & harga terkini
- Lihat history pembelian
- Theme toggle (dark/light mode)

### 7. Chatbot
- Customer service otomatis
- Dark mode support
- Responsive UI

### 8. Theme & UI
- Dark/light mode di semua halaman
- Logo adaptif: logo.png (light), logo-sidebar.png (dark)
- Persistensi tema via localStorage
- Responsive design untuk mobile

---

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt
- **PDF**: PDFKit
- **Frontend**: Vanilla JS + CSS custom properties
- **Testing**: Node.js test runner + GitHub Actions CI

---

## Testing
- Automated API tests (auth, dashboard, pagination, invoice)
- GitHub Actions CI/CD
- Seed script untuk test data
- Coverage: Customer Auth, Dashboard API, Catalog Pagination, Invoice Generation

---

## Deployment
- Server: `node server.js`
- Port: `3232`
- Database: `data/brothersfarm.db`
- Auto-start: Termux:Boot + runit service
- Git auto-sync: cron job setiap 5 jam

---

## Credentials Default
- **Admin**: `admin` / `admin123`
- **Customer test**: `testcustomer` / `testpass123`

---

## Roadmap
- [ ] Payment gateway integration (Midtrans)
- [ ] Email notifikasi (SendGrid/Office365)
- [ ] Android APK build
- [ ] Docker deployment
- [ ] Backup/restore database
- [ ] Multi-language support (EN/ID/RU)

---

## License
Private - CV Brothers Farm

---

**Release Date**: 30 Agustus 2026  
**Version**: 1.0.0  
**Repository**: https://github.com/nidasari92-dot/brothers-farm
