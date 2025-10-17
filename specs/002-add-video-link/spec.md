# Feature Specification: Add Video via Link

**Feature Branch**: `002-add-video-link`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "Implement 'Add Video via Link' functionality that allows parents to add videos to the Medio platform by pasting direct URLs from supported video platforms. Erstmal via Video Link für Videos die kostenfrei also ohne Account verfügbar sind."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Public YouTube Video (Priority: P1)

As a parent, I need to add a public YouTube video to my family's library by pasting its URL so that my children can watch approved content without browsing YouTube directly.

**Why this priority**: This is the core value proposition - enabling parents to curate content quickly. YouTube is the primary platform parents use, and this delivers immediate value.

**Independent Test**: Can be fully tested by opening the "Add Video" modal, pasting a valid YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ), seeing metadata auto-fill, selecting an age rating, clicking "Add Video", and verifying the video appears in the library.

**Acceptance Scenarios**:

1. **Given** I click "Add Video" button, **When** the modal opens, **Then** I see an empty form with fields for video URL, title, platform, description, and age rating
2. **Given** the modal is open, **When** I paste a valid YouTube URL (youtube.com/watch?v=ID format), **Then** the system detects "YouTube" platform and shows a loading indicator
3. **Given** the system is fetching metadata, **When** the YouTube API responds successfully, **Then** the title, description, and thumbnail fields auto-populate within 3 seconds
4. **Given** metadata has auto-filled, **When** I review the information, **Then** I can edit any field before saving
5. **Given** I've reviewed the video details, **When** I select an age rating (e.g., "PG") and click "Add Video", **Then** the video saves to my library and the modal closes
6. **Given** the video was saved, **When** I view my Videos page, **Then** the newly added video appears in the list with correct metadata

---

### User Story 2 - Handle URL Variations and Platform Detection (Priority: P2)

As a parent, I need the system to recognize different URL formats from YouTube, Vimeo, and Dailymotion so that I can paste links from share buttons, address bars, or embeds without worrying about format.

**Why this priority**: Parents copy URLs from various sources (share buttons, mobile apps, browser address bars). Supporting multiple formats reduces friction and prevents confusion.

**Independent Test**: Can be tested by pasting different URL formats (youtu.be/ID, youtube.com/embed/ID, vimeo.com/ID, dai.ly/ID) and verifying each is correctly parsed and metadata is fetched.

**Acceptance Scenarios**:

1. **Given** I paste a short YouTube URL (youtu.be/ID), **When** the system parses it, **Then** it correctly detects YouTube and extracts the video ID
2. **Given** I paste a YouTube embed URL (youtube.com/embed/ID), **When** the system parses it, **Then** it correctly detects YouTube and extracts the video ID
3. **Given** I paste a Vimeo URL (vimeo.com/123456789), **When** the system parses it, **Then** it correctly detects Vimeo and fetches metadata
4. **Given** I paste a Dailymotion short URL (dai.ly/ID), **When** the system parses it, **Then** it correctly detects Dailymotion and fetches metadata
5. **Given** the platform is detected, **When** metadata is fetched, **Then** the platform dropdown automatically selects the correct platform

---

### User Story 3 - Graceful Error Handling (Priority: P3)

As a parent, I need clear, actionable error messages when something goes wrong (invalid URL, private video, API failure) so that I know how to fix the issue without getting frustrated.

**Why this priority**: Errors will happen (typos, private videos, API quotas). Clear feedback maintains user trust and prevents abandonment of the feature.

**Independent Test**: Can be tested by intentionally triggering error conditions (invalid URL, private video URL, disconnect network) and verifying friendly error messages appear in the modal.

**Acceptance Scenarios**:

1. **Given** I paste an invalid URL (e.g., "notaurl"), **When** the system validates it, **Then** I see an error message "Please enter a valid video URL from YouTube, Vimeo, or Dailymotion"
2. **Given** I paste a valid YouTube URL for a private video, **When** the API responds with "private video" error, **Then** I see the message "This video is private and cannot be added. Please check the URL or try a different video."
3. **Given** I paste a valid URL but the API is unavailable, **When** the fetch fails, **Then** I see "Unable to fetch video details automatically. You can enter the information manually below." and the form remains editable
4. **Given** I paste a URL for a video already in my library, **When** the duplicate check runs, **Then** I see a warning "This video is already in your library. Add it anyway?" with Confirm/Cancel options
5. **Given** an error occurs, **When** I correct the issue (e.g., paste a different URL), **Then** the error message clears and the system retries

---

### User Story 4 - Manual Entry Fallback (Priority: P4)

As a parent, I need to manually enter video information if automatic metadata fetching fails so that I can still add the video to my library even when the API is unavailable.

**Why this priority**: API failures will happen (rate limits, network issues, platform changes). Manual fallback ensures the feature always works, even if not optimally.

**Independent Test**: Can be tested by simulating API failure or entering a URL from an unsupported platform, then manually filling in title, description, and confirming the video saves successfully.

**Acceptance Scenarios**:

1. **Given** the API fetch fails or times out, **When** the error message appears, **Then** all form fields remain editable for manual entry
2. **Given** I choose to enter information manually, **When** I fill in title, description, platform, video ID, and age rating, **Then** I can save the video without auto-fetched metadata
3. **Given** I'm manually entering data, **When** I click "Add Video" with all required fields filled, **Then** the video saves successfully to my library

---

### Edge Cases

- **Invalid URL format**: System shows clear error message "Please enter a valid video URL from YouTube, Vimeo, or Dailymotion" without crashing or showing technical errors
- **Private/Unavailable video**: API returns 404 or "private" status → System shows "This video is private or unavailable. Please check the URL or try a different video."
- **API quota exceeded**: YouTube API returns 403 quota error → System shows "Unable to fetch video details automatically. You can enter the information manually below." and allows manual entry
- **Network timeout**: Request takes longer than 10 seconds → System cancels the request (via AbortController), shows timeout message, allows manual entry
- **Duplicate video URL**: Video URL already exists in family's library → System shows warning modal "This video is already in your library at [age rating: X]. Add it anyway?" with Confirm/Cancel buttons
- **Malformed metadata response**: API returns unexpected data format → System logs error to Sentry, shows manual entry message, pre-fills any fields that parsed successfully
- **Component unmounts during fetch**: User closes modal while fetch is in progress → AbortController cancels the request, prevents memory leaks and state updates on unmounted component
- **Platform ID mismatch bug**: Backend rejects request because platform_id is sent as string instead of UUID → Fix by fetching platform UUID mappings from backend via GET /api/platforms and sending correct UUID

## Requirements *(mandatory)*

### Functional Requirements

**URL Input and Validation**

- **FR-001**: System MUST accept video URLs in the "Video URL/ID" field of the Add Video modal
- **FR-002**: System MUST validate URL format before attempting metadata fetch
- **FR-003**: System MUST support multiple URL formats per platform:
  - YouTube: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `m.youtube.com/watch?v=ID`
  - Vimeo: `vimeo.com/ID`, `player.vimeo.com/video/ID`
  - Dailymotion: `dailymotion.com/video/ID`, `dai.ly/ID`
- **FR-004**: System MUST display clear error messages for invalid URL formats without crashing

**Platform Detection and ID Extraction**

- **FR-005**: System MUST automatically detect the platform from the pasted URL
- **FR-006**: System MUST extract the video ID from the URL using platform-specific regex patterns
- **FR-007**: System MUST pre-select the detected platform in the platform dropdown
- **FR-008**: System MUST fetch platform UUID mappings from backend (GET /api/platforms) to fix the current string ID bug

**Metadata Auto-Extraction**

- **FR-009**: System MUST fetch video metadata from platform APIs:
  - YouTube: Use YouTube Data API v3 to fetch title, description, thumbnail URL, duration, channel name
  - Vimeo: Use Vimeo API to fetch title, description, thumbnail, duration
  - Dailymotion: Use Dailymotion API to fetch title, description, thumbnail, duration
- **FR-010**: System MUST display a loading indicator during metadata fetch (expected 1-3 seconds)
- **FR-011**: System MUST auto-populate form fields (title, description) with fetched metadata
- **FR-012**: System MUST allow users to edit auto-filled fields before saving
- **FR-013**: System MUST timeout metadata fetch requests after 10 seconds
- **FR-014**: System MUST use AbortController to cancel requests if component unmounts

**Error Handling**

- **FR-015**: System MUST handle invalid URLs with message: "Please enter a valid video URL from YouTube, Vimeo, or Dailymotion"
- **FR-016**: System MUST handle private/unavailable videos with message: "This video is private or unavailable. Please check the URL or try a different video."
- **FR-017**: System MUST handle API failures (rate limits, network errors) with message: "Unable to fetch video details automatically. You can enter the information manually below."
- **FR-018**: System MUST handle network timeouts with message: "Request timed out. You can enter the information manually below."
- **FR-019**: System MUST NOT show raw error messages or stack traces to users
- **FR-020**: System MUST log detailed errors to Sentry for debugging
- **FR-021**: System MUST display all error messages within the modal, not as page-level alerts
- **FR-022**: System MUST wrap the video modal with an Error Boundary to prevent crashes

**Duplicate Detection**

- **FR-023**: System MUST check if the video URL already exists in the family's library before saving
- **FR-024**: System MUST show warning modal when duplicate detected: "This video is already in your library. Add it anyway?"
- **FR-025**: System MUST allow adding duplicate videos if user confirms (for different age ratings or playlists)

**Age Rating Assignment**

- **FR-026**: System MUST require parents to select an age rating (G, PG, PG-13, R) before saving
- **FR-027**: System MUST display clear descriptions of each age rating in the modal
- **FR-028**: System MUST NOT auto-assign age ratings based on content (parent decision required)

**Backend Integration**

- **FR-029**: System MUST send platform_id as UUID (not string) to fix current bug
- **FR-030**: Backend MUST provide GET /api/platforms endpoint returning platform list with UUIDs
- **FR-031**: Backend MUST validate video URL format server-side
- **FR-032**: Backend MUST check for duplicate video URLs per family
- **FR-033**: Backend MUST return detailed, actionable error messages for validation failures
- **FR-034**: Backend MUST NOT expose API keys in responses or client-side code

**API Security**

- **FR-035**: YouTube Data API v3 key MUST be stored in backend environment variable
- **FR-036**: System MUST proxy API requests through backend to hide API keys from frontend
- **FR-037**: Backend MUST implement rate limiting to prevent quota exhaustion
- **FR-038**: System MUST handle API quota exceeded errors gracefully

### Key Entities *(include if feature involves data)*

- **Video**: Represents a video added to the family's library
  - Attributes: title, description, platform (UUID reference), video_id, video_url, age_rating, thumbnail_url, duration, added_date
  - Relationships: Belongs to a family, associated with a platform, may have watch sessions

- **Platform**: Represents a video hosting platform (YouTube, Vimeo, Dailymotion, Netflix, etc.)
  - Attributes: platform_id (UUID), name, requires_auth (boolean), base_url
  - Relationships: Has many videos

- **Family**: The group/account that owns the video library
  - Attributes: family_id, name, users
  - Relationships: Has many videos, has many profiles, has many NFC chips

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parents can add a public YouTube video to their library in under 30 seconds from opening the modal to seeing it in their library
- **SC-002**: Metadata auto-fills within 2 seconds for 95% of valid YouTube URLs under normal network conditions
- **SC-003**: The system achieves 95%+ accuracy for metadata extraction on valid, public YouTube videos (title and description match source)
- **SC-004**: Zero silent failures occur - all errors display clear, actionable messages to users
- **SC-005**: The "Add Video" button bug is fixed - clicking the button successfully saves the video or shows a clear error message
- **SC-006**: Users see loading indicators and receive feedback within 2 seconds for all actions (URL validation, metadata fetch, save operation)
- **SC-007**: The system gracefully handles API failures - users can always manually enter video information as a fallback
- **SC-008**: Error messages contain no technical jargon - a non-technical parent can understand what went wrong and how to fix it

## Assumptions

- Parents have basic internet literacy and know how to copy/paste URLs
- YouTube Data API v3 quota is sufficient for expected usage (10,000 units/day default, 100 units per video fetch)
- Videos are added individually, not in bulk (batch import is Phase 2)
- Free/public videos are sufficient for Phase 1 - authenticated platforms (Netflix, Disney+) will be Phase 2
- The existing backend infrastructure (PostgreSQL database, Express.js API) is sufficient
- Age ratings will be manually assigned by parents - no automated content analysis in Phase 1
- Video playback will use platform embed players (YouTube iframe, Vimeo player) - no custom video player needed
- Network conditions are generally stable - mobile/offline scenarios are out of scope for Phase 1

## Dependencies

- **YouTube Data API v3**: Required for fetching YouTube video metadata (title, description, thumbnail, duration)
  - Requires API key (stored in backend environment variable)
  - Free tier: 10,000 units/day quota
  - Each video fetch costs ~100 units

- **Vimeo API**: Optional for Vimeo video metadata
  - May require API key for higher rate limits
  - Public videos accessible without authentication

- **Dailymotion API**: Optional for Dailymotion video metadata
  - Public API, no key required for public videos

- **Backend Changes**:
  - New GET /api/platforms endpoint to fetch platform list with UUIDs
  - Fix POST /api/videos validation to accept UUID for platform_id
  - Add duplicate video URL check per family
  - Add server-side URL validation

- **Frontend Libraries** (already installed):
  - axios (HTTP client with AbortController support)
  - React 19.1.1 (with hooks)
  - TypeScript 4.9.5

- **Testing Libraries** (already installed):
  - Jest + React Testing Library (unit tests)
  - Playwright (E2E tests)

## Open Questions

These questions have been resolved through informed assumptions documented above. No [NEEDS CLARIFICATION] markers remain.
