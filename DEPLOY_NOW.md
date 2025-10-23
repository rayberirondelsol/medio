# Deploy Now: Automated Script

## 🚀 One-Command Deployment

**I created an automated script that does everything for you!**

```bash
# Pull this branch
git checkout claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV
git pull

# Run the deployment script
./deploy-to-flyio.sh
```

**That's it!** The script will:
- ✅ Check if database migration is needed
- ✅ Create automatic backup before migration
- ✅ Run migration (if needed)
- ✅ Deploy backend
- ✅ Deploy frontend
- ✅ Verify everything works
- ✅ Run diagnostic tests

**Estimated time:** 5-10 minutes

---

## 📋 What the Script Does

### Step-by-Step:

1. **Verifies** you're on the correct branch
2. **Checks** if database migration is needed
3. **Creates** database backup (if migration needed)
4. **Runs** migration (if needed)
5. **Verifies** migration succeeded
6. **Deploys** backend (`flyctl deploy --remote-only`)
7. **Deploys** frontend (`flyctl deploy`)
8. **Tests** video creation and NFC registration
9. **Shows** deployment summary

### Safety Features:

- ✅ **Transaction-safe migration** (automatic rollback on error)
- ✅ **Automatic backup** before migration
- ✅ **Verification checks** after each step
- ✅ **Error handling** with clear messages
- ✅ **Rollback instructions** if something fails

---

## 🛑 Before You Run

**Make sure:**
- [ ] You have `flyctl` installed
- [ ] You're logged in: `flyctl auth login`
- [ ] You have access to `medio-backend` and `medio-react-app`
- [ ] You're on this branch: `claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV`

---

## ⚡ Alternative: Manual Deployment

**If you prefer to run commands manually:**

### Option A: Fresh Database (Destroys Data!)

```bash
# Deploy backend (new schema will be created)
cd backend && flyctl deploy --remote-only

# Deploy frontend
cd .. && flyctl deploy

# Test
node test-production-api.js
```

### Option B: Migrate Existing Database

```bash
# 1. Backup
flyctl postgres backup create -a medio-db

# 2. Check if migration needed
flyctl postgres connect -a medio-db
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
# If returns row → Migration needed

# 3. Run migration
\i /path/to/medio/backend/migrations/001_fix_column_naming.sql

# 4. Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
# Should see: id (not user_uuid!)

# 5. Deploy
cd backend && flyctl deploy --remote-only
cd .. && flyctl deploy

# 6. Test
node test-production-api.js
```

---

## ✅ After Deployment

**Verify everything works:**

```bash
# 1. Run integration tests
npm run test:integration:production

# 2. Test in browser
open https://medio-react-app.fly.dev

# 3. Check logs
flyctl logs -a medio-backend

# 4. Try adding a video (should work!)
# 5. Try registering an NFC chip (should work!)
```

---

## 🆘 If Something Goes Wrong

**The script will show rollback instructions.**

**Common fixes:**

```bash
# Restore database from backup
flyctl postgres backup list -a medio-db
flyctl postgres backup restore <backup-id> -a medio-db

# Check logs
flyctl logs -a medio-backend
flyctl logs -a medio-react-app

# Run diagnostic
node test-production-api.js

# Rollback deployment
git revert HEAD
git push
flyctl deploy -a medio-backend
flyctl deploy -a medio-react-app
```

---

## 📊 Expected Output

**Successful deployment looks like:**

```
✓ flyctl is installed
✓ On correct branch
✓ Latest changes pulled
✓ Database schema is correct (or migration succeeded)
✓ Backend deployed successfully
✓ Backend is running
✓ Frontend deployed successfully
✓ Frontend is running
✓ Video creation works!
✓ NFC chip registration works!
✓ No errors in recent logs

✅ DEPLOYMENT COMPLETE!
```

---

## 🎯 Success Criteria

After deployment, you should be able to:

- [ ] Add videos without "Server error"
- [ ] Register NFC chips without errors
- [ ] All integration tests pass
- [ ] No database column errors in logs

---

**Ready?** Run: `./deploy-to-flyio.sh` 🚀
