# Panduan Deployment - CV Brothers Farm ke VPS Linux

Panduan ini untuk VPS Ubuntu 22.04/24.04 (perintah serupa untuk Debian). Domain
contoh: `brothersfarm.example.com` — ganti dengan domain/IP Anda sendiri.

## 1. Persiapan Server

```bash
# Login sebagai root atau user dengan akses sudo
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git

# Cek versi
node -v      # harus v20.x
npm -v
```

`build-essential` diperlukan karena `better-sqlite3` melakukan kompilasi native
saat instalasi.

## 2. Buat User Non-root (opsional tapi disarankan)

```bash
sudo adduser brothersfarm
sudo usermod -aG sudo brothersfarm
su - brothersfarm
```

## 3. Upload / Clone Project

Opsi A — dari Git (jika project sudah di repo):
```bash
git clone <url-repo-anda> brothers-farm
cd brothers-farm
```

Opsi B — upload manual via SCP dari komputer lokal:
```bash
# dijalankan dari komputer lokal, bukan di VPS
scp -r ./brothers-farm brothersfarm@IP_VPS:/home/brothersfarm/
```

## 4. Install Dependencies & Konfigurasi

```bash
cd ~/brothers-farm
npm install --production

cp .env.example .env
nano .env
```

Edit `.env` minimal:
- `JWT_SECRET` → isi string acak panjang: `openssl rand -hex 32`
- `DEFAULT_ADMIN_PASSWORD` → ganti dari default
- `PORT` → biarkan 3000 kecuali bentrok dengan service lain

Buat folder data & jalankan seed admin:
```bash
mkdir -p data invoices_output uploads/excel uploads/images
npm run seed
```

Catat username/password admin yang tercetak, lalu **segera ganti password**
setelah login pertama kali (lewat menu Pengaturan → Buat Akun, atau update
manual di database).

## 5. Test Jalan Manual (sebelum pasang PM2)

```bash
node server.js
# buka http://IP_VPS:3000 di browser, pastikan halaman login muncul
# tekan Ctrl+C untuk stop setelah yakin jalan
```

Jika ada error `EADDRINUSE`, ganti PORT di `.env`.

## 6. Jalankan Permanen dengan PM2

PM2 menjaga aplikasi tetap hidup, auto-restart jika crash, dan auto-start
saat server reboot.

```bash
sudo npm install -g pm2

pm2 start server.js --name brothers-farm
pm2 save
pm2 startup systemd
# PM2 akan menampilkan 1 baris perintah "sudo env PATH=... pm2 startup..."
# COPY dan jalankan perintah tsb agar PM2 auto-start saat reboot
```

Perintah PM2 yang berguna:
```bash
pm2 status                 # lihat status proses
pm2 logs brothers-farm     # lihat log real-time
pm2 restart brothers-farm  # restart setelah update kode
pm2 stop brothers-farm
```

## 7. Pasang Nginx sebagai Reverse Proxy

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/brothers-farm
```

Isi file:
```nginx
server {
    listen 80;
    server_name brothersfarm.example.com;  # ganti dengan domain/IP Anda

    client_max_body_size 10M;  # untuk upload excel & gambar

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan:
```bash
sudo ln -s /etc/nginx/sites-available/brothers-farm /etc/nginx/sites-enabled/
sudo nginx -t          # test konfigurasi
sudo systemctl restart nginx
```

Sekarang aplikasi bisa diakses di `http://brothersfarm.example.com` (port 80)
tanpa perlu embed `:3000`.

## 8. Pasang HTTPS Gratis (Let's Encrypt)

Wajib jika domain sudah mengarah ke IP VPS (bukan sekadar akses via IP).

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d brothersfarm.example.com
```

Ikuti prompt (masukkan email, setujui ToS). Certbot otomatis mengubah config
Nginx untuk redirect HTTP → HTTPS dan mengatur renewal otomatis.

Cek renewal berjalan otomatis:
```bash
sudo certbot renew --dry-run
```

## 9. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # port 80 & 443
sudo ufw enable
sudo ufw status
```

Port 3000 **tidak perlu** dibuka ke publik karena diakses lewat Nginx di
localhost.

## 10. Backup Database

Database SQLite hanya 1 file. Backup rutin dengan cron:

```bash
crontab -e
```

Tambahkan baris (backup harian jam 2 pagi ke folder backups):
```
0 2 * * * cp /home/brothersfarm/brothers-farm/data/brothersfarm.db /home/brothersfarm/backups/brothersfarm_$(date +\%Y\%m\%d).db
```

Buat foldernya dulu:
```bash
mkdir -p ~/backups
```

Untuk retensi, tambahkan baris pembersihan backup lama (>30 hari):
```
0 3 * * * find /home/brothersfarm/backups -name "*.db" -mtime +30 -delete
```

## 11. Update Aplikasi di Kemudian Hari

```bash
cd ~/brothers-farm
git pull                 # atau upload ulang file yang berubah
npm install --production # jika ada dependency baru
pm2 restart brothers-farm
```

## 12. Troubleshooting Cepat

| Masalah | Penyebab Umum | Solusi |
|---|---|---|
| `better-sqlite3` gagal install | `build-essential` belum terpasang | `sudo apt install build-essential python3` |
| 502 Bad Gateway di Nginx | App Node belum jalan / crash | `pm2 status`, cek `pm2 logs brothers-farm` |
| Login gagal terus | `.env` `JWT_SECRET` berubah setelah token diterbitkan | Login ulang, token lama otomatis invalid |
| Upload Excel gagal | Ukuran file > limit multer/Nginx | Cek `client_max_body_size` di Nginx & limit di `routes/prices.js` |
| Data hilang setelah restart server | `DB_PATH` menunjuk ke folder sementara | Pastikan `DB_PATH` di `.env` menunjuk ke folder permanen, mis. `./data/brothersfarm.db` |

## Ringkasan Arsitektur

```
Browser  --->  Nginx (port 80/443, HTTPS)  --->  Node.js/Express (port 3000, dikelola PM2)
                                                        |
                                                  better-sqlite3 (file lokal: data/brothersfarm.db)
```

Aplikasi ini dirancang single-server, cocok untuk skala UKM/CV dengan trafik
menengah. Jika ke depan butuh multi-server atau HA, database perlu dimigrasi
ke PostgreSQL/MySQL terlebih dahulu.
