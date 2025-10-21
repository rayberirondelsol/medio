#!/bin/bash

# Manual test script for proxy routing fix
# Tests that /api/* requests are correctly forwarded WITH /api prefix

set -e

PROXY_URL="http://localhost:8080"
BACKEND_URL="http://localhost:5000"

echo "=========================================="
echo "BFF Proxy Routing Test"
echo "=========================================="
echo "Proxy: $PROXY_URL"
echo "Backend: $BACKEND_URL"
echo ""

# Check if servers are running
echo "1. Checking if servers are running..."
if ! curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL/health" | grep -q "200"; then
  echo "❌ Proxy server not running at $PROXY_URL"
  echo "   Start with: node server.js"
  exit 1
fi
echo "   ✓ Proxy server running"

if ! curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
  echo "❌ Backend server not running at $BACKEND_URL"
  echo "   Start with: cd backend && npm start"
  exit 1
fi
echo "   ✓ Backend server running"
echo ""

# Test 1: CSRF token via proxy
echo "2. Testing /api/csrf-token via proxy..."
PROXY_RESPONSE=$(curl -s "$PROXY_URL/api/csrf-token")
PROXY_TOKEN=$(echo "$PROXY_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROXY_TOKEN" ]; then
  echo "❌ Failed to get CSRF token via proxy"
  echo "   Response: $PROXY_RESPONSE"
  exit 1
fi
echo "   ✓ CSRF token received: ${PROXY_TOKEN:0:20}..."
echo ""

# Test 2: CSRF token direct to backend
echo "3. Testing /api/csrf-token direct to backend..."
BACKEND_RESPONSE=$(curl -s "$BACKEND_URL/api/csrf-token")
BACKEND_TOKEN=$(echo "$BACKEND_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BACKEND_TOKEN" ]; then
  echo "❌ Failed to get CSRF token from backend"
  echo "   Response: $BACKEND_RESPONSE"
  exit 1
fi
echo "   ✓ CSRF token received: ${BACKEND_TOKEN:0:20}..."
echo ""

# Test 3: Verify /api prefix is preserved
echo "4. Testing /api/platforms via proxy..."
PLATFORMS_RESPONSE=$(curl -s "$PROXY_URL/api/platforms")
PLATFORM_COUNT=$(echo "$PLATFORMS_RESPONSE" | grep -o "platform_uuid" | wc -l)

if [ "$PLATFORM_COUNT" -eq 0 ]; then
  echo "❌ Failed to get platforms via proxy"
  echo "   Response: $PLATFORMS_RESPONSE"
  exit 1
fi
echo "   ✓ Platforms received: $PLATFORM_COUNT platforms"
echo ""

# Test 4: Verify non-API routes serve React app
echo "5. Testing non-API route serves React app..."
REACT_RESPONSE=$(curl -s "$PROXY_URL/dashboard")
if ! echo "$REACT_RESPONSE" | grep -q '<div id="root">'; then
  echo "❌ React app not served for non-API route"
  exit 1
fi
echo "   ✓ React app served correctly"
echo ""

# Test 5: Check proxy logs for path rewrite
echo "6. Verifying proxy logs..."
echo "   Check the proxy server console for these logs:"
echo "   - [FILTER] /api/csrf-token -> PROXY"
echo "   - [PATH REWRITE] Original: /api/csrf-token -> Forwarded: /api/csrf-token"
echo "   - [PROXY REQ] GET /api/csrf-token -> $BACKEND_URL/api/csrf-token"
echo ""

echo "=========================================="
echo "✓ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "The proxy is correctly forwarding /api/* requests"
echo "with the /api prefix preserved."
echo ""
echo "Next steps:"
echo "1. Check proxy server logs to verify [FILTER] and [PATH REWRITE] are being called"
echo "2. Run Playwright tests: npx playwright test tests/test-proxy-routing.spec.js"
echo "3. Monitor production behavior with same configuration"
