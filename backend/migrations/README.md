# Database Migrations

## Problem: Column Naming Mismatch

The original `init.sql` used `*_uuid` naming for all columns:
- `user_uuid`, `platform_uuid`, `video_uuid`, etc.

But the **backend code expects different names**:
- `id` for primary keys
- `user_id`, `platform_id` for foreign keys

This caused errors in production:
- ❌ "Server error while saving video" → Column `user_id` does not exist
- ❌ "NFC chip registration fails" → Column `user_id` does not exist

## Solution

### For New Deployments

Use the corrected `backend/init.sql` which has the right column names.

### For Existing Production Databases

Run the migration to rename columns:

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration
\i backend/migrations/001_fix_column_naming.sql
```

## How to Check if You Need the Migration

```sql
-- Check if you have the old schema
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
```

**If this returns a row**: You have the old schema and NEED the migration.
**If this returns no rows**: Your schema is already correct.

## Migration Steps (Fly.io Production)

### Step 1: Backup First!

```bash
# Create a backup before migration
flyctl postgres backup create --app medio-db

# Or use pg_dump
flyctl ssh console --app medio-db
pg_dump -U medio medio > /tmp/backup_before_migration.sql
```

### Step 2: Run Migration

```bash
# Connect to production database
flyctl postgres connect --app medio-db

# Run the migration
\i /path/to/001_fix_column_naming.sql

# Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

You should see `id` (not `user_uuid`).

### Step 3: Verify Application Works

```bash
# Check backend logs
flyctl logs --app medio-backend

# Test video creation
curl -X POST https://medio-backend.fly.dev/api/videos \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=..." \
  -d '{"title": "Test", "platform_id": "...", "platform_video_id": "test123"}'

# Should return 201 Created (not 500)
```

## Rollback (If Something Goes Wrong)

```bash
# Restore from backup
flyctl postgres backup restore --app medio-db

# Or use pg_restore
psql $DATABASE_URL < /tmp/backup_before_migration.sql
```

## Testing Migration Locally

```bash
# Start fresh PostgreSQL with old schema (for testing migration)
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15

# Create database and old schema
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE medio_test;"
psql -h localhost -p 5433 -U postgres -d medio_test < backend/init.sql.old

# Run migration
psql -h localhost -p 5433 -U postgres -d medio_test < backend/migrations/001_fix_column_naming.sql

# Verify
psql -h localhost -p 5433 -U postgres -d medio_test -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';"
```

## Migration Checklist

- [ ] Backup production database
- [ ] Check if migration is needed (query for user_uuid column)
- [ ] Run migration in transaction (BEGIN...COMMIT)
- [ ] Verify column names changed (SELECT column_name...)
- [ ] Test video creation (POST /api/videos)
- [ ] Test NFC chip registration (POST /api/nfc/chips)
- [ ] Check application logs for errors
- [ ] Monitor for 24 hours

## Notes

- The migration runs in a transaction (BEGIN...COMMIT)
- If any step fails, everything rolls back automatically
- Downtime: ~5-10 seconds (for column renames)
- **DO NOT** run this migration twice - it will fail

## Support

If the migration fails:
1. Check PostgreSQL error logs
2. Verify you're connected to the right database
3. Ensure no active connections are blocking schema changes
4. Try again with exclusive lock: `LOCK TABLE users IN ACCESS EXCLUSIVE MODE;`
