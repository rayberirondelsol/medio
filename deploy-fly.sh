#!/bin/bash

# Fly.io Deployment Script
# This script helps deploy the React application to Fly.io

set -e
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="medio-react-app"
REGION="iad"  # US East

echo -e "${GREEN}🚀 Fly.io Deployment Script${NC}"
echo -e "${BLUE}=================================${NC}"

# Function to check if flyctl is installed
check_flyctl() {
    if ! command -v flyctl &> /dev/null; then
        echo -e "${RED}❌ flyctl is not installed${NC}"
        echo -e "${YELLOW}Install it with: curl -L https://fly.io/install.sh | sh${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ flyctl is installed${NC}"
}

# Function to check if user is logged in
check_auth() {
    if ! flyctl auth whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Fly.io${NC}"
        echo -e "${YELLOW}Run: flyctl auth login${NC}"
        exit 1
    fi

    USER=$(flyctl auth whoami 2>/dev/null)
    echo -e "${GREEN}✅ Logged in as: $USER${NC}"
}

# Function to check if app exists
check_app() {
    if flyctl apps list | grep -q "$APP_NAME"; then
        echo -e "${GREEN}✅ App '$APP_NAME' exists${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  App '$APP_NAME' does not exist${NC}"
        return 1
    fi
}

# Function to create app
create_app() {
    echo -e "${YELLOW}Creating new app...${NC}"

    if [ -f "fly.toml" ]; then
        echo -e "${GREEN}✅ Using existing fly.toml${NC}"
        flyctl launch --no-deploy --copy-config --name "$APP_NAME" --region "$REGION"
    else
        flyctl launch --no-deploy --name "$APP_NAME" --region "$REGION"
    fi

    echo -e "${GREEN}✅ App created successfully${NC}"
}

# Function to deploy
deploy() {
    echo -e "${YELLOW}Starting deployment...${NC}"

    # Pre-deployment checks
    echo -e "${BLUE}Running pre-deployment checks...${NC}"

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi

    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        echo -e "${RED}❌ Dockerfile not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

    # Install dependencies and run tests
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm ci

    echo -e "${BLUE}Running tests...${NC}"
    npm test -- --ci --coverage --watchAll=false

    echo -e "${BLUE}Building application...${NC}"
    npm run build

    # Deploy to Fly.io
    echo -e "${BLUE}Deploying to Fly.io...${NC}"
    flyctl deploy

    echo -e "${GREEN}✅ Deployment completed successfully${NC}"

    # Show app info
    echo -e "${BLUE}App Information:${NC}"
    flyctl info

    # Show app URL
    APP_URL=$(flyctl info --json | jq -r '.Hostname' 2>/dev/null || echo "$APP_NAME.fly.dev")
    echo -e "${GREEN}🌐 App URL: https://$APP_URL${NC}"
}

# Function to show status
status() {
    echo -e "${BLUE}App Status:${NC}"
    flyctl status

    echo -e "\n${BLUE}Recent Logs:${NC}"
    flyctl logs --lines 20
}

# Function to generate deploy token
generate_token() {
    echo -e "${YELLOW}Generating deploy token for CI/CD...${NC}"

    TOKEN=$(flyctl tokens create deploy -x 999999h)

    echo -e "${GREEN}✅ Deploy token generated${NC}"
    echo -e "${BLUE}Add this to your GitHub repository secrets as 'FLY_API_TOKEN':${NC}"
    echo -e "${YELLOW}$TOKEN${NC}"
    echo -e "\n${BLUE}Steps to add the secret:${NC}"
    echo "1. Go to GitHub repository → Settings → Secrets and variables → Actions"
    echo "2. Click 'New repository secret'"
    echo "3. Name: FLY_API_TOKEN"
    echo "4. Value: $TOKEN"
}

# Function to open dashboard
dashboard() {
    echo -e "${BLUE}Opening Fly.io dashboard...${NC}"
    flyctl dashboard
}

# Main script logic
case "${1:-help}" in
    "init")
        echo -e "${BLUE}Initializing Fly.io deployment...${NC}"
        check_flyctl
        check_auth
        if ! check_app; then
            create_app
        fi
        generate_token
        echo -e "${GREEN}🎉 Initialization complete! Push your code to trigger deployment.${NC}"
        ;;
    "deploy")
        echo -e "${BLUE}Deploying application...${NC}"
        check_flyctl
        check_auth
        if ! check_app; then
            echo -e "${RED}❌ App does not exist. Run '$0 init' first${NC}"
            exit 1
        fi
        deploy
        ;;
    "status")
        check_flyctl
        check_auth
        status
        ;;
    "token")
        check_flyctl
        check_auth
        generate_token
        ;;
    "dashboard")
        check_flyctl
        check_auth
        dashboard
        ;;
    "logs")
        check_flyctl
        check_auth
        echo -e "${BLUE}Streaming logs (Ctrl+C to stop):${NC}"
        flyctl logs
        ;;
    "help"|*)
        echo -e "${BLUE}Fly.io Deployment Script Usage:${NC}"
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo "  init      - Initialize Fly.io app and generate deploy token"
        echo "  deploy    - Build and deploy the application"
        echo "  status    - Show application status and recent logs"
        echo "  token     - Generate a new deploy token for CI/CD"
        echo "  dashboard - Open Fly.io dashboard in browser"
        echo "  logs      - Stream live application logs"
        echo "  help      - Show this help message"
        echo ""
        echo -e "${YELLOW}Examples:${NC}"
        echo "  $0 init     # First time setup"
        echo "  $0 deploy   # Deploy current code"
        echo "  $0 status   # Check app status"
        echo ""
        echo -e "${BLUE}For more information, see FLY_DEPLOYMENT.md${NC}"
        ;;
esac