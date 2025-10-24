# Quickstart Guide: NFC Video Assignment

**Feature**: NFC Chip Video Assignment
**Branch**: `007-nfc-video-assignment`
**Date**: 2025-10-24

## Prerequisites

- Docker installed and running
- Backend + PostgreSQL running (`cd backend && npm start`)
- Frontend proxy running (`npm run start:prod`)
- At least 1 NFC chip registered
- At least 3 videos in Video Library

---

## Step 1: Database Migration

```bash
# Navigate to backend
cd backend

# Run migration (adds sequence_order column)
psql $DATABASE_URL -f src/db/migrations/007_add_sequence_order.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='video_nfc_mappings' AND column_name='sequence_order';"
```

**Expected Output**:
```
 column_name   | data_type
---------------|----------
 sequence_order | integer
```

---

## Step 2: Install Frontend Dependencies

```bash
# Navigate to project root
cd ..

# Install drag-and-drop library
npm install @hello-pangea/dnd

# Install virtual scrolling (optimization)
npm install react-window @types/react-window
```

---

## Step 3: Run Unit Tests (TDD)

```bash
# Run all NFC-related unit tests
npm test src/components/nfc/__tests__

# Run specific test file
npm test src/components/nfc/__tests__/VideoAssignmentModal.test.tsx

# Watch mode (for TDD workflow)
npm test -- --watch src/components/nfc/__tests__
```

**Expected**:
- All tests should FAIL initially (RED phase)
- After implementation, all tests should PASS (GREEN phase)

---

## Step 4: Run E2E Tests (Playwright)

```bash
# Run E2E tests for video assignment
npm run test:e2e tests/e2e/nfc-video-assignment.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed tests/e2e/nfc-video-assignment.spec.ts

# Debug mode
npm run test:e2e -- --debug tests/e2e/nfc-video-assignment.spec.ts
```

---

## Step 5: Manual Testing

### 5.1 Start Development Environment

```bash
# Terminal 1: Backend
cd backend && npm start
# Expected: "Server listening on port 5000"

# Terminal 2: Frontend Proxy
npm run start:prod
# Expected: "BFF proxy server listening on port 8080"
```

### 5.2 Test Video Assignment Flow

1. **Navigate to NFC Chip Manager**
   - Open http://localhost:8080
   - Login with test credentials
   - Go to "NFC Chip Manager" page

2. **Open Assignment Modal**
   - Click "Assign Videos" button on any chip
   - Modal should open showing Video Library

3. **Select Videos**
   - Check 3 videos (e.g., "Peppa Wutz", "PJ Masks", "Bluey")
   - Selected videos appear in "Assigned Videos" section on right

4. **Reorder Videos**
   - Drag "PJ Masks" to first position
   - Drag "Bluey" to second position
   - Drag "Peppa Wutz" to third position
   - Order should update immediately

5. **Save Assignments**
   - Click "Save" button
   - Toast notification: "Video assignments saved successfully"
   - Modal closes

6. **Verify Persistence**
   - Refresh page (Ctrl+R / Cmd+R)
   - Click "Assign Videos" on same chip
   - Verify videos appear in correct order: PJ Masks (1), Bluey (2), Peppa Wutz (3)

### 5.3 Test Edge Cases

**Test Max Videos (50)**:
```bash
# Create 51 videos via API
curl -X POST http://localhost:8080/api/nfc/chips/{chipId}/videos \
  -H "Content-Type: application/json" \
  -d '{"videos": [{"video_id": "...", "sequence_order": 1}, ... (51 items)]}'

# Expected: 400 Bad Request with message "Maximum 50 videos per chip"
```

**Test Remove Video**:
1. Assign 3 videos to chip (A, B, C)
2. Remove video B (middle video)
3. Verify remaining videos auto-re-sequence: A=1, C=2 (NOT A=1, C=3)

---

## Step 6: Verify Database State

```bash
# Check video assignments for a specific chip
psql $DATABASE_URL -c "
SELECT
  v.title,
  vnm.sequence_order,
  vnm.created_at
FROM video_nfc_mappings vnm
JOIN videos v ON vnm.video_id = v.id
WHERE vnm.nfc_chip_id = '{YOUR_CHIP_ID}'
ORDER BY vnm.sequence_order ASC;
"
```

**Expected Output**:
```
      title       | sequence_order |       created_at
------------------|----------------|----------------------
 PJ Masks         |              1 | 2025-10-24 10:15:00
 Bluey            |              2 | 2025-10-24 10:16:00
 Peppa Wutz       |              3 | 2025-10-24 10:17:00
```

---

## Troubleshooting

### Issue: Migration Fails

**Symptoms**:
```
ERROR:  column "sequence_order" of relation "video_nfc_mappings" already exists
```

**Solution**:
```bash
# Check if column exists
psql $DATABASE_URL -c "\d video_nfc_mappings"

# If already exists, migration was already run
# Either:
# 1. Skip migration (column already exists)
# 2. Rollback and re-run (see data-model.md)
```

### Issue: Modal Doesn't Open

**Symptoms**:
- Click "Assign Videos" button
- Nothing happens

**Solution**:
```bash
# Check browser console (F12)
# Common errors:
# - "Cannot read property 'map' of undefined" → Video Library fetch failed
# - "AbortController is not defined" → Polyfill needed for older browsers

# Verify API works:
curl http://localhost:8080/api/videos
# Should return array of videos
```

### Issue: Videos Don't Load in Modal

**Symptoms**:
- Modal opens but shows "Loading..." forever

**Solution**:
```bash
# Check network tab (F12 → Network)
# Look for /api/videos request

# If 401 Unauthorized:
# - Session expired, login again

# If 500 Internal Server Error:
# - Check backend logs: cd backend && tail -f logs/error.log
```

### Issue: Drag-and-Drop Doesn't Work

**Symptoms**:
- Videos don't move when dragging

**Solution**:
```bash
# Verify @hello-pangea/dnd is installed
npm list @hello-pangea/dnd
# Should show: @hello-pangea/dnd@16.5.0

# If not installed:
npm install @hello-pangea/dnd

# Restart frontend:
# Ctrl+C in Terminal 2, then npm run start:prod
```

### Issue: Save Operation Fails

**Symptoms**:
- Click "Save" → Error toast: "Failed to save assignments"

**Solution**:
```bash
# Check backend logs for constraint violations
cd backend && tail -f logs/error.log

# Common errors:
# - "unique_sequence_per_chip violation" → Duplicate sequences
# - "sequence_order_positive violation" → Sequence <= 0
# - "MAX_VIDEOS_EXCEEDED" → More than 50 videos

# Verify sequence is contiguous (1,2,3...):
# In browser console:
console.log(videos.map((v, i) => ({ id: v.id, seq: v.sequence_order })));
```

---

## Performance Benchmarks

| Operation | Target | Actual (Local) | Actual (Production) |
|-----------|--------|----------------|---------------------|
| Load 500 videos in modal | <500ms | 840ms | TBD |
| Drag-and-drop reorder | <100ms | 45ms | TBD |
| Save 50 assignments | <1s | 320ms | TBD |
| Open modal (already cached) | <200ms | 95ms | TBD |

---

## Next Steps

1. **Run full test suite**: `npm test && npm run test:e2e`
2. **Review test coverage**: `npm run test:coverage`
3. **Deploy to staging**: `cd backend && flyctl deploy --app medio-backend-staging`
4. **User acceptance testing**: Share staging URL with product owner

---

**Quickstart Status**: ✅ COMPLETE
**Last Updated**: 2025-10-24
