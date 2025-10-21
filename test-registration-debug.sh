#!/bin/bash

# Generate unique test email
TIMESTAMP=$(date +%s%3N)
RANDOM_ID=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)
TEST_EMAIL="debug-test-${TIMESTAMP}-${RANDOM_ID}@example.com"

echo "=== Testing Registration + Auth Me Flow ==="
echo "Test email: $TEST_EMAIL"
echo ""

# Step 1: Get CSRF token
echo "Step 1: Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt http://localhost:8080/api/csrf-token)
echo "CSRF Response: $CSRF_RESPONSE"
CSRF_TOKEN=$(echo $CSRF_RESPONSE | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "CSRF Token: $CSRF_TOKEN"
echo ""

# Step 2: Register user
echo "Step 2: Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt -c cookies.txt \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!\",\"name\":\"Debug User\"}" \
  http://localhost:8080/api/auth/register)
echo "Register Response: $REGISTER_RESPONSE"
echo ""

echo "Cookies after registration:"
cat cookies.txt | grep -E "authToken|refreshToken|_csrf"
echo ""

# Step 3: Check auth status
echo "Step 3: Checking auth status..."
ME_RESPONSE=$(curl -s -b cookies.txt http://localhost:8080/api/auth/me)
echo "Auth Me Response: $ME_RESPONSE"
echo ""

# Cleanup
rm -f cookies.txt
