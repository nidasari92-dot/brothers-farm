#!/bin/bash
set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="data/brothersfarm.db"
BACKUP_FILE="$BACKUP_DIR/brothersfarm_$TIMESTAMP.db"

echo "=== Brothers Farm Backup ==="
echo ""

# Check database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Checkpoint WAL before backup (SQLite)
sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

# Copy database
cp "$DB_PATH" "$BACKUP_FILE"

# Copy WAL and SHM files if exist
if [ -f "${DB_PATH}-wal" ]; then
    cp "${DB_PATH}-wal" "$BACKUP_FILE-wal"
fi
if [ -f "${DB_PATH}-shm" ]; then
    cp "${DB_PATH}-shm" "$BACKUP_FILE-shm"
fi

# Compress
tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "$(basename "$BACKUP_FILE")" "$(basename "$BACKUP_FILE-wal")" "$(basename "$BACKUP_FILE-shm")" 2>/dev/null || tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "$(basename "$BACKUP_FILE")"

# Remove uncompressed files
rm -f "$BACKUP_FILE" "$BACKUP_FILE-wal" "$BACKUP_FILE-shm"

# Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true

echo "✅ Backup created: $BACKUP_FILE.tar.gz"
echo ""
echo "Backup location: $BACKUP_DIR/"
echo "Size: $(du -h "$BACKUP_FILE.tar.gz" | cut -f1)"
echo ""
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5
