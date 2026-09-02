#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${1:-/path/to/brothers-farm}"
APP_NAME="${2:-brothers-farm}"
BACKUP_DIR="$APP_DIR/backups"
HEALTH_URL="http://localhost:3232/health"

echo "=== Brothers Farm VPS Updater ==="
echo "Target: $APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "ERROR: $APP_DIR bukan repo git."
  exit 1
fi

cd "$APP_DIR"

echo "[1/6] Backup database..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/brothersfarm.db.backup-$(date +%Y%m%d-%H%M%S)"
cp data/brothersfarm.db "$BACKUP_FILE"
echo "  -> $BACKUP_FILE"

echo "[2/6] Git pull..."
git pull origin main

echo "[3/6] Install dependencies..."
npm install --production

echo "[4/6] Run migrations..."
if [ -f scripts/migrate.js ]; then
  node scripts/migrate.js || true
else
  echo "  -> No migration runner found, skip."
fi

echo "[5/6] Restart app..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" || pm2 start server.js --name "$APP_NAME"
elif systemctl is-active --quiet "$APP_NAME" 2>/dev/null; then
  sudo systemctl restart "$APP_NAME"
else
  pkill -f "node server.js" 2>/dev/null || true
  nohup node server.js >/dev/null 2>&1 &
fi

echo "[6/6] Verify health..."
for i in {1..10}; do
  sleep 1
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    echo "  -> Aplikasi sehat (HTTP 200)"
    echo "=== Update selesai ==="
    echo "Backup: $BACKUP_FILE"
    echo "Log:    pm2 logs $APP_NAME  /  journalctl -u $APP_NAME -f"
    exit 0
  fi
done

echo "ERROR: Aplikasi tidak merespon setelah 10 detik."
echo "Cek log untuk detail."
