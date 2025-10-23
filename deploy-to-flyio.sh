#!/bin/bash
#
# Automated Deployment Script for Fly.io
# Deploys database schema fix to production
#
# Usage: ./deploy-to-flyio.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_APP="medio-backend"
FRONTEND_APP="medio-react-app"
DB_APP="medio-db"  # Adjust if different

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Medio Fly.io Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 0: Verify flyctl is installed
echo -e "${YELLOW}[Step 0]${NC} Verifying flyctl installation..."
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl is not installed!${NC}"
    echo "Please install it: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi
echo -e "${GREEN}✓ flyctl is installed${NC}"
echo ""

# Step 1: Verify we're on the right branch
echo -e "${YELLOW}[Step 1]${NC} Verifying git branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV" ]; then
    echo -e "${RED}❌ Wrong branch: $CURRENT_BRANCH${NC}"
    echo "Please checkout: git checkout claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV"
    exit 1
fi
echo -e "${GREEN}✓ On correct branch: $CURRENT_BRANCH${NC}"
echo ""

# Step 2: Pull latest changes
echo -e "${YELLOW}[Step 2]${NC} Pulling latest changes..."
git pull origin claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV
echo -e "${GREEN}✓ Latest changes pulled${NC}"
echo ""

# Step 3: Check if database migration is needed
echo -e "${YELLOW}[Step 3]${NC} Checking if database migration is needed..."
echo "Connecting to database..."

# Create temporary SQL script to check schema
cat > /tmp/check_schema.sql <<EOF
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
EOF

echo "Running schema check..."
MIGRATION_NEEDED=$(flyctl postgres connect -a $DB_APP < /tmp/check_schema.sql 2>/dev/null | grep -c "user_uuid" || echo "0")
rm /tmp/check_schema.sql

if [ "$MIGRATION_NEEDED" != "0" ]; then
    echo -e "${YELLOW}⚠️  Old schema detected (user_uuid column exists)${NC}"
    echo -e "${YELLOW}⚠️  Database migration is REQUIRED${NC}"

    # Ask for confirmation
    echo ""
    echo -e "${RED}WARNING: This will modify the production database!${NC}"
    echo -e "The migration will:"
    echo "  - Rename user_uuid → id"
    echo "  - Rename platform_uuid → id"
    echo "  - Rename all foreign keys (user_uuid → user_id, etc.)"
    echo "  - Run in a transaction (automatic rollback on error)"
    echo ""
    read -p "Do you want to proceed with migration? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi

    # Step 4: Create database backup
    echo ""
    echo -e "${YELLOW}[Step 4]${NC} Creating database backup..."
    BACKUP_ID=$(flyctl postgres backup create -a $DB_APP 2>&1 | grep -oE '[a-f0-9-]+' | head -1)
    if [ -z "$BACKUP_ID" ]; then
        echo -e "${RED}❌ Failed to create backup${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Backup created: $BACKUP_ID${NC}"
    echo "You can restore with: flyctl postgres backup restore $BACKUP_ID -a $DB_APP"
    echo ""

    # Step 5: Run database migration
    echo -e "${YELLOW}[Step 5]${NC} Running database migration..."
    echo "This will take ~10 seconds..."

    if flyctl postgres connect -a $DB_APP < backend/migrations/001_fix_column_naming.sql; then
        echo -e "${GREEN}✓ Migration completed successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed!${NC}"
        echo "The database has been automatically rolled back (transaction safety)"
        echo "You can restore the backup with: flyctl postgres backup restore $BACKUP_ID -a $DB_APP"
        exit 1
    fi

    # Step 6: Verify migration
    echo -e "${YELLOW}[Step 6]${NC} Verifying migration..."
    cat > /tmp/verify_schema.sql <<EOF
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users';
EOF

    VERIFICATION=$(flyctl postgres connect -a $DB_APP < /tmp/verify_schema.sql 2>/dev/null | grep -c "^id$" || echo "0")
    rm /tmp/verify_schema.sql

    if [ "$VERIFICATION" != "0" ]; then
        echo -e "${GREEN}✓ Migration verified: Column 'id' exists${NC}"
    else
        echo -e "${RED}❌ Migration verification failed!${NC}"
        echo "Expected to find 'id' column but didn't. Rolling back..."
        flyctl postgres backup restore $BACKUP_ID -a $DB_APP
        exit 1
    fi
else
    echo -e "${GREEN}✓ Database schema is already correct (no migration needed)${NC}"
    echo "Skipping backup and migration steps"
fi

echo ""

# Step 7: Deploy backend
echo -e "${YELLOW}[Step 7]${NC} Deploying backend to Fly.io..."
cd backend
if flyctl deploy --remote-only -a $BACKEND_APP; then
    echo -e "${GREEN}✓ Backend deployed successfully${NC}"
else
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 8: Wait for backend to be healthy
echo -e "${YELLOW}[Step 8]${NC} Waiting for backend to be healthy..."
sleep 10
BACKEND_STATUS=$(flyctl status -a $BACKEND_APP 2>/dev/null | grep -c "running" || echo "0")
if [ "$BACKEND_STATUS" != "0" ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend status unclear, continuing...${NC}"
fi
echo ""

# Step 9: Deploy frontend
echo -e "${YELLOW}[Step 9]${NC} Deploying frontend to Fly.io..."
if flyctl deploy -a $FRONTEND_APP; then
    echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
else
    echo -e "${RED}❌ Frontend deployment failed${NC}"
    exit 1
fi
echo ""

# Step 10: Wait for frontend to be healthy
echo -e "${YELLOW}[Step 10]${NC} Waiting for frontend to be healthy..."
sleep 10
FRONTEND_STATUS=$(flyctl status -a $FRONTEND_APP 2>/dev/null | grep -c "running" || echo "0")
if [ "$FRONTEND_STATUS" != "0" ]; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend status unclear, continuing...${NC}"
fi
echo ""

# Step 11: Run diagnostic test
echo -e "${YELLOW}[Step 11]${NC} Running diagnostic test..."
echo "Testing production API endpoints..."

if node test-production-api.js 2>&1 | grep -q "Video created successfully"; then
    echo -e "${GREEN}✓ Video creation works!${NC}"
else
    echo -e "${RED}❌ Video creation test failed${NC}"
    echo "Check logs: flyctl logs -a $BACKEND_APP"
fi

if node test-production-api.js 2>&1 | grep -q "NFC chip registered successfully"; then
    echo -e "${GREEN}✓ NFC chip registration works!${NC}"
else
    echo -e "${RED}❌ NFC chip registration test failed${NC}"
    echo "Check logs: flyctl logs -a $BACKEND_APP"
fi

echo ""

# Step 12: Check backend logs for errors
echo -e "${YELLOW}[Step 12]${NC} Checking backend logs for errors..."
ERROR_COUNT=$(flyctl logs -a $BACKEND_APP --lines 50 2>/dev/null | grep -ic "error\|failed" || echo "0")
if [ "$ERROR_COUNT" = "0" ]; then
    echo -e "${GREEN}✓ No errors in recent logs${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ERROR_COUNT potential errors in logs${NC}"
    echo "Review with: flyctl logs -a $BACKEND_APP"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test in browser: https://medio-react-app.fly.dev"
echo "2. Try adding a video (should work now!)"
echo "3. Try registering an NFC chip (should work now!)"
echo "4. Monitor logs: flyctl logs -a $BACKEND_APP --follow"
echo ""
echo "If something went wrong:"
echo "- Check logs: flyctl logs -a $BACKEND_APP"
echo "- Run diagnostic: node test-production-api.js"
if [ "$MIGRATION_NEEDED" != "0" ]; then
    echo "- Restore backup: flyctl postgres backup restore $BACKUP_ID -a $DB_APP"
fi
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
