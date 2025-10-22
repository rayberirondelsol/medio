# Deployment Checklist: Database Schema Fix

## 🎯 Goal
Fix production errors by correcting database schema column naming.

---

## 📋 Pre-Deployment Checklist

### 1. Code Review
- [ ] Review PR description: `PR_DESCRIPTION.md`
- [ ] Review schema changes: `backend/init.sql`
- [ ] Review migration script: `backend/migrations/001_fix_column_naming.sql`
- [ ] Understand what changed and why

### 2. Decision: New Deployment vs Migration

**Choose ONE:**

**Option A: New Deployment (Fresh Database)**
- ✅ Use if: You want to start fresh
- ⚠️ WARNING: **Destroys all existing data!**
- ✅ Simpler, no migration needed
- ❌ Lose all users, videos, NFC chips

**Option B: Migration (Keep Existing Data)**
- ✅ Use if: You want to keep existing production data
- ✅ Preserves all users, videos, NFC chips
- ⚠️ Requires running migration script
- ✅ Can rollback if something goes wrong

**Decision:** [ ] New Deployment  [ ] Migration

---

## 🔄 Option A: New Deployment (Fresh Database)

### Step 1: Pull Latest Code
```bash
cd /path/to/medio
git fetch origin
git checkout claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV
git pull
```
- [ ] Code pulled successfully
- [ ] On correct branch: `claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV`

### Step 2: Local Testing (Optional but Recommended)

#### 2a. Start Local Environment
```bash
# Destroy old database (if exists)
docker-compose down -v

# Start fresh with new schema
docker-compose up -d

# Wait for services to be ready
sleep 10
```
- [ ] PostgreSQL started
- [ ] Backend started (port 5000)
- [ ] Frontend proxy started (port 8080)

#### 2b. Run Integration Tests
```bash
# Run integration tests against local environment
npm run test:integration:local
```
- [ ] All tests pass
- [ ] Video creation works
- [ ] NFC chip registration works

#### 2c. Manual Testing
```bash
# Open browser
open http://localhost:8080

# Test:
# 1. Register account
# 2. Add a video
# 3. Register NFC chip
```
- [ ] Can register account
- [ ] Can add video (no "Server error")
- [ ] Can register NFC chip (no error)

### Step 3: Deploy to Production

#### 3a. Deploy Backend
```bash
cd backend
flyctl deploy --remote-only
```
- [ ] Backend deployed successfully
- [ ] Check logs: `flyctl logs --app medio-backend`
- [ ] No errors in logs

#### 3b. Deploy Frontend
```bash
cd ..
flyctl deploy
```
- [ ] Frontend deployed successfully
- [ ] Check logs: `flyctl logs --app medio-react-app`
- [ ] No errors in logs

### Step 4: Verify Production

#### 4a. Check Health
```bash
# Check frontend health
curl https://medio-react-app.fly.dev/health

# Check backend health
curl https://medio-backend.fly.dev/api/health
```
- [ ] Frontend health OK
- [ ] Backend health OK

#### 4b. Run Integration Tests Against Production
```bash
npm run test:integration:production
```
- [ ] All tests pass
- [ ] Video creation works
- [ ] NFC chip registration works

#### 4c. Manual Testing in Production
```bash
# Open browser
open https://medio-react-app.fly.dev

# Test:
# 1. Register account
# 2. Add a video
# 3. Register NFC chip
```
- [ ] Can register account
- [ ] Can add video (✅ NO "Server error"!)
- [ ] Can register NFC chip (✅ NO error!)

---

## 🔄 Option B: Migration (Keep Existing Data)

### Step 1: Pull Latest Code
```bash
cd /path/to/medio
git fetch origin
git checkout claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV
git pull
```
- [ ] Code pulled successfully
- [ ] On correct branch

### Step 2: Check if Migration is Needed

```bash
# Connect to production database
flyctl postgres connect --app medio-db
```

```sql
-- Check for old schema
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
```

**Result:**
- [ ] **Returns a row** → Old schema detected → **MIGRATION NEEDED** → Continue to Step 3
- [ ] **Returns no rows** → New schema already → **SKIP MIGRATION** → Go to Step 6 (Deploy)

### Step 3: CRITICAL - Backup Database

```bash
# Create backup
flyctl postgres backup create --app medio-db
```
- [ ] Backup created successfully

```bash
# Verify backup exists
flyctl postgres backup list --app medio-db
```
- [ ] Backup appears in list
- [ ] Note backup ID: `_______________________`

### Step 4: Test Migration on Staging (If Available)

**If you have a staging database:**
```bash
# Connect to staging
flyctl postgres connect --app medio-db-staging

# Run migration
\i /path/to/medio/backend/migrations/001_fix_column_naming.sql

# Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- Should see: id, email, password_hash, name (NOT user_uuid!)
```
- [ ] Migration successful on staging
- [ ] Verified column names changed
- [ ] Staging app still works

**If you DON'T have staging:**
- [ ] Skip to Step 5 (proceed with caution!)

### Step 5: Run Migration on Production

#### 5a. Connect to Production Database
```bash
flyctl postgres connect --app medio-db
```
- [ ] Connected successfully

#### 5b. Run Migration Script
```sql
-- Read migration script
\i /path/to/medio/backend/migrations/001_fix_column_naming.sql
```

**Watch for:**
- Each `ALTER TABLE` should show `ALTER TABLE`
- No `ERROR` messages
- Final message: `COMMIT`

- [ ] Migration completed without errors
- [ ] Saw `COMMIT` at the end

#### 5c. Verify Column Names Changed
```sql
-- Check users table
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

**Expected columns:** `id`, `email`, `password_hash`, `name`, `created_at`, `updated_at`

- [ ] ✅ Column is `id` (NOT `user_uuid`)

```sql
-- Check videos table
SELECT column_name FROM information_schema.columns WHERE table_name = 'videos';
```

**Expected columns:** `id`, `user_id`, `platform_id`, `platform_video_id`, `video_url`, `title`, `description`, `thumbnail_url`, `duration_seconds`, `age_rating`, `channel_name`, `created_at`, `updated_at`

- [ ] ✅ Column is `id` (NOT `video_uuid`)
- [ ] ✅ Column is `user_id` (NOT `user_uuid`)
- [ ] ✅ Column is `platform_id` (NOT `platform_uuid`)

```sql
-- Check nfc_chips table
SELECT column_name FROM information_schema.columns WHERE table_name = 'nfc_chips';
```

**Expected columns:** `id`, `user_id`, `chip_uid`, `label`, `created_at`, `updated_at`

- [ ] ✅ Column is `id` (NOT `chip_uuid`)
- [ ] ✅ Column is `user_id` (NOT `user_uuid`)

#### 5d. Disconnect from Database
```sql
\q
```
- [ ] Disconnected from database

### Step 6: Deploy Updated Backend Code

```bash
cd backend
flyctl deploy --remote-only
```
- [ ] Backend deployed successfully
- [ ] Check logs: `flyctl logs --app medio-backend`
- [ ] No errors in logs

### Step 7: Deploy Updated Frontend Code

```bash
cd ..
flyctl deploy
```
- [ ] Frontend deployed successfully
- [ ] Check logs: `flyctl logs --app medio-react-app`
- [ ] No errors in logs

### Step 8: Verify Production Works

#### 8a. Check Logs
```bash
# Check backend logs for database errors
flyctl logs --app medio-backend | grep -i error
```
- [ ] No database column errors
- [ ] No "user_id does not exist" errors

#### 8b. Run Diagnostic Script
```bash
node test-production-api.js
```

**Expected output:**
```
[✓] CSRF Token obtained
[✓] User registered successfully
[✓] Authentication successful
[✓] Platforms fetched
[✓] Video created successfully!      ← This should work now!
[✓] NFC chip registered successfully! ← This should work now!
```

- [ ] ✅ Video creation works
- [ ] ✅ NFC chip registration works
- [ ] No errors

#### 8c. Run Integration Tests
```bash
npm run test:integration:production
```
- [ ] All video creation tests pass
- [ ] All NFC registration tests pass
- [ ] No failures

#### 8d. Manual Testing in Browser
```bash
open https://medio-react-app.fly.dev
```

**Test workflow:**
1. Register new account
2. Add a video (YouTube, Vimeo, or Dailymotion)
3. Register an NFC chip

- [ ] ✅ Can add video without "Server error"
- [ ] ✅ Can register NFC chip without error
- [ ] Video appears in video list
- [ ] NFC chip appears in chip list

---

## 📊 Post-Deployment Monitoring

### Hour 1: Active Monitoring

```bash
# Watch logs
flyctl logs --app medio-backend --follow
flyctl logs --app medio-react-app --follow
```

**Look for:**
- ❌ "column user_id does not exist" → Migration didn't work
- ❌ "column user_uuid does not exist" → Old code still running
- ✅ Successful video creations
- ✅ Successful NFC registrations

- [ ] No database column errors in first hour
- [ ] Users can add videos successfully
- [ ] Users can register NFC chips successfully

### Hour 24: Check Metrics

```bash
# Check error rates in Sentry (if configured)
# Check user activity
```

- [ ] No increase in error rates
- [ ] Users actively adding videos
- [ ] Users actively registering chips

---

## 🚨 Rollback Plan (If Something Goes Wrong)

### If Migration Failed

#### Option 1: Restore from Backup
```bash
# List backups
flyctl postgres backup list --app medio-db

# Restore from backup (use backup ID from Step 3)
flyctl postgres backup restore <backup-id> --app medio-db
```
- [ ] Database restored
- [ ] Old schema back in place

#### Option 2: Re-run Migration
```bash
# If migration partially completed, you may need to fix manually
flyctl postgres connect --app medio-db

# Check what's wrong
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

# Manually fix if needed
```

### If Application Broken After Deployment

#### Option 1: Revert Code
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy
flyctl deploy
```
- [ ] Code reverted
- [ ] Redeployed
- [ ] Application working again

#### Option 2: Restore Database + Revert Code
```bash
# Restore database
flyctl postgres backup restore <backup-id> --app medio-db

# Revert code
git revert HEAD
git push origin main
flyctl deploy
```
- [ ] Database restored
- [ ] Code reverted
- [ ] Application working again

---

## ✅ Final Checklist

### Deployment Complete

- [ ] Database schema corrected (new deployment OR migration)
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] No errors in logs
- [ ] Integration tests pass
- [ ] Manual testing successful:
  - [ ] Video creation works
  - [ ] NFC chip registration works
- [ ] Monitoring for 24 hours

### Documentation

- [ ] Update team on deployment status
- [ ] Document any issues encountered
- [ ] Update runbook if needed

### Cleanup (After 1 Week of Stable Operation)

- [ ] Remove old backups (if needed)
- [ ] Archive this checklist
- [ ] Close related issues/tickets

---

## 📞 Emergency Contacts

**If you encounter critical issues:**

1. **Check logs first:** `flyctl logs --app medio-backend`
2. **Run diagnostic:** `node test-production-api.js`
3. **Check migration guide:** `backend/migrations/README.md`
4. **Contact team:** [Your team contact info]

---

## 🎉 Success Criteria

✅ **Deployment is successful when:**

1. No database column errors in logs
2. Users can add videos without "Server error"
3. Users can register NFC chips without errors
4. Integration tests pass
5. Application stable for 24 hours

---

**Deployment Date:** `_______________________`

**Deployed By:** `_______________________`

**Option Used:** [ ] New Deployment  [ ] Migration

**Outcome:** [ ] Success  [ ] Rollback Required  [ ] Issues (describe below)

**Notes:**
```
[Add any notes about the deployment here]
```
