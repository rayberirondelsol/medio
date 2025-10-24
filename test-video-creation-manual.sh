#!/bin/bash
# Manual test script for video creation with exact user payload

BASE_URL="http://localhost:8080"
EMAIL="test-video-manual-$(date +%s)@example.com"
PASSWORD="TestPassword123!"
NAME="Test User"

echo "========================================"
echo "Testing Video Creation Fix"
echo "========================================"
echo ""

# Step 1: Register a new user
echo "Step 1: Registering user: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

echo "Register Response:"
echo "$REGISTER_RESPONSE" | jq '.'

# Extract user ID
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')
echo ""
echo "User ID from response: $USER_ID"
echo ""

# Step 2: Get platforms
echo "Step 2: Fetching platforms..."
PLATFORMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/platforms" \
  -b cookies.txt)

echo "Platforms Response:"
echo "$PLATFORMS_RESPONSE" | jq '.'

# Extract YouTube platform ID
YOUTUBE_PLATFORM_ID=$(echo "$PLATFORMS_RESPONSE" | jq -r '.data[] | select(.name == "youtube") | .id')
echo ""
echo "YouTube Platform ID: $YOUTUBE_PLATFORM_ID"
echo ""

# Step 3: Create video with EXACT user payload
echo "Step 3: Creating video with exact user payload..."
echo "Payload: {title: 'Prinzessinnenparty', channel_name: 'Benny', ...}"
echo ""

VIDEO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/videos" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -w "\nHTTP_STATUS:%{http_code}" \
  -d "{
    \"platform_id\": \"$YOUTUBE_PLATFORM_ID\",
    \"platform_video_id\": \"dQw4w9WgXcQ\",
    \"video_url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",
    \"title\": \"Prinzessinnenparty\",
    \"description\": \"Peppa Wutz\",
    \"channel_name\": \"Benny\",
    \"age_rating\": \"G\",
    \"duration_seconds\": 180,
    \"thumbnail_url\": \"https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg\"
  }")

# Extract HTTP status code
HTTP_STATUS=$(echo "$VIDEO_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
VIDEO_BODY=$(echo "$VIDEO_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Video Creation Response:"
echo "$VIDEO_BODY" | jq '.'
echo ""

# Step 4: Verify result
if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ SUCCESS! Video created with status 201"

  # Extract video ID
  VIDEO_ID=$(echo "$VIDEO_BODY" | jq -r '.id')
  VIDEO_USER_ID=$(echo "$VIDEO_BODY" | jq -r '.user_id')
  VIDEO_CHANNEL=$(echo "$VIDEO_BODY" | jq -r '.channel_name')

  echo ""
  echo "Created Video Details:"
  echo "  - Video ID: $VIDEO_ID"
  echo "  - User ID in video: $VIDEO_USER_ID"
  echo "  - Channel Name: $VIDEO_CHANNEL"
  echo ""

  # Verify user_id matches
  if [ "$VIDEO_USER_ID" = "$USER_ID" ]; then
    echo "✅ user_id matches! Foreign key constraint working correctly"
  else
    echo "❌ WARNING: user_id mismatch!"
    echo "   Expected: $USER_ID"
    echo "   Got: $VIDEO_USER_ID"
  fi

  # Verify channel_name
  if [ "$VIDEO_CHANNEL" = "Benny" ]; then
    echo "✅ channel_name saved correctly!"
  else
    echo "❌ WARNING: channel_name mismatch!"
    echo "   Expected: Benny"
    echo "   Got: $VIDEO_CHANNEL"
  fi

  echo ""
  echo "========================================"
  echo "ALL TESTS PASSED ✅"
  echo "========================================"

else
  echo "❌ FAILED! Video creation failed with status $HTTP_STATUS"
  echo ""
  echo "Error details:"
  echo "$VIDEO_BODY" | jq '.'
  echo ""
  echo "========================================"
  echo "TEST FAILED ❌"
  echo "========================================"
  exit 1
fi

# Cleanup
rm -f cookies.txt
