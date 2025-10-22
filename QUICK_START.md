# Quick Start: Deploying the Database Schema Fix

## 🎯 Goal
Fix production errors: "Server error while saving video" and "NFC chip registration fails"

---

## ⚡ Quick Overview

**Problem:** Database column names don't match backend code
**Solution:** Fixed `init.sql` + migration script
**Impact:** 100% failure rate → 0% failure rate (expected)

---

## 🚀 Choose Your Path

### Path A: Fresh Start (Destroys Data ⚠️)
**Use if:** You want to start with a clean database

```bash
git pull
docker-compose down -v
docker-compose up -d
npm run test:integration:local
```

**Downtime:** ~2 minutes
**Risk:** ⚠️ ALL DATA LOST

---

### Path B: Migrate Production (Keeps Data ✅)
**Use if:** You want to keep existing users/videos/chips

```bash
# 1. Backup
flyctl postgres backup create --app medio-db

# 2. Check if migration needed
flyctl postgres connect --app medio-db
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
# Returns row? → Migration needed
# No rows? → Skip migration

# 3. Run migration (if needed)
\i /path/to/medio/backend/migrations/001_fix_column_naming.sql

# 4. Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
# Should see: id (not user_uuid!)

# 5. Deploy code
cd backend && flyctl deploy --remote-only
cd .. && flyctl deploy

# 6. Test
npm run test:integration:production
```

**Downtime:** ~10 seconds
**Risk:** ✅ LOW (transaction-safe, can rollback)

---

## 📚 Complete Documentation

| Document | Purpose |
|----------|---------|
| **DEPLOYMENT_CHECKLIST.md** | Step-by-step deployment guide with checkboxes |
| **PR_DESCRIPTION.md** | Complete PR description for review |
| **DIAGNOSTIC_REPORT.md** | Technical analysis of root cause |
| **backend/migrations/README.md** | Migration instructions |
| **tests/integration/README.md** | How to run integration tests |

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Run: `npm run test:integration:production`
- [ ] All tests pass
- [ ] Can add video in browser (no "Server error")
- [ ] Can register NFC chip in browser (no error)
- [ ] No errors in logs: `flyctl logs --app medio-backend`

---

## 🆘 If Something Goes Wrong

**Option 1: Restore from backup**
```bash
flyctl postgres backup restore <backup-id> --app medio-db
```

**Option 2: Contact support**
- Check logs: `flyctl logs --app medio-backend`
- Check migration guide: `backend/migrations/README.md`
- Run diagnostic: `node test-production-api.js`

---

## 📞 Quick Commands

```bash
# Local testing
docker-compose up -d
npm run test:integration:local

# Production testing
npm run test:integration:production

# Quick diagnostic
node test-production-api.js

# View logs
flyctl logs --app medio-backend
flyctl logs --app medio-react-app
```

---

**Branch:** `claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV`
**Ready to merge!** ✅
