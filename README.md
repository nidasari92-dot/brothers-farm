# CV Brothers Farm — Sistem Penjualan

Aplikasi web untuk manajemen penjualan, pembayaran, invoice, dan bonus sales
CV Brothers Farm. Backend Node.js/Express + SQLite (better-sqlite3), frontend
HTML/CSS/JS vanilla (tanpa framework, ringan untuk VPS kecil).

## Fitur Utama

- **Login & Role**: Admin (akses penuh) dan User/Staff (akses terbatas, tanpa
  data finansial sensitif).
- **Master Data**: Produk, Customer, Sales, Supplier.
- **Riwayat Harga**: input manual per produk atau upload massal via Excel
  (kolom: kode_produk, harga_beli, harga_jual).
- **Order Penjualan**: multi-item per order, hitung otomatis total & insentif
  sales.
- **Pembayaran**: penerimaan dari customer, pengeluaran ke supplier,
  pembayaran bonus sales (dengan validasi tidak melebihi sisa bonus).
- **Dashboard Bonus per Sales** dan **Dashboard per Supplier** (utang, produk
  disuplai, histori bayar).
- **Invoice PDF**: 3 jenis (customer, supplier, bonus sales), kop & logo bisa
  diedit lewat menu Pengaturan.
- **Dashboard Admin**: ringkasan total penjualan, piutang, utang supplier,
  bonus outstanding.

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env
# edit .env sesuai kebutuhan
npm run seed      # membuat akun admin pertama
npm start          # atau: npm run dev (dengan nodemon)
```

Buka `http://localhost:3000`.

## Struktur Folder

```
config/       koneksi database & seed admin
middleware/   autentikasi JWT & otorisasi role
controllers/  logika bisnis tiap modul
routes/       definisi endpoint API
public/       frontend (HTML/CSS/JS)
data/         file database SQLite (dibuat otomatis)
invoices_output/  hasil PDF invoice
uploads/      file sementara (excel & gambar) sebelum diproses
docs/         dokumentasi tambahan, termasuk panduan deployment
```

## Deployment ke VPS

Lihat panduan lengkap di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — mencakup
setup Node.js, PM2, Nginx reverse proxy, HTTPS (Let's Encrypt), firewall, dan
backup database.

## Catatan Keamanan

- Ganti `JWT_SECRET` dan password admin default sebelum go-live.
- Jangan expose port 3000 langsung ke publik — selalu lewat Nginx.
- Backup `data/brothersfarm.db` secara rutin (lihat panduan deployment poin 10).
