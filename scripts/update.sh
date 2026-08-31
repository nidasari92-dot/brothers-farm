#!/bin/bash
set -e

LOG_FILE="/var/log/brothers-farm-update.log"
DEPLOY_DIR="/opt/brothers-farm"

echo "=== Brothers Farm Auto Update ===" | tee -a "$LOG_FILE"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check if directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: Directory $DEPLOY_DIR not found" | tee -a "$LOG_FILE"
    exit 1
fi

cd "$DEPLOY_DIR"

# Check if git repo
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository" | tee -a "$LOG_FILE"
    exit 1
fi

# Fetch latest changes
echo "Fetching latest changes..." | tee -a "$LOG_FILE"
git fetch origin main 2>&1 | tee -a "$LOG_FILE"

# Check if there are updates
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Already up to date (commit: $LOCAL)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    exit 0
fi

echo "🔄 Update available!" | tee -a "$LOG_FILE"
echo "Local:  $LOCAL" | tee -a "$LOG_FILE"
echo "Remote: $REMOTE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Pull changes
echo "Pulling changes..." | tee -a "$LOG_FILE"
git pull origin main 2>&1 | tee -a "$LOG_FILE"

# Check if Docker is available
if command -v docker &> /dev/null && (docker compose version &> /dev/null || command -v docker-compose &> /dev/null); then
    echo "" | tee -a "$LOG_FILE"
    echo "Rebuilding and restarting Docker container..." | tee -a "$LOG_FILE"
    
    if docker compose version &> /dev/null; then
        docker compose up -d --build 2>&1 | tee -a "$LOG_FILE"
    else
        docker-compose up -d --build 2>&1 | tee -a "$LOG_FILE"
    fi
    
    echo "✅ Docker container restarted" | tee -a "$LOG_FILE"
else
    echo "" | tee -a "$LOG_FILE"
    echo "⚠️  Docker not found. Please restart manually: node server.js" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "=== Update Complete ===" | tee -a "$LOG_FILE"
echo "New commit: $(git rev-parse --short main)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
