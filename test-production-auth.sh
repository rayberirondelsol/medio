#!/bin/bash

echo "========================================="
echo "PRODUCTION AUTHENTICATION VERIFICATION"
echo "========================================="
echo "Frontend: https://medio-react-app.fly.dev"
echo "Backend: https://medio-backend.fly.dev"
echo ""

# Generate unique test user
TIMESTAMP=$(date +%s)
EMAIL="prod-test-${TIMESTAMP}@example.com"
PASSWORD="TestPassword123!"
NAME="Prod User ${TIMESTAMP}"

echo "[STEP 1] Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt https://medio-react-app.fly.dev/api/csrf-token)
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

echo ""
echo "[STEP 2] Registering new user..."
echo "Email: $EMAIL"
REGISTER_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  https://medio-react-app.fly.dev/api/auth/register)

echo "Response: $REGISTER_RESPONSE"

# Check if registration succeeded
if echo "$REGISTER_RESPONSE" | grep -q '"user"'; then
  echo "✅ Registration successful"
else
  echo "❌ Registration failed"
  exit 1
fi

echo ""
echo "[STEP 3] Verifying authentication cookies..."
if [ -f cookies.txt ]; then
  echo "Cookies saved:"
  cat cookies.txt | grep -v "^#"
  
  if grep -q "authToken\|token" cookies.txt; then
    echo "✅ Auth cookie found"
  else
    echo "❌ No auth cookie found"
    exit 1
  fi
else
  echo "❌ No cookies file"
  exit 1
fi

echo ""
echo "[STEP 4] Testing authenticated request..."
ME_RESPONSE=$(curl -s -b cookies.txt \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  https://medio-react-app.fly.dev/api/auth/me)

echo "Response: $ME_RESPONSE"

if echo "$ME_RESPONSE" | grep -q '"email"'; then
  echo "✅ Authenticated request successful"
else
  echo "❌ Authenticated request failed"
  exit 1
fi

echo ""
echo "========================================="
echo "PRODUCTION VERIFICATION COMPLETE"
echo "========================================="
echo "✅ CSRF token retrieval: PASSED"
echo "✅ User registration: PASSED"
echo "✅ Cookie authentication: PASSED"
echo "✅ Authenticated requests: PASSED"
echo "✅ BFF proxy pattern: WORKING"
echo "========================================="
echo ""
echo "Test user created: $EMAIL"
echo "NOTE: This user remains in production database"
echo "========================================="

# Cleanup
rm -f cookies.txt
