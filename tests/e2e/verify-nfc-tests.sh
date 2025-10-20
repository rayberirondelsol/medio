#!/bin/bash

# Verification Script for NFC Chip Registration E2E Tests
# Checks test file syntax, structure, and completeness

set -e

echo "=========================================="
echo "NFC Chip Registration E2E Test Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TEST_FILE="tests/e2e/nfc-chip-registration.spec.js"
README_FILE="tests/e2e/NFC-CHIP-REGISTRATION-E2E-README.md"
SUMMARY_FILE="tests/e2e/TEST-SUMMARY-T068-T075.md"

# Check if files exist
echo "1. Checking file existence..."
if [ -f "$TEST_FILE" ]; then
  echo -e "${GREEN}✓${NC} Test file exists: $TEST_FILE"
else
  echo -e "${RED}✗${NC} Test file NOT found: $TEST_FILE"
  exit 1
fi

if [ -f "$README_FILE" ]; then
  echo -e "${GREEN}✓${NC} README exists: $README_FILE"
else
  echo -e "${YELLOW}⚠${NC} README NOT found: $README_FILE"
fi

if [ -f "$SUMMARY_FILE" ]; then
  echo -e "${GREEN}✓${NC} Summary exists: $SUMMARY_FILE"
else
  echo -e "${YELLOW}⚠${NC} Summary NOT found: $SUMMARY_FILE"
fi

echo ""

# Check JavaScript syntax
echo "2. Validating JavaScript syntax..."
if node -c "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} JavaScript syntax is valid"
else
  echo -e "${RED}✗${NC} JavaScript syntax error found"
  exit 1
fi

echo ""

# Count test scenarios
echo "3. Checking test scenario coverage..."
TEST_COUNT=$(grep -c "test('T0" "$TEST_FILE" || true)

if [ "$TEST_COUNT" -eq 8 ]; then
  echo -e "${GREEN}✓${NC} All 8 test scenarios found (T068-T075)"
else
  echo -e "${RED}✗${NC} Expected 8 tests, found $TEST_COUNT"
  exit 1
fi

echo ""

# Verify individual tests exist
echo "4. Verifying individual test scenarios..."
for i in 068 069 070 071 072 073 074 075; do
  if grep -q "test('T$i" "$TEST_FILE"; then
    echo -e "${GREEN}✓${NC} T$i found"
  else
    echo -e "${RED}✗${NC} T$i NOT found"
    exit 1
  fi
done

echo ""

# Check helper functions
echo "5. Checking helper functions..."
HELPERS=("cleanupChips" "registerChipViaAPI" "logout" "loginAs" "navigateToNFCPage")

for helper in "${HELPERS[@]}"; do
  if grep -q "function $helper\|async function $helper" "$TEST_FILE"; then
    echo -e "${GREEN}✓${NC} Helper function: $helper"
  else
    echo -e "${YELLOW}⚠${NC} Helper function not found: $helper (may be arrow function)"
  fi
done

echo ""

# Check test hooks
echo "6. Checking test lifecycle hooks..."
if grep -q "test.beforeEach" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} beforeEach hook found"
else
  echo -e "${RED}✗${NC} beforeEach hook NOT found"
  exit 1
fi

if grep -q "test.afterEach" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} afterEach hook found"
else
  echo -e "${RED}✗${NC} afterEach hook NOT found"
  exit 1
fi

echo ""

# Check critical security tests
echo "7. Verifying critical security tests..."

# T070: Cross-user duplicate
if grep -q "Cross-user duplicate" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} T070: Cross-user duplicate registration test (CRITICAL)"
else
  echo -e "${RED}✗${NC} T070: Cross-user test NOT found"
  exit 1
fi

# T073: Max chip limit
if grep -q "Maximum chip limit" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} T073: Maximum chip limit enforcement (CRITICAL)"
else
  echo -e "${RED}✗${NC} T073: Max limit test NOT found"
  exit 1
fi

echo ""

# Check for proper error handling
echo "8. Checking error handling patterns..."
if grep -q "try.*catch" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} Error handling (try/catch) found"
else
  echo -e "${YELLOW}⚠${NC} No try/catch blocks found"
fi

if grep -q "\.catch\(" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} Promise error handling (.catch) found"
else
  echo -e "${YELLOW}⚠${NC} No .catch() error handling found"
fi

echo ""

# Check for ARIA compatibility
echo "9. Checking ARIA/accessibility support..."
if grep -q "role=\"alert\"\|role=\"dialog\"\|role=\"status\"" "$TEST_FILE"; then
  echo -e "${GREEN}✓${NC} ARIA role selectors found"
else
  echo -e "${YELLOW}⚠${NC} No ARIA role selectors found"
fi

echo ""

# Count lines of code
echo "10. Code statistics..."
LINES=$(wc -l < "$TEST_FILE")
echo -e "${GREEN}✓${NC} Total lines: $LINES"

if [ "$LINES" -lt 500 ]; then
  echo -e "${YELLOW}⚠${NC} Test file seems short (< 500 lines)"
elif [ "$LINES" -gt 700 ]; then
  echo -e "${YELLOW}⚠${NC} Test file is quite long (> 700 lines)"
else
  echo -e "${GREEN}✓${NC} Test file length is appropriate (500-700 lines)"
fi

echo ""

# Final summary
echo "=========================================="
echo -e "${GREEN}Verification Complete!${NC}"
echo "=========================================="
echo ""
echo "Test file: $TEST_FILE"
echo "Test scenarios: $TEST_COUNT/8"
echo "Lines of code: $LINES"
echo ""
echo "Next steps:"
echo "1. Create test user: parent2@example.com"
echo "2. Run tests: npm run test:e2e $TEST_FILE"
echo "3. Review report: npx playwright show-report"
echo ""
echo -e "${GREEN}All checks passed!${NC}"
