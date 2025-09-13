#!/bin/bash

# IONOS Deployment Script
# This script deploys the React application to IONOS hosting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-production}
CONFIG_FILE="ionos.config.json"

echo -e "${GREEN}Starting IONOS deployment...${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file $CONFIG_FILE not found${NC}"
    exit 1
fi

# Parse configuration using node
DOMAIN=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].domain)")
REMOTE_PATH=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].remotePath)")
SFTP_HOST=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpHost)")
SFTP_PORT=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpPort)")

echo -e "${YELLOW}Deploying to environment: $ENV${NC}"
echo "Domain: $DOMAIN"
echo "Remote Path: $REMOTE_PATH"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm ci

# Run tests
echo -e "${GREEN}Running tests...${NC}"
npm test -- --ci --coverage --watchAll=false

# Build the application
echo -e "${GREEN}Building application...${NC}"
npm run build

# Check for required environment variables
if [ -z "$IONOS_SFTP_USERNAME" ]; then
    echo -e "${RED}Error: IONOS_SFTP_USERNAME environment variable not set${NC}"
    exit 1
fi

if [ -z "$IONOS_SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: IONOS_SSH_KEY_PATH environment variable not set${NC}"
    exit 1
fi

# Deploy via SFTP
echo -e "${GREEN}Deploying to IONOS...${NC}"

# Create deployment package
tar -czf deploy.tar.gz -C build .

# Upload using sftp
sftp -P $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
put deploy.tar.gz
bye
EOF

# Extract on server and cleanup
ssh -p $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
tar -xzf deploy.tar.gz
rm deploy.tar.gz
EOF

# Upload .htaccess
echo -e "${GREEN}Uploading .htaccess configuration...${NC}"
sftp -P $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
put .htaccess
bye
EOF

# Cleanup local files
rm deploy.tar.gz

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "Site URL: https://$DOMAIN"