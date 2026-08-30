#!/bin/bash
set -e

echo "=== Brothers Farm Restore ==="
echo ""

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"
DB_PATH="data/brothersfarm.db"

# Check backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Confirm restore
echo "⚠️  This will overwrite the current database!"
echo "Database: $DB_PATH"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Create backup of current database before restore
echo ""
echo "Creating safety backup of current database..."
mkdir -p backups
SAFETY_BACKUP="backups/pre_restore_$(date +%Y%m%d_%H%M%S).db"
cp "$DB_PATH" "$SAFETY_BACKUP" 2>/dev/null || true
echo "✅ Safety backup: $SAFETY_BACKUP"

# Extract backup
echo ""
echo "Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the .db file in temp dir
DB_FILE=$(find "$TEMP_DIR" -name "*.db" -type f | head -1)

if [ -z "$DB_FILE" ]; then
    echo "Error: No .db file found in backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Stop server if running (optional)
echo ""
echo "Restoring database..."
cp "$DB_FILE" "$DB_PATH"

# Restore WAL and SHM files if exist in backup
WAL_FILE=$(find "$TEMP_DIR" -name "*.db-wal" -type f | head -1)
SHM_FILE=$(find "$TEMP_DIR" -name "*.db-shm" -type f | head -1)

if [ -n "$WAL_FILE" ]; then
    cp "$WAL_FILE" "${DB_PATH}-wal"
fi
if [ -n "$SHM_FILE" ]; then
    cp "$SHM_FILE" "${DB_PATH}-shm"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Database restored successfully!"
echo ""
echo "Next steps:"
echo "  1. Restart the server: docker-compose restart"
echo "  2. Verify data is correct"
echo "  3. If something wrong, restore safety backup: cp $SAFETY_BACKUP $DB_PATH"
