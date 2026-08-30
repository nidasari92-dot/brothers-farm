# Backup & Restore - CV Brothers Farm

Panduan backup dan restore database untuk CV Brothers Farm.

---

## Backup

### Manual Backup
```bash
./scripts/backup.sh
```

Output: `backups/brothersfarm_YYYYMMDD_HHMMSS.db.tar.gz`

### Automated Backup (Cron)

Tambahkan ke crontab:
```bash
# Backup setiap hari jam 02:00
0 2 * * * cd /opt/brothers-farm && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Backup ke External Storage

```bash
# Copy ke folder lain
cp backups/*.tar.gz /mnt/external-drive/backups/

# Atau upload ke cloud (rclone, s3, dll)
rclone copy backups/ s3:bucket-name/backups/
```

---

## Restore

### List Available Backups
```bash
ls -lh backups/
```

### Restore dari Backup
```bash
./scripts/restore.sh backups/brothersfarm_20260830_120000.db.tar.gz
```

Script akan:
1. Tanya konfirmasi
2. Buat safety backup dari database current
3. Extract dan restore database
4. Restore WAL/SHM files jika ada

### Restore Safety Backup
```bash
cp backups/pre_restore_YYYYMMDD_HHMMSS.db data/brothersfarm.db
docker-compose restart
```

---

## Database Files

| File | Fungsi | Backup |
|------|--------|--------|
| `data/brothersfarm.db` | Database utama | ✅ Wajib |
| `data/brothersfarm.db-wal` | Write-Ahead Log | ✅ Disertai |
| `data/brothersfarm.db-shm` | Shared Memory | ✅ Disertai |

---

## Important Notes

1. **Jangan edit .env saat restore** — hanya database yang di-restore
2. **Safety backup** otomatis dibuat sebelum restore
3. **WAL checkpoint** dilakukan sebelum backup untuk konsistensi
4. **Old backups** otomatis dihapus setelah 30 hari

---

## Troubleshooting

### Backup gagal: database locked
```bash
# Stop container dulu
docker-compose down

# Lalu backup
./scripts/backup.sh

# Start lagi
docker-compose up -d
```

### Restore gagal: corrupted database
```bash
# Cek integrity
sqlite3 data/brothersfarm.db "PRAGMA integrity_check;"

# Jika corrupted, gunakan backup lama
./scripts/restore.sh backups/brothersfarm_YYYYMMDD_HHMMSS.db.tar.gz
```

---

## Backup Schedule Recommendation

| Frequency | Retention | Use Case |
|-----------|-----------|----------|
| Daily | 7 days | Routine backup |
| Weekly | 4 weeks | Before updates |
| Monthly | 12 months | Long-term archive |

---

## Quick Reference

```bash
# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh <backup_file.tar.gz>

# List backups
ls -lh backups/

# Check DB integrity
sqlite3 data/brothersfarm.db "PRAGMA integrity_check;"

# Manual backup (without script)
sqlite3 data/brothersfarm.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp data/brothersfarm.db backups/brothersfarm_manual.db
```

---

**Version**: 1.0.0  
**Last Updated**: 30 Agustus 2026
