#!/bin/bash

# Setup GA4 BigQuery → Supabase Daily Sync Cron Job
# Runs daily at 00:15 UTC (15 minutes past midnight)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="/var/log/memopyk"
CRON_FILE="/tmp/ga4-sync-cron"

echo "🔧 Setting up GA4 sync cron job..."

# Create log directory
sudo mkdir -p "$LOG_DIR"
sudo chown $(whoami):$(whoami) "$LOG_DIR"

# Create cron entry
cat > "$CRON_FILE" << EOF
# GA4 BigQuery → Supabase Daily Sync
# Runs every day at 00:15 UTC (15 minutes past midnight)
15 0 * * * cd "$PROJECT_DIR" && /usr/bin/node scripts/ga4-sync-runner.js >> "$LOG_DIR/ga4-sync.log" 2>&1

# Log rotation for GA4 sync logs (keep last 30 days)
0 1 * * * find "$LOG_DIR" -name "ga4-sync.log.*" -mtime +30 -delete
EOF

# Install cron job
crontab "$CRON_FILE"
rm "$CRON_FILE"

echo "✅ GA4 sync cron job installed successfully"
echo "📅 Schedule: Daily at 00:15 UTC"
echo "📝 Logs: $LOG_DIR/ga4-sync.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To view sync logs: tail -f $LOG_DIR/ga4-sync.log"
echo "To run sync manually: cd $PROJECT_DIR && node scripts/ga4-sync-runner.js"