#!/bin/bash

# NFC Chip Registration - Performance Testing Script
# Tests response times for all three NFC endpoints
# Requirements:
#   - POST /api/nfc/chips: < 2s
#   - GET /api/nfc/chips: < 1s
#   - DELETE /api/nfc/chips/:chipId: < 2s

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
CSRF_TOKEN=""
TEST_RESULTS=()

# Thresholds (in seconds)
THRESHOLD_POST=2.0
THRESHOLD_GET=1.0
THRESHOLD_DELETE=2.0

echo "======================================"
echo "NFC Performance Testing"
echo "======================================"
echo "API URL: $API_URL"
echo "POST threshold: ${THRESHOLD_POST}s"
echo "GET threshold: ${THRESHOLD_GET}s"
echo "DELETE threshold: ${THRESHOLD_DELETE}s"
echo ""

# Function to get CSRF token
get_csrf_token() {
  if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}ERROR: AUTH_TOKEN environment variable required${NC}"
    echo "Please set AUTH_TOKEN to a valid JWT token"
    echo "Example: export AUTH_TOKEN='your-jwt-token-here'"
    exit 1
  fi

  echo "Fetching CSRF token..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -b cookies.txt -c cookies.txt \
    "$API_URL/api/csrf-token")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}Failed to get CSRF token (HTTP $HTTP_CODE)${NC}"
    exit 1
  fi

  CSRF_TOKEN=$(echo "$BODY" | grep -o '"csrfToken":"[^"]*"' | sed 's/"csrfToken":"//' | sed 's/"//')

  if [ -z "$CSRF_TOKEN" ]; then
    echo -e "${RED}Failed to extract CSRF token from response${NC}"
    exit 1
  fi

  echo -e "${GREEN}CSRF token obtained${NC}"
}

# Function to test endpoint performance
test_endpoint() {
  local METHOD=$1
  local ENDPOINT=$2
  local DATA=$3
  local THRESHOLD=$4
  local TEST_NAME=$5

  echo ""
  echo "Testing: $TEST_NAME"
  echo "Endpoint: $METHOD $ENDPOINT"

  # Build curl command
  CURL_CMD="curl -s -w '\n%{time_total},%{http_code}' -X $METHOD"
  CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $AUTH_TOKEN'"
  CURL_CMD="$CURL_CMD -H 'Content-Type: application/json'"

  if [ "$METHOD" != "GET" ]; then
    CURL_CMD="$CURL_CMD -H 'X-CSRF-Token: $CSRF_TOKEN'"
  fi

  if [ -n "$DATA" ]; then
    CURL_CMD="$CURL_CMD -d '$DATA'"
  fi

  CURL_CMD="$CURL_CMD -b cookies.txt -c cookies.txt"
  CURL_CMD="$CURL_CMD '$API_URL$ENDPOINT'"

  # Execute request and capture timing
  RESPONSE=$(eval $CURL_CMD)

  # Extract timing and HTTP code
  TIME_TOTAL=$(echo "$RESPONSE" | tail -n1 | cut -d',' -f1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1 | cut -d',' -f2)
  BODY=$(echo "$RESPONSE" | sed '$d')

  # Evaluate result
  PASS=true
  if (( $(echo "$TIME_TOTAL > $THRESHOLD" | bc -l) )); then
    PASS=false
  fi

  # Store result
  if [ "$PASS" = true ]; then
    echo -e "  Response time: ${GREEN}${TIME_TOTAL}s${NC} (threshold: ${THRESHOLD}s)"
    echo -e "  HTTP status: ${GREEN}$HTTP_CODE${NC}"
    echo -e "  Result: ${GREEN}✓ PASS${NC}"
    TEST_RESULTS+=("$TEST_NAME|PASS|$TIME_TOTAL|$HTTP_CODE")
  else
    echo -e "  Response time: ${RED}${TIME_TOTAL}s${NC} (threshold: ${THRESHOLD}s)"
    echo -e "  HTTP status: ${RED}$HTTP_CODE${NC}"
    echo -e "  Result: ${RED}✗ FAIL${NC}"
    TEST_RESULTS+=("$TEST_NAME|FAIL|$TIME_TOTAL|$HTTP_CODE")
  fi

  # Return chip ID if this was a POST request (for cleanup)
  if [ "$METHOD" = "POST" ] && [ "$HTTP_CODE" = "201" ]; then
    CHIP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | sed 's/"id":"//' | sed 's/"//' | head -n1)
    echo "$CHIP_ID"
  fi
}

# Main test execution
main() {
  # Get CSRF token
  get_csrf_token

  # Test 1: POST /api/nfc/chips (with 20 existing chips for realistic load)
  echo ""
  echo "======================================"
  echo "Test 1: POST /api/nfc/chips"
  echo "======================================"

  # Generate random UID
  RANDOM_UID=$(printf "%02X:%02X:%02X:%02X:%02X:%02X:%02X" \
    $((RANDOM % 256)) $((RANDOM % 256)) $((RANDOM % 256)) \
    $((RANDOM % 256)) $((RANDOM % 256)) $((RANDOM % 256)) $((RANDOM % 256)))

  DATA="{\"chip_uid\":\"$RANDOM_UID\",\"label\":\"Performance Test Chip\"}"

  CHIP_ID=$(test_endpoint "POST" "/api/nfc/chips" "$DATA" "$THRESHOLD_POST" "POST /api/nfc/chips")

  # Test 2: GET /api/nfc/chips (with 20 chips in DB)
  echo ""
  echo "======================================"
  echo "Test 2: GET /api/nfc/chips"
  echo "======================================"

  test_endpoint "GET" "/api/nfc/chips" "" "$THRESHOLD_GET" "GET /api/nfc/chips"

  # Test 3: DELETE /api/nfc/chips/:chipId
  echo ""
  echo "======================================"
  echo "Test 3: DELETE /api/nfc/chips/:chipId"
  echo "======================================"

  if [ -n "$CHIP_ID" ]; then
    test_endpoint "DELETE" "/api/nfc/chips/$CHIP_ID" "" "$THRESHOLD_DELETE" "DELETE /api/nfc/chips/:chipId"
  else
    echo -e "${YELLOW}Skipping DELETE test (no chip ID available)${NC}"
  fi

  # Summary
  echo ""
  echo "======================================"
  echo "Performance Test Summary"
  echo "======================================"

  PASS_COUNT=0
  FAIL_COUNT=0

  printf "%-35s | %-6s | %-10s | %-6s\n" "Test" "Result" "Time (s)" "HTTP"
  echo "-----------------------------------------------------------------------"

  for RESULT in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r NAME STATUS TIME CODE <<< "$RESULT"

    if [ "$STATUS" = "PASS" ]; then
      printf "%-35s | ${GREEN}%-6s${NC} | %-10s | %-6s\n" "$NAME" "$STATUS" "$TIME" "$CODE"
      ((PASS_COUNT++))
    else
      printf "%-35s | ${RED}%-6s${NC} | %-10s | %-6s\n" "$NAME" "$STATUS" "$TIME" "$CODE"
      ((FAIL_COUNT++))
    fi
  done

  echo ""
  echo "Total tests: $((PASS_COUNT + FAIL_COUNT))"
  echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
  echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

  # Exit code
  if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo -e "${RED}Performance tests FAILED${NC}"
    exit 1
  else
    echo ""
    echo -e "${GREEN}All performance tests PASSED${NC}"
    exit 0
  fi
}

# Cleanup
cleanup() {
  rm -f cookies.txt
}

trap cleanup EXIT

# Run tests
main
