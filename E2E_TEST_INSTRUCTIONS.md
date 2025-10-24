# E2E Test Execution Instructions

## Feature: 007-nfc-video-assignment

### Status: ✅ Tests Written & Schema-Fixed

All E2E tests have been written and updated to use the production schema (id columns instead of UUID variants).

## Prerequisites

1. **Docker Desktop** must be running
2. **PostgreSQL** database must be available
3. **Backend** server must be running (port 5000)
4. **Frontend BFF Proxy** must be running (port 8080)

## Step-by-Step Execution

### 1. Start Docker Desktop
```bash
# Manually start Docker Desktop application
# Wait for Docker to be fully running
```

### 2. Start PostgreSQL Database
```bash
docker compose up -d postgres

# Wait for database to be ready (about 10 seconds)
sleep 10
```

### 3. Verify Database Connection
```bash
# Check if postgres container is running
docker ps | grep postgres

# Should see: medio-postgres-1 running on port 5432
```

### 4. Start Backend Server (Terminal 1)
```bash
cd backend
npm start

# Backend should start on http://localhost:5000
# Wait for "Server running on port 5000" message
```

### 5. Start Frontend BFF Proxy (Terminal 2)
```bash
npm run start:prod

# Proxy should start on http://localhost:8080
# Wait for "BFF Proxy server running on port 8080" message
```

### 6. Verify Services Are Running
```bash
# Check frontend proxy health
curl http://localhost:8080/health

# Check backend health
curl http://localhost:5000/api/health

# Both should return "healthy" or "ok" status
```

### 7. Run E2E Tests
```bash
# Run all NFC video assignment tests
npm run test:e2e tests/e2e/nfc-video-assignment.spec.ts

# Or run specific test
npm run test:e2e tests/e2e/nfc-video-assignment.spec.ts -g "should open video assignment modal"
```

## Test Coverage

The test file includes:

### User Story 1 (US1): Assign Videos
- **T009**: Open video assignment modal
- **T010**: Assign videos to chip successfully
- **T011**: Validate max 50 videos per chip

### API Endpoints
- **T012**: GET /api/nfc/chips/:chipId/videos (returns videos in sequence order)
- **T013**: PUT /api/nfc/chips/:chipId/videos (batch update assignments)
- **T014**: DELETE /api/nfc/chips/:chipId/videos/:videoId (remove and re-sequence)

### Bonus Tests
- **BONUS**: Prevent duplicate video assignments
- **BONUS**: Validate contiguous sequences (1,2,3 not 1,3,5)

## Expected Results

All 8 tests should **PASS** ✅

```
✓ [T009] should open video assignment modal when clicking button
✓ [T010] should assign videos to chip successfully
✓ [T011] should validate max 50 videos per chip
✓ [T012] should retrieve assigned videos in sequence order
✓ [T013] should batch update video assignments via API
✓ [T014] should remove video and re-sequence remaining videos
✓ [BONUS] should prevent duplicate video assignments
✓ [BONUS] should validate contiguous sequences

8 passed (8/8)
```

## Troubleshooting

### Database Connection Failed
```bash
# Check if postgres is running
docker ps | grep postgres

# Restart postgres if needed
docker compose restart postgres
```

### Backend Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Restart backend
cd backend && npm start
```

### Frontend Port Already in Use
```bash
# Kill process on port 8080
npx kill-port 8080

# Restart proxy
npm run start:prod
```

### Test Timeout
- Increase timeout in playwright.config.ts if tests are slow
- Check that all services are responding before running tests
- Ensure database has been initialized with init.sql schema

## Schema Notes

**CRITICAL**: Tests use production schema column names:
- ✅ `id` (not `chip_uuid`, `video_uuid`)
- ✅ `nfc_chip_id` (not `chip_uuid` in mappings)
- ✅ `video_id` (not `video_uuid` in mappings)

All database queries in tests match production schema as of 2025-10-24.

## Cleanup

After running tests:
```bash
# Stop services (Ctrl+C in each terminal)

# Stop database (optional)
docker compose stop postgres

# Remove test data (optional)
docker compose down -v  # WARNING: This deletes all data
```

## Next Steps

Once all E2E tests pass:
1. Update tasks.md to mark T009-T014 as completed
2. Document test results in CLAUDE.md
3. Consider adding these tests to CI/CD pipeline
4. Add test coverage reporting

---

**Last Updated**: 2025-10-24
**Feature**: 007-nfc-video-assignment
**Test File**: `tests/e2e/nfc-video-assignment.spec.ts`
