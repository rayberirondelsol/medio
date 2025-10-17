# Implementation Plan: Add Video via Link

**Branch**: `002-add-video-link` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-add-video-link/spec.md`

## Summary

This feature enables parents to add videos to their Medio family library by pasting URLs from YouTube, Vimeo, and Dailymotion. The system automatically fetches video metadata (title, description, thumbnail) from platform APIs, validates the input, handles errors gracefully, and fixes the existing platform_id UUID mismatch bug. Manual entry fallback ensures the feature works even when APIs are unavailable.

**Technical Approach**: Backend proxy for API requests to hide keys, React Context for state management, comprehensive error boundaries, TDD workflow with 80%+ coverage, platform UUID mapping endpoint to fix current bug.

## Technical Context

**Language/Version**: TypeScript 4.9.5 (React 19.1.1, Node.js for backend)
**Primary Dependencies**:
- Frontend: React 19, axios, react-router-dom, React Context API
- Backend: Express.js, PostgreSQL, YouTube Data API v3, Vimeo API, Dailymotion API
**Storage**: PostgreSQL (existing tables: videos, platforms, families)
**Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
**Target Platform**: Web (Create React App), Backend API (Node.js/Express)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Metadata fetch within 2 seconds for 95% of requests
- URL validation within 500ms
- Total add video flow under 30 seconds
**Constraints**:
- YouTube API quota: 10,000 units/day (100 units per video fetch = ~100 videos/day)
- Network timeout: 10 seconds maximum
- httpOnly cookies for authentication
- No localStorage for sensitive tokens
**Scale/Scope**:
- 3 video platforms (YouTube, Vimeo, Dailymotion)
- 4 user stories (P1-P4)
- 38 functional requirements
- 8 success criteria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- [x] **Child Safety First**: ✅ No direct child data collection. Parents add videos to family library. Age ratings are manually assigned by parents (FR-026 to FR-028). No automated content analysis that could expose children to inappropriate content.
- [x] **Context-Driven Architecture**: ✅ Will use React Context API for any state management needs (e.g., video modal state, loading states). No Redux or external state libraries required.
- [x] **Test-First Development**: ✅ TDD workflow mandatory. Tests will be written first for:
  - URL validation and parsing utilities
  - Platform detection logic
  - Metadata fetch service
  - Error handling components
  - Modal component behavior
  - All tests must be approved before implementation begins
- [x] **Error Resilience**: ✅ Comprehensive error handling planned:
  - Error Boundary wrapping video modal (FR-022)
  - AbortController for request cancellation (FR-014)
  - Graceful degradation to manual entry on API failure (FR-017)
  - User-friendly error messages (FR-015 to FR-021)
  - Sentry logging for monitoring (FR-020)
- [x] **Docker-First Development**: ✅ Feature will be developed in existing Docker setup. No host-specific dependencies introduced. Makefile commands (`make dev`, `make test`) will work unchanged.
- [x] **NFC Security & Session Management**: ⚠️ N/A - This feature does not touch NFC or session management. Only affects video library management.

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
specs/002-add-video-link/
├── spec.md              # Feature specification (COMPLETED)
├── plan.md              # This file (IN PROGRESS)
├── research.md          # Phase 0 output (PENDING)
├── data-model.md        # Phase 1 output (PENDING)
├── quickstart.md        # Phase 1 output (PENDING)
├── contracts/           # Phase 1 output (PENDING)
│   ├── get-platforms.yaml
│   └── post-video.yaml
├── tasks.md             # Phase 2 output via /speckit.tasks (NOT created by /speckit.plan)
└── checklists/
    └── requirements.md  # Quality validation (COMPLETED)
```

### Source Code (repository root)

Based on the existing Medio codebase structure:

```
backend/
├── src/
│   ├── routes/
│   │   ├── videos.js         # MODIFY: Fix platform_id UUID validation
│   │   └── platforms.js      # CREATE: New GET /api/platforms endpoint
│   ├── models/
│   │   ├── Video.js          # EXISTING: May need validation updates
│   │   └── Platform.js       # EXISTING: Used for UUID lookups
│   ├── services/
│   │   ├── youtubeService.js # CREATE: YouTube Data API v3 integration
│   │   ├── vimeoService.js   # CREATE: Vimeo API integration
│   │   └── dailymotionService.js # CREATE: Dailymotion API integration
│   └── middleware/
│       └── rateLimiter.js    # MODIFY: Add rate limiting for video APIs
└── tests/
    ├── integration/
    │   ├── videos.test.js    # MODIFY: Add tests for new endpoints
    │   └── platforms.test.js # CREATE: Tests for GET /api/platforms
    └── unit/
        └── services/         # CREATE: Unit tests for video services

frontend/
├── src/
│   ├── components/
│   │   ├── videos/
│   │   │   ├── AddVideoModal.tsx       # MODIFY: Add URL parsing logic
│   │   │   ├── VideoForm.tsx           # MODIFY: Auto-fill metadata
│   │   │   └── VideoFormErrorBoundary.tsx # CREATE: Error boundary
│   │   └── common/
│   │       └── LoadingSpinner.tsx      # EXISTING: Reuse for metadata fetch
│   ├── services/
│   │   ├── videoService.ts   # MODIFY: Add metadata fetch methods
│   │   └── platformService.ts # CREATE: Fetch platform UUIDs
│   ├── utils/
│   │   ├── urlParser.ts      # CREATE: URL validation and ID extraction
│   │   └── platformDetector.ts # CREATE: Detect platform from URL
│   └── types/
│       └── video.ts          # MODIFY: Add metadata types
└── tests/
    ├── unit/
    │   ├── utils/
    │   │   ├── urlParser.test.ts       # CREATE: URL parsing tests
    │   │   └── platformDetector.test.ts # CREATE: Platform detection tests
    │   └── services/
    │       ├── videoService.test.ts    # MODIFY: Add metadata tests
    │       └── platformService.test.ts # CREATE: Platform UUID tests
    └── e2e/
        └── add-video-link.spec.ts      # CREATE: E2E test for full flow
```

**Structure Decision**: This is a web application with existing frontend (React) and backend (Express.js) projects. The structure above maps to the real directories in the repository. We will:
1. **Backend**: Add new service layer for API integrations, new platforms endpoint, fix videos endpoint validation
2. **Frontend**: Enhance existing AddVideoModal component, add URL parsing utilities, implement error boundaries
3. **Testing**: Follow TDD with unit tests first, then integration tests, then E2E tests

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations. This section is intentionally left empty as all constitutional requirements are met.
