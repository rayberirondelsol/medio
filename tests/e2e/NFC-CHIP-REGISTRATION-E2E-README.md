# NFC Chip Registration E2E Tests

## Overview

Comprehensive End-to-End test suite for the NFC Chip Registration feature using Playwright.

**Test File**: `tests/e2e/nfc-chip-registration.spec.js`

**Feature Specification**: `specs/005-specify-scripts-bash/spec.md`

**Test Coverage**: 8 test scenarios (T068-T075)

---

## Test Scenarios

### T068: Complete Manual Registration Workflow
**Purpose**: Verify complete user journey from login to chip registration and persistence

**Steps**:
1. Navigate to NFC Chips page
2. Fill registration form with chip_uid and label
3. Submit form
4. Verify chip appears in list
5. Reload page
6. Verify chip persists after reload

**Expected Result**: Chip is successfully registered and persists across page reloads

---

### T069: Duplicate Chip Registration Blocked
**Purpose**: Verify duplicate chip registration is prevented for same user

**Steps**:
1. Register chip with UID `04:AA:BB:CC:DD:EE:FF`
2. Attempt to register same UID again
3. Verify error message displayed
4. Verify chip only appears once in list

**Expected Result**: HTTP 409 error, chip appears only once

---

### T070: Cross-User Duplicate Registration
**Purpose**: **CRITICAL** - Verify global uniqueness constraint across all users

**Steps**:
1. User A registers chip with UID `04:11:22:33:44:55:66`
2. Logout User A
3. Login as User B
4. User B attempts to register same UID
5. Verify error message (identical to same-user duplicate)
6. Verify User B cannot see User A's chip

**Expected Result**: HTTP 409 error, prevents UID enumeration attacks

**Note**: Requires second test user account (`parent2@example.com`)

---

### T071: Invalid chip_uid Format Rejected
**Purpose**: Verify input validation for chip_uid field

**Test Cases**:
1. Too short: `04:5A` (< 8 hex chars)
2. Too long: `04:5A:B2:C3:D4:E5:F6:A1:B2:C3:D4` (> 20 hex chars)
3. Non-hex characters: `ZZ:YY:XX:WW:VV:UU`
4. Empty string

**Expected Result**: All invalid formats rejected with clear error messages

---

### T072: Invalid Label Rejected
**Purpose**: Verify input validation for label field

**Test Cases**:
1. Empty label
2. Label > 50 characters (51+ chars)
3. Label with HTML tags: `<script>alert("xss")</script>` (XSS attempt)
4. Label with invalid special characters: `Test@#$%^&*()Chip`

**Expected Result**: All invalid labels rejected with clear error messages

---

### T073: Maximum Chip Limit Enforcement
**Purpose**: **CRITICAL** - Verify abuse prevention (max 20 chips per user)

**Steps**:
1. Register 20 chips via API (faster than UI)
2. Verify all 20 chips visible on page
3. Attempt to register 21st chip
4. Verify HTTP 403 error with message "Maximum chip limit reached"
5. Verify chip list still contains exactly 20 chips
6. Delete one chip
7. Verify registration of new chip now succeeds

**Expected Result**: 20-chip limit enforced, registration allowed after deletion

**Performance Note**: Uses API for bulk registration (faster than 20 UI interactions)

---

### T074: NFC Scan Workflow with Mocked NDEFReader
**Purpose**: Verify NFC scanning workflow (mocked for Playwright environment)

**Steps**:
1. Mock `NDEFReader` API via `page.addInitScript()`
2. Click "NFC Chip Scannen" button OR use simulation mode
3. Simulate successful scan returning UID `04:7B:C3:D4:E5:F6:08`
4. Verify chip_uid field auto-filled
5. Complete registration with label
6. Verify chip appears in list

**Expected Result**: Scan auto-fills chip_uid, registration succeeds

**Note**: May skip if NFC button/simulation mode not found

**Implementation Detail**: Web NFC API is not available in Playwright, so this test uses:
- Option A: Mock `NDEFReader` class
- Option B: Use simulation mode (development feature)

---

### T075: Chip Deletion with Confirmation
**Purpose**: Verify chip deletion workflow with confirmation modal

**Steps**:
1. Register chip "Chip To Delete"
2. Click delete button
3. Verify confirmation modal appears
4. Cancel deletion (chip remains)
5. Click delete again
6. Confirm deletion
7. Verify chip removed from list
8. Reload page
9. Verify chip still gone (persistence)

**Expected Result**: Deletion requires confirmation, removes chip permanently

---

## Test Data Management

### Setup (beforeEach)
- Cleans up all chips for authenticated user via `cleanupChips()` helper
- Ensures clean state before each test

### Teardown (afterEach)
- Cleans up all chips for authenticated user
- Prevents test data pollution

### Helper Functions

#### `cleanupChips(request)`
Deletes all NFC chips for the authenticated user via API.

```javascript
await cleanupChips(request);
```

#### `registerChipViaAPI(request, chipUid, label)`
Registers a chip via backend API (faster than UI for test setup).

```javascript
const response = await registerChipViaAPI(request, '04:5A:B2:C3:D4:E5:F6', 'Test Chip');
```

#### `logout(page)`
Logs out current user and redirects to login page.

```javascript
await logout(page);
```

#### `loginAs(page, email, password)`
Logs in as a specific user (used for cross-user tests).

```javascript
await loginAs(page, 'parent2@example.com', 'ParentPass123!');
```

#### `navigateToNFCPage(page)`
Navigates to NFC Chips page (tries link first, then direct URL).

```javascript
await navigateToNFCPage(page);
```

---

## Running Tests

### Run all NFC E2E tests
```bash
npm run test:e2e tests/e2e/nfc-chip-registration.spec.js
```

### Run specific test
```bash
npm run test:e2e tests/e2e/nfc-chip-registration.spec.js -g "T068"
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed tests/e2e/nfc-chip-registration.spec.js
```

### Run in debug mode
```bash
npm run test:e2e:debug tests/e2e/nfc-chip-registration.spec.js
```

### Run on specific browser
```bash
npx playwright test tests/e2e/nfc-chip-registration.spec.js --project=chromium-desktop
```

---

## Environment Requirements

### Backend
- **URL**: `http://localhost:5000` (or `BACKEND_URL` env var)
- **Database**: PostgreSQL with test data
- **Test Users**:
  - User A: `parent@example.com` / `ParentPass123!`
  - User B: `parent2@example.com` / `ParentPass123!` (for T070)

### Frontend
- **URL**: `http://localhost:3000` (or `FRONTEND_URL` env var)
- **Build**: Development or production build running

### Authentication
- Uses shared auth state from `tests/auth.setup.ts`
- Auth state saved to `playwright/.auth/user.json`

---

## Troubleshooting

### Test fails with "parent2@example.com" user not found
**Solution**: Create second test user in database:

```sql
INSERT INTO users (email, password_hash, role)
VALUES ('parent2@example.com', '$2b$10$...', 'parent');
```

Or skip T070 cross-user test.

---

### Test fails with "NFC chip not found" during cleanup
**Expected behavior**: Cleanup runs even if no chips exist. Error is caught and logged.

---

### Test fails with timeout waiting for elements
**Possible causes**:
1. Frontend not running on `http://localhost:3000`
2. Backend not running on `http://localhost:5000`
3. Component selectors changed (update locators)

**Debug steps**:
```bash
# Run in debug mode to see browser
npm run test:e2e:debug tests/e2e/nfc-chip-registration.spec.js

# Check if servers are running
curl http://localhost:3000
curl http://localhost:5000/api/nfc/chips
```

---

### Test fails with "NDEFReader not defined" error
**Expected behavior**: T074 mocks `NDEFReader` or uses simulation mode. This error should not occur.

If it does, verify mock is applied before component loads:
```javascript
await page.addInitScript(() => {
  window.NDEFReader = class NDEFReader { ... };
});
await page.reload(); // Apply mock
```

---

## Test Independence

**All tests are independent** and can run in any order.

- Each test cleans up before/after via `beforeEach`/`afterEach` hooks
- No shared state between tests
- No assumptions about database state

---

## Performance Notes

### T073 uses API for bulk registration
Registering 20 chips via API takes ~2-3 seconds vs ~60+ seconds via UI.

```javascript
const responses = await Promise.all(registrationPromises);
```

### Parallel API calls
Helper functions use `Promise.all()` for parallel API calls when possible.

---

## Known Limitations

### T074: NFC Scan with Mock
- Web NFC API is **not available** in Playwright
- Test uses **mocked NDEFReader** or **simulation mode**
- Real NFC scanning cannot be tested in Playwright
- Consider manual testing on real devices (Chrome 89+ Android)

### T070: Cross-User Test
- Requires second test user account
- If account doesn't exist, test may fail
- Consider creating test user in database seed script

---

## Future Enhancements

1. **Visual regression testing**: Add screenshot comparisons for chip list
2. **Accessibility testing**: Verify ARIA labels and keyboard navigation
3. **Mobile viewport testing**: Test on mobile-specific viewports
4. **Network failure simulation**: Test offline behavior
5. **Rate limiting tests**: Verify rate limiter works (requires multiple rapid requests)

---

## Related Files

- **Spec**: `specs/005-specify-scripts-bash/spec.md`
- **Plan**: `specs/005-specify-scripts-bash/plan.md`
- **Tasks**: `specs/005-specify-scripts-bash/tasks.md`
- **Backend Route**: `backend/src/routes/nfc.js`
- **Backend Tests**: `backend/src/routes/nfc.test.js`
- **Frontend Components**:
  - `src/components/nfc/ChipRegistrationForm.tsx`
  - `src/components/nfc/ChipList.tsx`
  - `src/components/NFCScanner.tsx`
- **Frontend Context**: `src/contexts/NFCChipContext.tsx`
- **Frontend Types**: `src/types/nfc.ts`

---

## Test Status

| Test | Status | Notes |
|------|--------|-------|
| T068 | ✅ Implemented | Complete manual registration workflow |
| T069 | ✅ Implemented | Duplicate chip registration blocked |
| T070 | ✅ Implemented | Cross-user duplicate (requires parent2@example.com) |
| T071 | ✅ Implemented | Invalid chip_uid format rejected |
| T072 | ✅ Implemented | Invalid label rejected |
| T073 | ✅ Implemented | Maximum chip limit enforcement (20 chips) |
| T074 | ✅ Implemented | NFC scan with mocked NDEFReader |
| T075 | ✅ Implemented | Chip deletion with confirmation |

**Total Coverage**: 8/8 scenarios (100%)

**File**: `/home/runner/work/medio/medio/tests/e2e/nfc-chip-registration.spec.js`

**Lines of Code**: 599 lines

**Last Updated**: 2025-10-20
