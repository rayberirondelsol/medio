#!/bin/bash
# T006: Deployment Verification Script Test
#
# TDD RED Phase: This script verifies deployment succeeded.
# It will FAIL until nginx.conf is updated and deployed.
#
# Tests cache headers, chunk accessibility, and frontend/backend connectivity

set -e  # Exit on error

FRONTEND_URL="${FRONTEND_URL:-https://medio-react-app.fly.dev}"
BACKEND_URL="${BACKEND_URL:-https://medio-backend.fly.dev}"

echo "🔍 T006: Deployment Verification Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo ""

# Test 1: Verify index.html has no-cache headers
echo "Test 1: Checking index.html cache headers..."
CACHE_HEADER=$(curl -sI "$FRONTEND_URL/index.html" | grep -i "cache-control" || echo "NOT_FOUND")

if echo "$CACHE_HEADER" | grep -qi "no-cache"; then
  echo "✅ index.html has no-cache headers"
  echo "   Got: $CACHE_HEADER"
else
  echo "❌ FAIL: index.html missing no-cache headers"
  echo "   Expected: Cache-Control: no-cache, no-store, must-revalidate"
  echo "   Got: $CACHE_HEADER"
  exit 1
fi

# Test 2: Verify static JS chunks have long-term cache headers
echo ""
echo "Test 2: Checking static chunk cache headers..."

# Get a chunk file from the deployed site
CHUNK_URL=$(curl -s "$FRONTEND_URL/" | grep -oP 'static/js/main\.[a-f0-9]+\.chunk\.js' | head -1)

if [ -z "$CHUNK_URL" ]; then
  echo "⚠️  WARNING: Could not find main chunk URL in index.html"
  echo "   This may indicate a build issue"
else
  CHUNK_CACHE=$(curl -sI "$FRONTEND_URL/$CHUNK_URL" | grep -i "cache-control" || echo "NOT_FOUND")

  if echo "$CHUNK_CACHE" | grep -qi "immutable"; then
    echo "✅ Static chunks have immutable cache headers"
    echo "   Got: $CHUNK_CACHE"
  else
    echo "⚠️  WARNING: Static chunks missing immutable headers"
    echo "   Expected: Cache-Control: public, immutable"
    echo "   Got: $CHUNK_CACHE"
  fi
fi

# Test 3: Verify frontend responds with 200 OK
echo ""
echo "Test 3: Checking frontend availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Frontend returns HTTP 200"
else
  echo "❌ FAIL: Frontend returned HTTP $HTTP_CODE"
  exit 1
fi

# Test 4: Verify backend connectivity
echo ""
echo "Test 4: Checking backend connectivity..."
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/platforms")

if [ "$BACKEND_CODE" = "200" ]; then
  echo "✅ Backend /api/platforms returns HTTP 200"
elif [ "$BACKEND_CODE" = "401" ]; then
  echo "⚠️  WARNING: Backend returned HTTP 401 (auth required)"
  echo "   This may cause AddVideoModal errors if not expected"
else
  echo "⚠️  WARNING: Backend returned HTTP $BACKEND_CODE"
fi

# Test 5: Verify security headers on index.html
echo ""
echo "Test 5: Checking security headers..."
SECURITY_HEADERS=$(curl -sI "$FRONTEND_URL/index.html")

if echo "$SECURITY_HEADERS" | grep -qi "x-frame-options"; then
  echo "✅ X-Frame-Options header present"
else
  echo "⚠️  WARNING: X-Frame-Options header missing"
fi

if echo "$SECURITY_HEADERS" | grep -qi "x-content-type-options.*nosniff"; then
  echo "✅ X-Content-Type-Options: nosniff present"
else
  echo "⚠️  WARNING: X-Content-Type-Options header missing"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ T006: Deployment verification complete"
echo ""
echo "SUCCESS CRITERIA (from spec.md SC-002):"
echo "- New browser sessions load updated frontend code within 60 seconds"
echo "- This script verifies the infrastructure is correct to support that goal"
