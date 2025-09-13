#!/bin/bash

# Script to generate .htpasswd file for basic authentication
# Usage: ./generate-htpasswd.sh [username]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}IONOS Basic Authentication Setup${NC}"
echo -e "${GREEN}==================================${NC}\n"

# Check for htpasswd command
if ! command -v htpasswd &> /dev/null; then
    echo -e "${YELLOW}htpasswd command not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y apache2-utils
        elif command -v yum &> /dev/null; then
            sudo yum install -y httpd-tools
        else
            echo -e "${RED}Unable to install htpasswd. Please install apache2-utils or httpd-tools manually.${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - htpasswd should be available by default
        echo -e "${GREEN}htpasswd is already available on macOS${NC}"
    else
        echo -e "${RED}Unsupported OS. Please install htpasswd manually.${NC}"
        exit 1
    fi
fi

# Get username
USERNAME=${1:-"admin"}
echo -e "Creating password for user: ${YELLOW}$USERNAME${NC}"

# Check if .htpasswd exists
if [ -f ".htpasswd" ]; then
    echo -e "${YELLOW}Warning: .htpasswd file already exists${NC}"
    read -p "Do you want to (a)dd a new user or (r)eplace the file? [a/r]: " choice
    
    case $choice in
        r|R)
            echo -e "${YELLOW}Creating new .htpasswd file...${NC}"
            htpasswd -c .htpasswd "$USERNAME"
            ;;
        *)
            echo -e "${YELLOW}Adding user to existing .htpasswd...${NC}"
            htpasswd .htpasswd "$USERNAME"
            ;;
    esac
else
    echo -e "${GREEN}Creating new .htpasswd file...${NC}"
    htpasswd -c .htpasswd "$USERNAME"
fi

# Verify file was created
if [ -f ".htpasswd" ]; then
    echo -e "\n${GREEN}✓ .htpasswd file created successfully${NC}"
    
    # Check if .gitignore contains .htpasswd
    if [ -f ".gitignore" ]; then
        if ! grep -q "^\.htpasswd$" .gitignore; then
            echo -e "${YELLOW}Adding .htpasswd to .gitignore...${NC}"
            echo -e "\n# Basic auth credentials\n.htpasswd" >> .gitignore
            echo -e "${GREEN}✓ Added .htpasswd to .gitignore${NC}"
        else
            echo -e "${GREEN}✓ .htpasswd is already in .gitignore${NC}"
        fi
    fi
    
    # Display instructions
    echo -e "\n${GREEN}Next Steps:${NC}"
    echo "1. Update ionos.config.json to enable basic auth for your environment:"
    echo "   \"basicAuth\": {"
    echo "     \"enabled\": true,"
    echo "     \"username\": \"$USERNAME\""
    echo "   }"
    echo ""
    echo "2. The deployment script will automatically upload .htpasswd when deploying"
    echo ""
    echo "3. To add more users, run: htpasswd .htpasswd <username>"
    echo ""
    echo -e "${YELLOW}⚠ Security Notice:${NC}"
    echo "- Never commit .htpasswd to version control"
    echo "- Use strong passwords"
    echo "- Rotate credentials regularly"
    
else
    echo -e "${RED}Error: Failed to create .htpasswd file${NC}"
    exit 1
fi