# Implementation Plan: NFC Chip Video Assignment

**Branch**: `007-nfc-video-assignment` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-nfc-video-assignment/spec.md`

## Summary

Enable parents to assign multiple videos from their Video Library to NFC chips with sequence ordering for Kids Mode playback. This feature creates the connection between existing NFC chips and videos through a many-to-many mapping with sequence_order column. Parents will use a modal UI in NFC Chip Manager to select, reorder, and manage video assignments. The implementation focuses on CRUD operations for video-chip mappings, leaving scanning/playback logic for future features.

**Technical Approach**: Extend existing `video_nfc_mappings` table with `sequence_order` column via database migration. Create new backend REST endpoints for batch assignment operations. Build React modal component using Context API for state management with drag-and-drop reordering (react-beautiful-dnd or HTML5). Follow TDD workflow with Jest unit tests + Playwright E2E tests written before implementation.

## Technical Context

**Language/Version**:
- Frontend: TypeScript 4.9.5, React 19.1.1
- Backend: Node.js (Express.js)

**Primary Dependencies**:
- Frontend: React Context API, axios, react-beautiful-dnd (for drag-and-drop reordering)
- Backend: express, pg (PostgreSQL driver), express-validator

**Storage**: PostgreSQL (existing medio-backend-db on Fly.io)
- Extend `video_nfc_mappings` table with `sequence_order INTEGER` column
- Modify UNIQUE constraint to prevent duplicate video-chip assignments

**Testing**:
- Unit: Jest + React Testing Library
- E2E: Playwright (assignments, reordering, persistence)
- Test coverage: ≥80% enforced via npm run test:coverage

**Target Platform**:
- Frontend: Web (React SPA served via nginx/BFF proxy)
- Backend: Node.js server (Fly.io deployment)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Assignment modal loads video library <500ms for 500 videos
- Drag-and-drop reordering <100ms latency
- Batch save operation <1s for 50 videos

**Constraints**:
- Maximum 50 videos per NFC chip (FR-010)
- Must support existing httpOnly cookie authentication
- No localStorage for sensitive data
- Browser compatibility: Chrome, Firefox, Safari (latest 2 versions)

**Scale/Scope**:
- Target: 100s of users with 10-500 videos per user
- Expected: 5-20 videos per chip average
- UI: 1 new modal component, 1 modified page (NFCManager), 3-4 new backend endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- [x] **Child Safety First**: ✅ NO data collection from children. Feature is parent-facing only (NFC Chip Manager). Video assignments are curated by parents. No parental consent required since no child data is collected.

- [x] **Context-Driven Architecture**: ✅ Uses React Context API only. No Redux/Zustand. Modal state managed via component-local state, video library fetched via existing Context patterns.

- [x] **Test-First Development**: ✅ TDD mandatory. Tests MUST be written and user-approved BEFORE implementation. Plan includes test specifications in contracts/ directory. RED-GREEN-REFACTOR workflow enforced.

- [x] **Error Resilience**: ✅ Error boundaries will wrap modal component. AbortController used for video library fetches. Graceful degradation: if save fails, show error message and allow retry without losing modal state.

- [x] **Docker-First Development**: ✅ Feature developed entirely in Docker. No host-specific dependencies. Database migration runs via standard Docker Compose workflow (make dev).

- [x] **NFC Security & Session Management**: ✅ Feature touches NFC chip assignments. Server-side validation enforced: chip ownership verified via user_id foreign key. Heartbeat NOT applicable (no active sessions in this feature).

**Technology Constraints Check**:
- [x] React 19 + TypeScript 4.9 + CRA (no ejecting)
- [x] Auth via httpOnly cookies only (no localStorage for tokens)
- [x] Testing with Jest + React Testing Library + Playwright
- [x] Sentry configured for error tracking (existing setup continues)

**Violations**: NONE

## Project Structure

### Documentation (this feature)

```
specs/007-nfc-video-assignment/
├── plan.md              # This file
├── research.md          # Phase 0 output (drag-and-drop library comparison)
├── data-model.md        # Phase 1 output (extended video_nfc_mappings schema)
├── quickstart.md        # Phase 1 output (developer setup guide)
├── contracts/           # Phase 1 output (API contracts + test specs)
│   ├── api-endpoints.yaml       # OpenAPI specification
│   ├── test-spec-unit.md        # Unit test specification
│   └── test-spec-e2e.md         # E2E test specification
├── checklists/
│   └── requirements.md  # Quality checklist (already created)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── routes/
│   │   ├── nfc.js                  # EXTEND: Add chip video assignment endpoints
│   │   └── nfc.test.js             # EXTEND: Add unit tests for new endpoints
│   └── db/
│       └── migrations/
│           └── 007_add_sequence_order.sql  # NEW: Migration file
└── tests/
    └── integration/
        └── nfc-video-assignment.test.js  # NEW: Integration tests

src/
├── components/
│   └── nfc/
│       ├── VideoAssignmentModal.tsx       # NEW: Main assignment modal
│       ├── VideoAssignmentModal.css       # NEW: Modal styling
│       ├── VideoList.tsx                  # NEW: Selectable video list
│       ├── AssignedVideosList.tsx         # NEW: Drag-and-drop video list
│       └── __tests__/
│           ├── VideoAssignmentModal.test.tsx  # NEW: Unit tests
│           ├── VideoList.test.tsx             # NEW: Unit tests
│           └── AssignedVideosList.test.tsx    # NEW: Unit tests
├── pages/
│   └── NFCManager.tsx              # EXTEND: Add "Assign Videos" button
└── services/
    └── nfcService.ts               # EXTEND: Add assignment API calls

tests/
└── e2e/
    └── nfc-video-assignment.spec.ts  # NEW: E2E tests (Playwright)
```

**Structure Decision**: Web application structure (Option 2). This project has separate `backend/` and `src/` (frontend) directories. Backend uses Express.js with route-based organization. Frontend uses React with component-based structure. NFC-related code lives in `src/components/nfc/` and `backend/src/routes/nfc.js`.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations. This section intentionally left blank.**


---

## Phase 0: Research & Design Decisions

### Research Areas

1. **Drag-and-Drop Library Selection**
   - **Question**: Should we use react-beautiful-dnd, dnd-kit, or HTML5 drag API?
   - **Research needed**: Compare bundle size, accessibility, TypeScript support, maintenance status
   - **Decision criteria**: <20KB minified, WCAG 2.1 keyboard navigation, active maintenance (commits in last 3 months)

2. **Database Migration Strategy**
   - **Question**: How do we handle existing video_nfc_mappings rows without sequence_order?
   - **Research needed**: Default value strategy (NULL vs 0 vs auto-assign based on created_at)
   - **Decision criteria**: Must not break existing mappings, must support manual reordering later

3. **Batch Save vs Individual Requests**
   - **Question**: Should we save all assignments in one transaction or individual requests?
   - **Research needed**: Atomicity requirements, rollback strategy, error handling patterns
   - **Decision criteria**: All-or-nothing saves to prevent partial updates, <1s latency for 50 videos

4. **Video Library Pagination**
   - **Question**: Load all videos at once or paginate in modal?
   - **Research needed**: Performance testing with 500 videos, modal UX best practices
   - **Decision criteria**: <500ms initial load, smooth scrolling, search/filter capability

5. **Conflict Resolution Strategy**
   - **Question**: What happens if two parents modify same chip simultaneously?
   - **Research needed**: Last-write-wins vs optimistic locking vs manual merge
   - **Decision criteria**: Simple implementation, rare edge case, acceptable to lose race

### Research Deliverable

Create `research.md` with sections:
- **Drag-and-Drop Library**: Chosen library, bundle size, accessibility notes, code example
- **Database Migration**: Migration SQL, default value strategy, rollback procedure
- **Batch Save Strategy**: Endpoint design, transaction handling, error response format
- **Video Library Loading**: Pagination decision, search/filter approach, performance measurements
- **Conflict Resolution**: Chosen strategy, rationale, edge case handling

---

## Phase 1: Data Model & Contracts

### Data Model Changes

Extend existing `video_nfc_mappings` table:

```sql
-- Migration: 007_add_sequence_order.sql
ALTER TABLE video_nfc_mappings
ADD COLUMN sequence_order INTEGER;

-- Backfill existing rows with sequence based on created_at
UPDATE video_nfc_mappings
SET sequence_order = subquery.row_number
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY nfc_chip_id ORDER BY created_at) as row_number
  FROM video_nfc_mappings
  WHERE sequence_order IS NULL
) AS subquery
WHERE video_nfc_mappings.id = subquery.id;

-- Make sequence_order NOT NULL after backfill
ALTER TABLE video_nfc_mappings
ALTER COLUMN sequence_order SET NOT NULL;

-- Add constraint: sequence must be positive
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT sequence_order_positive CHECK (sequence_order > 0);

-- Add unique constraint: no duplicate sequences per chip
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT unique_sequence_per_chip UNIQUE (nfc_chip_id, sequence_order);
```

### API Contracts

**Endpoint 1: Get Chip with Assigned Videos**
```
GET /api/nfc/chips/:chipId/videos
Authorization: Bearer token (httpOnly cookie)

Response 200:
{
  "chip": {
    "id": "uuid",
    "label": "string",
    "chip_uid": "string"
  },
  "videos": [
    {
      "id": "uuid",
      "title": "string",
      "thumbnail_url": "string",
      "duration_seconds": number,
      "platform_name": "string",
      "sequence_order": number,
      "mapping_id": "uuid"
    }
  ]
}

Response 404: { "message": "Chip not found or not owned by user" }
```

**Endpoint 2: Batch Update Video Assignments**
```
PUT /api/nfc/chips/:chipId/videos
Authorization: Bearer token (httpOnly cookie)
Content-Type: application/json

Request Body:
{
  "videos": [
    { "video_id": "uuid", "sequence_order": 1 },
    { "video_id": "uuid", "sequence_order": 2 }
  ]
}

Validation:
- Max 50 videos (FR-010)
- Sequence must start at 1 and be contiguous
- All video_ids must exist and belong to user
- Chip must belong to user

Response 200:
{
  "message": "Video assignments updated",
  "count": 2
}

Response 400: { "message": "Validation error", "details": [...] }
Response 404: { "message": "Chip not found" }
Response 409: { "message": "One or more videos not found" }
```

**Endpoint 3: Remove Video from Chip**
```
DELETE /api/nfc/chips/:chipId/videos/:videoId
Authorization: Bearer token (httpOnly cookie)

Response 200:
{
  "message": "Video removed from chip",
  "remaining_videos": 4
}

Response 404: { "message": "Mapping not found" }

Side Effect: Remaining videos are re-sequenced automatically (1, 2, 3, ...)
```

### Test Specifications

Create `contracts/test-spec-unit.md`:
- Unit tests for batch update logic
- Unit tests for sequence validation
- Unit tests for ownership validation
- Unit tests for VideoAssignmentModal component
- Unit tests for drag-and-drop reordering

Create `contracts/test-spec-e2e.md`:
- E2E: Open assignment modal, select 3 videos, save, verify persistence
- E2E: Reorder videos via drag-and-drop, save, verify new sequence
- E2E: Remove video from middle of list, verify re-sequencing
- E2E: Attempt to assign 51 videos (should show error)
- E2E: Network failure during save (should show error, retain modal state)

### Quickstart Guide

Create `quickstart.md`:
```markdown
# NFC Video Assignment - Developer Quickstart

## Prerequisites
- Docker installed
- Backend + Database running (make dev)

## Database Migration
```bash
cd backend
npm run migrate:up  # Runs 007_add_sequence_order.sql
```

## Running Tests
```bash
# Unit tests
npm test src/components/nfc/__tests__/VideoAssignmentModal.test.tsx

# E2E tests
npm run test:e2e tests/e2e/nfc-video-assignment.spec.ts
```

## Testing the Feature
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run start:prod`
3. Login at http://localhost:8080
4. Navigate to NFC Chip Manager
5. Click "Assign Videos" on any chip
6. Select 2-3 videos, drag to reorder, click "Save"
7. Refresh page, verify assignments persist

## Troubleshooting
- **Migration fails**: Check if sequence_order already exists
- **Modal doesn't open**: Check browser console for errors
- **Videos don't load**: Verify /api/videos endpoint works
```

---

## Next Steps

After `/speckit.plan` completes:

1. **Review research.md**: Validate technology choices
2. **Review data-model.md**: Confirm schema changes
3. **Review contracts/**: Approve API design and test specifications
4. **Run `/speckit.tasks`**: Generate tasks.md with implementation checklist
5. **Begin TDD workflow**: Write tests (RED), implement (GREEN), refactor

**Branch**: `007-nfc-video-assignment` (already created)
**Plan Status**: ✅ COMPLETE (ready for Phase 0 research execution)
