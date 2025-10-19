# Implementation Plan: NFC Chip Registration

**Branch**: `005-specify-scripts-bash` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-specify-scripts-bash/spec.md`

## Summary

This feature enables parents to register NFC chips for their children through two methods: manual form entry (P1) and direct NFC scanning via Web NFC API on supported devices (P2). Parents can view and manage their registered chips, with proper validation, global uniqueness enforcement, and security controls to prevent enumeration attacks.

**Technical Approach**: Backend provides POST, GET, DELETE endpoints for chip management with global UID uniqueness constraints, rate limiting, and CSRF protection. Frontend uses React Context API for state management, implements Web NFC API integration with feature detection, and provides error boundaries for crash prevention. TDD workflow with 80%+ coverage enforced.

## Technical Context

**Language/Version**: TypeScript 4.9.5 (React 19.1.1), Node.js 18+ (backend)
**Primary Dependencies**:
- Frontend: React 19, axios, React Context API, Web NFC API (Chrome 89+/Edge 89+ Android only)
- Backend: Express.js, PostgreSQL, express-validator, express-rate-limit, Sentry
**Storage**: PostgreSQL (tables: nfc_chips, video_nfc_mappings with CASCADE deletion)
**Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E), Supertest (backend API)
**Target Platform**: Web (Create React App frontend), Backend API (Node.js/Express)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- POST /api/nfc/chips registration within 2 seconds (NFR-001)
- GET /api/nfc/chips within 1 second for 20 chips (NFR-002)
- DELETE /api/nfc/chips/:chipId within 2 seconds including cascade (NFR-003)
- NFC scan detection within 3 seconds of chip contact (NFR-004)
- Frontend rendering within 500ms for 20 chips (NFR-005)
**Constraints**:
- Maximum 20 chips per parent account (FR-016)
- chip_uid globally unique across all users (FR-011)
- httpOnly cookies for authentication (no localStorage for tokens)
- Web NFC API only on Chrome 89+/Edge 89+ Android (iOS/desktop: manual entry only)
- Rate limiting: POST (10 req/15min), DELETE (20 req/15min), GET (60 req/15min)
- CSRF protection required for all mutation endpoints
**Scale/Scope**:
- 3 user stories (P1: Manual, P2: NFC Scan, P3: Management)
- 17 functional requirements (FR-001 to FR-017)
- 3 API endpoints (POST, GET, DELETE /api/nfc/chips)
- 24 non-functional requirements (NFR-001 to NFR-024)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- [x] **Child Safety First**: ✅ No direct child data collection. Parents register chips for their children's NFC-based access control. Global uniqueness constraint (FR-011) prevents chip sharing exploits. Cascading deletion (FR-013) ensures data integrity. Server-side validation prevents client-side manipulation.
- [x] **Context-Driven Architecture**: ✅ Will use React Context API for NFC chip state management (NFCChipContext). No Redux or external state libraries. Context provides: registered chips list, loading states, error states, CRUD operations.
- [x] **Test-First Development**: ✅ TDD workflow mandatory. Tests will be written first for:
  - Chip ID validation and normalization (backend/src/routes/nfc.test.js)
  - NFC chip registration form (frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx)
  - NFC scan button with feature detection (frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx)
  - Chip manager CRUD operations (frontend/src/components/nfc/__tests__/ChipManager.test.tsx)
  - All E2E workflows (tests/e2e/nfc-chip-registration.spec.js)
  - All tests must be approved before implementation begins
- [x] **Error Resilience**: ✅ Comprehensive error handling planned:
  - Error Boundary wrapping NFC chip pages (NFCChipErrorBoundary)
  - AbortController for request cancellation (axios instance with cancellation tokens)
  - Graceful degradation: NFC scan button hidden on unsupported devices (FR-007)
  - User-friendly error messages for validation, duplicates, API failures
  - Sentry logging for all registration errors (FR-014)
- [x] **Docker-First Development**: ✅ Feature will be developed in existing Docker setup. No host-specific dependencies introduced. Makefile commands (`make dev`, `make test`) will work unchanged. Web NFC API works in mobile browsers (Chrome/Edge Android), no special Docker configuration required.
- [x] **NFC Security & Session Management**: ✅ Server-side validation enforced:
  - chip_uid normalization prevents case-sensitivity bypass (NFR-007)
  - Global uniqueness with identical error messages prevents UID enumeration (FR-011, FR-015, NFR-009)
  - Ownership verification before deletion (NFR-011)
  - Rate limiting on all endpoints (NFR-021, NFR-022, NFR-023)
  - CSRF token validation (NFR-024)
  - No session management changes (chip registration is separate from watch sessions)

**Technology Constraints Check**:
- [x] React 19 + TypeScript 4.9 + CRA (no ejecting) ✅
- [x] Auth via httpOnly cookies only (no localStorage for tokens) ✅
- [x] Testing with Jest + React Testing Library + Playwright ✅
- [x] Sentry configured for error tracking ✅

**Violations** (if any, document in Complexity Tracking section):
- None. This feature fully complies with all constitutional principles.

## Project Structure

### Documentation (this feature)

```
specs/005-specify-scripts-bash/
├── spec.md              # Feature specification (COMPLETED)
├── plan.md              # This file (IN PROGRESS - generated by /speckit.plan)
├── research.md          # Phase 0 output (PENDING)
├── data-model.md        # Phase 1 output (PENDING)
├── quickstart.md        # Phase 1 output (PENDING)
├── contracts/           # Phase 1 output (PENDING)
│   ├── post-nfc-chips.yaml       # POST /api/nfc/chips contract
│   ├── get-nfc-chips.yaml        # GET /api/nfc/chips contract
│   └── delete-nfc-chip.yaml      # DELETE /api/nfc/chips/:chipId contract
└── tasks.md             # Phase 2 output via /speckit.tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

Based on the existing Medio codebase structure (web application with frontend + backend):

```
backend/
├── src/
│   ├── routes/
│   │   └── nfc.js         # MODIFY: Add DELETE /api/nfc/chips/:chipId endpoint
│   │                      # MODIFY: Add chip count validation (20 chip limit)
│   │                      # MODIFY: Add label length validation (1-50 chars)
│   │                      # MODIFY: Add HTML entity sanitization
│   │                      # MODIFY: Add Sentry error logging
│   │                      # EXISTING: POST /api/nfc/chips (basic version)
│   │                      # EXISTING: GET /api/nfc/chips (functional)
│   │                      # EXISTING: validateNFCUID() helper (needs minor updates)
│   │                      # EXISTING: normalizeNFCUID() helper (functional)
│   ├── middleware/
│   │   ├── rateLimiter.js # EXISTING: Rate limiting middleware from feature 002
│   │                      # MODIFY: Add NFC-specific rate limiters
│   │   └── csrf.js        # EXISTING: CSRF protection middleware
│   └── db/
│       └── migrations/    # CREATE: Migration for ON DELETE CASCADE on nfc_chips
│                          # (if not already configured)
└── tests/
    ├── integration/
    │   └── nfc.test.js    # MODIFY: Add tests for DELETE endpoint
    │                      # MODIFY: Add cross-user duplicate test
    │                      # MODIFY: Add chip limit enforcement test
    └── unit/
        └── routes/
            └── nfc.test.js # MODIFY: Add validation tests

frontend/
├── src/
│   ├── components/
│   │   └── nfc/
│   │       ├── ChipRegistrationForm.tsx    # CREATE: Manual + NFC scan form
│   │       ├── NFCScanButton.tsx           # CREATE: Web NFC API integration
│   │       ├── ChipManager.tsx             # CREATE: List + delete chips
│   │       ├── NFCChipPage.tsx             # CREATE: Main page component
│   │       └── NFCChipErrorBoundary.tsx    # CREATE: Error boundary
│   ├── context/
│   │   └── NFCChipContext.tsx # CREATE: React Context for chip state
│   ├── services/
│   │   └── nfcService.ts      # CREATE: API calls (GET, POST, DELETE)
│   ├── utils/
│   │   ├── nfcScanner.ts      # CREATE: Web NFC API wrapper
│   │   └── chipValidator.ts   # CREATE: Frontend chip_uid validation
│   └── types/
│       └── nfc.ts             # CREATE: NFCChip, NFCChipForm types
└── tests/
    ├── unit/
    │   ├── components/
    │   │   └── nfc/
    │   │       ├── ChipRegistrationForm.test.tsx # CREATE
    │   │       ├── NFCScanButton.test.tsx        # CREATE
    │   │       └── ChipManager.test.tsx          # CREATE
    │   ├── utils/
    │   │   ├── nfcScanner.test.ts      # CREATE
    │   │   └── chipValidator.test.ts   # CREATE
    │   └── services/
    │       └── nfcService.test.ts      # CREATE
    └── e2e/
        └── nfc-chip-registration.spec.js # CREATE: 8 E2E test scenarios
```

**Structure Decision**: This is a web application with existing frontend (React) and backend (Express.js) projects. The structure above maps to the real directories in the repository. We will:
1. **Backend**: Add DELETE endpoint, chip limit enforcement, enhanced validation, Sentry logging
2. **Frontend**: Create new NFC chip management page with React Context, Web NFC API integration, error boundaries
3. **Testing**: Follow TDD with unit tests first, then integration tests, then E2E tests

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations. This section is intentionally left empty as all constitutional requirements are met.

## Phase 0: Research & Technology Evaluation

*Documented in research.md (to be generated)*

Research tasks identified:
1. **Web NFC API Best Practices**: Understand NDEFReader API, browser support detection, error handling patterns
2. **Global Uniqueness Enforcement**: Database constraint patterns for unique chip_uid across all users
3. **Timing Attack Prevention**: Techniques to prevent UID enumeration via response time analysis
4. **Rate Limiting Strategy**: Optimal request limits for registration/deletion/listing endpoints
5. **CSRF Token Integration**: Existing CSRF middleware implementation in Medio
6. **Cascading Deletion**: PostgreSQL ON DELETE CASCADE configuration and testing
7. **Sentry Error Logging**: Best practices for logging NFC errors with contextual metadata
8. **HTML Sanitization**: XSS prevention for user-provided labels (express-validator escape() vs. DOMPurify)

## Phase 1: Design Artifacts

*To be generated in Phase 1:*
- `data-model.md`: NFC chip entity, relationships, state transitions
- `contracts/`: OpenAPI specs for POST, GET, DELETE endpoints
- `quickstart.md`: Developer setup guide for NFC chip feature
- Agent context update via `.specify/scripts/bash/update-agent-context.sh claude`

## Implementation Notes

### Existing Code Leverage

The backend already has:
- ✅ `validateNFCUID()` function (backend/src/routes/nfc.js:23-39) - validates 4-10 bytes hex format
- ✅ `normalizeNFCUID()` function (backend/src/routes/nfc.js:42-46) - normalizes to uppercase with colons
- ✅ POST /api/nfc/chips endpoint (backend/src/routes/nfc.js:49-80) - basic registration with duplicate detection
- ✅ GET /api/nfc/chips endpoint (backend/src/routes/nfc.js:9-20) - fetch user's chips
- ✅ express-rate-limit middleware (backend/src/middleware/rateLimiter.js from feature 002)
- ✅ CSRF protection middleware (assumed to exist based on constitution requirements)

**What needs to be added**:
- ❌ DELETE /api/nfc/chips/:chipId endpoint (NEW)
- ❌ Chip count validation for 20 chip limit (MODIFY POST endpoint)
- ❌ Label length validation 1-50 characters (MODIFY POST validation)
- ❌ Sentry error logging (MODIFY error handlers)
- ❌ Rate limiters for NFC endpoints (MODIFY middleware)
- ❌ Enhanced duplicate error message consistency (MODIFY error response)
- ❌ All frontend components (NEW - no existing NFC UI)

### Critical Implementation Decisions

**Decision 1: DELETE Active Session Behavior**
- Spec defines two options (spec.md:291-296)
- **Recommendation**: Option A (allow deletion, session ends naturally)
- **Rationale**: Simpler implementation, better parent UX, session timeout prevents indefinite access
- **Document choice in tasks.md**

**Decision 2: Timing Attack Prevention**
- Spec requires consistent response time ±50ms (NFR-009)
- **Recommendation**: Add random delay (0-100ms) before duplicate error responses
- **Implementation**: `setTimeout(() => res.status(409).json({...}), Math.random() * 100)`

**Decision 3: Web NFC API Error Handling**
- Multiple edge cases: permission denied, NFC disabled, invalid tag, rapid double-scan (spec.md:75-79)
- **Recommendation**: Centralize error handling in nfcScanner.ts with typed error codes
- **Pattern**: `{ success: false, errorCode: 'PERMISSION_DENIED' | 'NFC_DISABLED' | 'INVALID_TAG' | 'SCAN_TIMEOUT' }`

## Success Criteria Mapping

Linking spec success criteria to implementation:

| SC | Requirement | Implementation Strategy |
|----|-------------|-------------------------|
| SC-001 | POST within 2 seconds | Database index on chip_uid, minimal validation overhead |
| SC-002 | NFC scan within 3 seconds | Web NFC API timeout (5s), user feedback during scan |
| SC-003 | UI rendering within 1 second | React Context optimistic updates, virtualized lists if needed |
| SC-004 | 100% duplicate blocking | Database UNIQUE constraint + application-level validation |
| SC-005 | Persistence across sessions | PostgreSQL storage, no session-based state |
| SC-006 | NFC button visibility 100% accurate | `"NDEFReader" in window` feature detection |
| SC-007 | Successful deletion | Confirmation modal + DELETE endpoint + CASCADE constraint |

## Next Steps

After `/speckit.plan` completion:
1. Generate `research.md` (Phase 0)
2. Generate `data-model.md` (Phase 1)
3. Generate API contracts in `contracts/` (Phase 1)
4. Generate `quickstart.md` (Phase 1)
5. Update agent context file
6. Run `/speckit.tasks` to generate `tasks.md`
7. Begin TDD implementation (RED-GREEN-REFACTOR workflow)
