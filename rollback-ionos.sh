#!/bin/bash

# IONOS Rollback Script
# Rollback to the previous deployment backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-production}
CONFIG_FILE="ionos.config.json"

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}IONOS Deployment Rollback${NC}"
echo -e "${YELLOW}================================${NC}\n"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# Parse configuration
if command -v jq &> /dev/null; then
    DOMAIN=$(jq -r ".environments.$ENV.domain" "$CONFIG_FILE")
    REMOTE_PATH=$(jq -r ".environments.$ENV.remotePath" "$CONFIG_FILE")
    SFTP_HOST=$(jq -r ".environments.$ENV.sftpHost" "$CONFIG_FILE")
    SFTP_PORT=$(jq -r ".environments.$ENV.sftpPort" "$CONFIG_FILE")
else
    DOMAIN=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].domain)")
    REMOTE_PATH=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].remotePath)")
    SFTP_HOST=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpHost)")
    SFTP_PORT=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpPort)")
fi

echo -e "${BLUE}Environment: $ENV${NC}"
echo -e "${BLUE}Domain: $DOMAIN${NC}"
echo -e "${BLUE}Remote Path: $REMOTE_PATH${NC}\n"

# Check for required environment variables
if [ -z "$IONOS_SFTP_USERNAME" ]; then
    echo -e "${RED}Error: IONOS_SFTP_USERNAME environment variable not set${NC}"
    exit 1
fi

if [ -z "$IONOS_SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: IONOS_SSH_KEY_PATH environment variable not set${NC}"
    exit 1
fi

# Confirm rollback
echo -e "${YELLOW}⚠ Warning: This will rollback the deployment to the previous backup${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

echo -e "\n${GREEN}Starting rollback...${NC}"

# Perform rollback on server
ssh -p $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" -o StrictHostKeyChecking=no "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<'EOF'
set -e

cd '$REMOTE_PATH'

# Check if backup exists
if [ ! -d "backup" ]; then
    echo -e "${RED}Error: No backup directory found${NC}"
    echo "Cannot perform rollback without a backup"
    exit 1
fi

echo "Creating rollback point from current deployment..."
# Save current deployment as failed
if [ -d "current_failed" ]; then
    rm -rf current_failed.old
    mv current_failed current_failed.old
fi

# Create list of files to backup (excluding backup directories)
files_to_backup=$(ls -A | grep -v '^backup$' | grep -v '^backup\.old$' | grep -v '^current_failed')

if [ -n "$files_to_backup" ]; then
    mkdir -p current_failed
    for file in $files_to_backup; do
        mv "$file" current_failed/
    done
fi

echo "Restoring from backup..."
# Restore from backup
cp -r backup/* .
cp -r backup/.* . 2>/dev/null || true

echo "Rollback completed successfully!"

# Show restored version info if available
if [ -f "version.txt" ]; then
    echo "Restored version: $(cat version.txt)"
fi

if [ -f "build-info.json" ]; then
    echo "Build info: $(cat build-info.json | head -1)"
fi
EOF

ROLLBACK_STATUS=$?

if [ $ROLLBACK_STATUS -eq 0 ]; then
    echo -e "\n${GREEN}✓ Rollback completed successfully!${NC}"
    echo -e "${GREEN}Site has been restored to the previous version${NC}"
    echo -e "URL: ${BLUE}https://$DOMAIN${NC}\n"
    
    # Verify site is accessible
    if command -v curl &> /dev/null; then
        echo -e "${YELLOW}Verifying site accessibility...${NC}"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "https://$DOMAIN" --max-time 10)
        
        if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
            echo -e "${GREEN}✓ Site is accessible (HTTP $HTTP_STATUS)${NC}"
        else
            echo -e "${YELLOW}⚠ Site returned HTTP $HTTP_STATUS - please verify manually${NC}"
        fi
    fi
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Verify the site is working correctly"
    echo "2. Check application logs for any issues"
    echo "3. Investigate the cause of the deployment failure"
    echo "4. The failed deployment is saved in 'current_failed/' directory on the server"
else
    echo -e "\n${RED}✗ Rollback failed!${NC}"
    echo -e "${RED}Please check the server manually${NC}"
    exit 1
fi