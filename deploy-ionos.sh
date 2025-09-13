#!/bin/bash

# IONOS Deployment Script
# This script deploys the React application to IONOS hosting

set -e
set -o pipefail

# Cleanup function
cleanup() {
    local exit_code=$?
    if [ -f "deploy.tar.gz" ]; then
        echo -e "${YELLOW}Cleaning up temporary files...${NC}"
        rm -f deploy.tar.gz
    fi
    exit $exit_code
}

# Set trap for cleanup on exit or error
trap cleanup EXIT

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

# Parse configuration using node with error handling
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Use jq if available, otherwise fall back to node
if command -v jq &> /dev/null; then
    DOMAIN=$(jq -r ".environments.$ENV.domain" "$CONFIG_FILE")
    REMOTE_PATH=$(jq -r ".environments.$ENV.remotePath" "$CONFIG_FILE")
    SFTP_HOST=$(jq -r ".environments.$ENV.sftpHost" "$CONFIG_FILE")
    SFTP_PORT=$(jq -r ".environments.$ENV.sftpPort" "$CONFIG_FILE")
    BASIC_AUTH_ENABLED=$(jq -r ".environments.$ENV.basicAuth.enabled" "$CONFIG_FILE")
else
    DOMAIN=$(node -e "try { const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].domain); } catch(e) { console.log('undefined'); }")
    REMOTE_PATH=$(node -e "try { const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].remotePath); } catch(e) { console.log('undefined'); }")
    SFTP_HOST=$(node -e "try { const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpHost); } catch(e) { console.log('undefined'); }")
    SFTP_PORT=$(node -e "try { const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].sftpPort); } catch(e) { console.log('undefined'); }")
    BASIC_AUTH_ENABLED=$(node -e "try { const config = require('./$CONFIG_FILE'); console.log(config.environments['$ENV'].basicAuth.enabled); } catch(e) { console.log('false'); }")
fi

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

# Pre-flight checks
echo -e "${GREEN}Running pre-flight checks...${NC}"

# Check for required environment variables
REQUIRED_VARS=("IONOS_SFTP_USERNAME" "IONOS_SSH_KEY_PATH")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var environment variable not set${NC}"
        exit 1
    fi
done

# Validate SSH key exists and has correct permissions
if [ ! -f "$IONOS_SSH_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $IONOS_SSH_KEY_PATH${NC}"
    exit 1
fi

# Check and fix SSH key permissions
KEY_PERMS=$(stat -c "%a" "$IONOS_SSH_KEY_PATH" 2>/dev/null || stat -f "%OLp" "$IONOS_SSH_KEY_PATH" 2>/dev/null)
if [ "$KEY_PERMS" != "600" ]; then
    echo -e "${YELLOW}Fixing SSH key permissions...${NC}"
    chmod 600 "$IONOS_SSH_KEY_PATH"
fi

# Validate configuration values
if [ -z "$DOMAIN" ] || [ "$DOMAIN" == "undefined" ]; then
    echo -e "${RED}Error: Invalid domain configuration for environment $ENV${NC}"
    exit 1
fi

if [ -z "$REMOTE_PATH" ] || [ "$REMOTE_PATH" == "undefined" ]; then
    echo -e "${RED}Error: Invalid remote path configuration for environment $ENV${NC}"
    exit 1
fi

echo -e "${GREEN}Pre-flight checks passed!${NC}"

# Deploy via SFTP
echo -e "${GREEN}Deploying to IONOS...${NC}"

# Create deployment package
tar -czf deploy.tar.gz -C build .

# Upload using sftp with error handling
echo -e "${YELLOW}Uploading deployment package...${NC}"
if ! sftp -P $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" -o StrictHostKeyChecking=no "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
put deploy.tar.gz
bye
EOF
then
    echo -e "${RED}Error: SFTP upload failed${NC}"
    exit 1
fi

# Extract on server and cleanup with error handling
echo -e "${YELLOW}Extracting deployment package on server...${NC}"
if ! ssh -p $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" -o StrictHostKeyChecking=no "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
# Backup existing deployment if it exists
if [ -d "backup" ]; then
    rm -rf backup.old
    mv backup backup.old
fi
if [ -f "index.html" ]; then
    mkdir -p backup
    cp -r . backup/ 2>/dev/null || true
fi
# Extract new deployment
tar -xzf deploy.tar.gz
rm deploy.tar.gz
EOF
then
    echo -e "${RED}Error: Failed to extract deployment on server${NC}"
    exit 1
fi

# Upload .htaccess with error handling
echo -e "${GREEN}Uploading .htaccess configuration...${NC}"
if ! sftp -P $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" -o StrictHostKeyChecking=no "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
put .htaccess
bye
EOF
then
    echo -e "${RED}Error: Failed to upload .htaccess${NC}"
    exit 1
fi

# Upload .htpasswd for basic auth if needed
if [ "$BASIC_AUTH_ENABLED" == "true" ] && [ -f ".htpasswd" ]; then
    echo -e "${GREEN}Uploading .htpasswd for basic authentication...${NC}"
    if ! sftp -P $SFTP_PORT -i "$IONOS_SSH_KEY_PATH" -o StrictHostKeyChecking=no "$IONOS_SFTP_USERNAME@$SFTP_HOST" <<EOF
cd $REMOTE_PATH
put .htpasswd
bye
EOF
    then
        echo -e "${YELLOW}Warning: Failed to upload .htpasswd${NC}"
    fi
fi

# Verify deployment
echo -e "${GREEN}Verifying deployment...${NC}"

# Wait a moment for the deployment to be accessible
sleep 2

# Check if site is accessible
SITE_URL="https://$DOMAIN"
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$SITE_URL" --max-time 10)
    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
        echo -e "${GREEN}✓ Site is accessible (HTTP $HTTP_STATUS)${NC}"
    else
        echo -e "${YELLOW}⚠ Site returned HTTP $HTTP_STATUS - please verify manually${NC}"
    fi
    
    # Verify HTTPS redirect
    HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" --max-time 10)
    if [ "$HTTP_REDIRECT" == "301" ] || [ "$HTTP_REDIRECT" == "302" ]; then
        echo -e "${GREEN}✓ HTTP to HTTPS redirect is working${NC}"
    else
        echo -e "${YELLOW}⚠ HTTP to HTTPS redirect may not be configured properly${NC}"
    fi
else
    echo -e "${YELLOW}Skipping verification (curl not available)${NC}"
fi

echo -e "\n${GREEN}Deployment completed successfully!${NC}"
echo -e "Site URL: $SITE_URL"

if [ "$BASIC_AUTH_ENABLED" == "true" ]; then
    echo -e "${YELLOW}Note: Basic authentication is enabled for this environment${NC}"
fi

echo -e "\n${GREEN}Deployment Summary:${NC}"
echo "- Environment: $ENV"
echo "- Domain: $DOMAIN"
echo "- Remote Path: $REMOTE_PATH"
echo "- Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"