#!/bin/bash
# Export production database schema for all tables

echo "=== PRODUCTION DATABASE SCHEMA ==="
echo ""

tables=("users" "platforms" "videos" "profiles" "nfc_chips" "video_nfc_mappings" "watch_sessions" "daily_watch_time" "token_blacklist")

for table in "${tables[@]}"; do
  echo "========================"
  echo "TABLE: $table"
  echo "========================"
  flyctl ssh console --app medio-backend -C "psql \$DATABASE_URL -c '\d $table'" 2>/dev/null || echo "Table $table not found or error"
  echo ""
done
