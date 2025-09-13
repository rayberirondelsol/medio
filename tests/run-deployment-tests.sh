#!/bin/bash

# IONOS Deployment Test Runner
# Run deployment tests with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}IONOS Deployment Test Suite${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check for required dependencies
echo -e "${GREEN}Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install test dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "node_modules/jest" ]; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    npm install --save-dev jest @types/jest
fi

# Set test environment
TEST_ENV=${1:-staging}
export TEST_ENV

echo -e "${GREEN}Running tests for environment: ${YELLOW}$TEST_ENV${NC}\n"

# Check if configuration exists
if [ ! -f "ionos.config.json" ]; then
    echo -e "${RED}Error: ionos.config.json not found${NC}"
    exit 1
fi

# Run different test suites
echo -e "${BLUE}1. Configuration Tests${NC}"
npm test -- tests/ionos-deployment.test.js --testNamePattern="Configuration Validation" --verbose

echo -e "\n${BLUE}2. Connectivity Tests${NC}"
if [ -n "$IONOS_SFTP_USERNAME" ] && [ -n "$IONOS_SSH_KEY_PATH" ]; then
    npm test -- tests/ionos-deployment.test.js --testNamePattern="IONOS Connectivity" --verbose
else
    echo -e "${YELLOW}Skipping connectivity tests (credentials not configured)${NC}"
fi

echo -e "\n${BLUE}3. Deployment Script Tests${NC}"
npm test -- tests/ionos-deployment.test.js --testNamePattern="Deployment Script Validation" --verbose

# Only run live tests if explicitly requested
if [ "$2" == "--live" ]; then
    echo -e "\n${BLUE}4. Live Deployment Tests${NC}"
    echo -e "${YELLOW}Warning: These tests will check the live deployment${NC}"
    
    npm test -- tests/ionos-deployment.test.js --testNamePattern="Post-Deployment Health Checks" --verbose
    npm test -- tests/ionos-deployment.test.js --testNamePattern="React Router Functionality" --verbose
    npm test -- tests/ionos-deployment.test.js --testNamePattern="Basic Authentication" --verbose
else
    echo -e "\n${YELLOW}Skipping live deployment tests. Run with --live flag to include them.${NC}"
fi

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Test Suite Completed${NC}"
echo -e "${GREEN}================================${NC}"