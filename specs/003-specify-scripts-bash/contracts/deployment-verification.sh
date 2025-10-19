#!/bin/bash
# Contract: Deployment Verification Script
# Feature: 003-specify-scripts-bash
# Purpose: Verify deployment success by checking cache headers and chunk accessibility

set -e  # Exit on error

FRONTEND_URL="https://medio-react-app.fly.dev"

echo "🔍 Deployment Verification - $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Verify index.html has no-cache headers
echo "Test 1: Checking index.html cache headers..."
CACHE_HEADER=$(curl -sI "$FRONTEND_URL/index.html" | grep -i "cache-control" || echo "NOT_FOUND")

if echo "$CACHE_HEADER" | grep -q "no-cache"; then
  echo "✅ index.html has no-cache headers"
else
  echo "❌ FAIL: index.html missing no-cache headers"
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

  if echo "$CHUNK_CACHE" | grep -q "immutable"; then
    echo "✅ Static chunks have immutable cache headers"
  else
    echo "⚠️  WARNING: Static chunks missing immutable headers"
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

# Test 4: Verify backend connectivity (if frontend tries to connect)
echo ""
echo "Test 4: Checking backend connectivity..."
BACKEND_URL="https://medio-backend.fly.dev/api/platforms"
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL")

if [ "$BACKEND_CODE" = "200" ]; then
  echo "✅ Backend /api/platforms returns HTTP 200"
elif [ "$BACKEND_CODE" = "401" ]; then
  echo "⚠️  WARNING: Backend returned HTTP 401 (auth required)"
  echo "   This may cause AddVideoModal errors"
else
  echo "⚠️  WARNING: Backend returned HTTP $BACKEND_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment verification complete"

# SUCCESS CRITERIA (from spec.md SC-002):
# - New browser sessions load updated frontend code within 60 seconds
# - This script verifies the infrastructure is correct to support that goal
