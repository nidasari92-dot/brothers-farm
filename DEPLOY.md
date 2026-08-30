# Deploy - CV Brothers Farm

Deploy aplikasi CV Brothers Farm ke VPS Linux (Contabo, dll) menggunakan Docker.

---

## Prerequisites

- VPS dengan Linux (Ubuntu/Debian recommended)
- Root access atau sudo
- Git
- Docker + Docker Compose

---

## Setup Awal di VPS

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone git@github.com:nidasari92-dot/brothers-farm.git
cd brothers-farm
```

### 3. Konfigurasi Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env` sesuai kebutuhan:
- `PORT` — port yang diinginkan (default: 3232)
- `JWT_SECRET` — ganti dengan string acak yang panjang
- `DB_PATH` — path database (default: `/app/data/brothersfarm.db`)
- `SMTP_*` — konfigurasi email notifikasi
- `MIDTRANS_*` — konfigurasi payment gateway

### 4. Jalankan Aplikasi

```bash
sudo docker-compose up -d
```

### 5. Cek Status

```bash
sudo docker-compose logs -f
```

Akses: `http://IP_VPS:3232`

---

## Perintah Berguna

```bash
# Lihat logs
sudo docker-compose logs -f

# Restart container
sudo docker-compose restart

# Stop container
sudo docker-compose down

# Update aplikasi
git pull origin main
sudo docker-compose up -d --build
```

---

## Firewall

Pastikan port 3232 terbuka:

```bash
# UFW
sudo ufw allow 3232/tcp

# Firewalld
sudo firewall-cmd --add-port=3232/tcp --permanent
sudo firewall-cmd --reload
```

---

## Backup Database

Database disimpan di `./data/brothersfarm.db` (volume mapped).

```bash
# Backup manual
cp data/brothersfarm.db data/brothersfarm.db.backup

# Restore
cp data/brothersfarm.db.backup data/brothersfarm.db
sudo docker-compose restart
```

---

## Troubleshooting

### Container tidak start
```bash
sudo docker-compose logs
```

### Port sudah dipakai
Ubah `PORT` di `.env` ke port lain (misal: 5000)

### Permission denied di volume
```bash
sudo chown -R 1000:1000 data
```

---

## Resource Usage

| Component | RAM | Disk |
|-----------|-----|------|
| Docker daemon | ~50MB | ~500MB |
| Node.js app | ~150MB | ~100MB |
| SQLite database | ~20MB | ~50MB |
| **Total** | **~220MB** | **~650MB** |

**Minimal VPS:**
- RAM: 512MB
- Disk: 5GB
- CPU: 1 vCore

---

## Support

Repository: https://github.com/nidasari92-dot/brothers-farm  
Version: 1.0.0
