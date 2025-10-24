# Feature Specification: NFC Chip Video Assignment

**Feature Branch**: `007-nfc-video-assignment`
**Created**: 2025-10-24
**Status**: Draft
**Input**: User description: "Allow parents to assign videos from Video Library to NFC chips with sequence ordering for Kids Mode playback"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign Videos to NFC Chip (Priority: P1)

As a parent, I want to assign multiple videos from my Video Library to an NFC chip, so that when my child scans the chip in Kids Mode, they can watch a curated playlist in a specific order.

**Why this priority**: This is the core functionality that enables the entire feature. Without the ability to assign and order videos, the NFC chip-video connection cannot exist.

**Independent Test**: Can be fully tested by navigating to NFC Chip Manager, selecting a chip, assigning 3 videos in a specific order, saving, and verifying the assignments persist. Delivers immediate value: parents can create curated playlists for their children.

**Acceptance Scenarios**:

1. **Given** I am logged in and viewing NFC Chip Manager, **When** I click "Assign Videos" on a chip, **Then** a modal opens showing my Video Library with selectable videos
2. **Given** the assignment modal is open, **When** I select 3 videos and click "Save", **Then** the chip shows "3 videos assigned" and the assignments are saved
3. **Given** I have assigned videos to a chip, **When** I reopen the assignment modal, **Then** I see the previously assigned videos marked as selected

---

### User Story 2 - Reorder Assigned Videos (Priority: P1)

As a parent, I want to reorder the videos assigned to an NFC chip, so that they play in my preferred sequence when my child scans the chip.

**Why this priority**: Video playback order is critical to the user experience. Without reordering, parents cannot control the sequence, making playlists less useful.

**Independent Test**: Can be tested by assigning 3 videos to a chip, then reordering them (move Video 3 to position 1), saving, and verifying the new order persists in the database. Delivers value: parents control playlist sequence.

**Acceptance Scenarios**:

1. **Given** I have 3 videos assigned to a chip (A, B, C), **When** I drag Video C to the first position, **Then** the order becomes (C, A, B)
2. **Given** I have reordered videos in the modal, **When** I click "Save", **Then** the new sequence is saved with correct sequence numbers (1, 2, 3)
3. **Given** I have reordered videos, **When** I reopen the assignment modal, **Then** videos appear in the new order

---

### User Story 3 - Remove Video from Chip (Priority: P2)

As a parent, I want to remove a video from an NFC chip's playlist, so that my child no longer sees it when they scan the chip.

**Why this priority**: Important for maintenance and content curation, but not critical for initial MVP. Parents can work around this by reassigning all videos.

**Independent Test**: Can be tested by assigning 3 videos, removing the middle video, and verifying the remaining videos are automatically re-sequenced (1, 2 instead of 1, 3). Delivers value: easy playlist maintenance.

**Acceptance Scenarios**:

1. **Given** I have 3 videos assigned (A=1, B=2, C=3), **When** I remove video B, **Then** the remaining videos are re-sequenced (A=1, C=2)
2. **Given** I remove a video, **When** I save changes, **Then** the video is no longer associated with the chip
3. **Given** I have removed all videos, **When** I view the chip in NFC Chip Manager, **Then** it shows "0 videos assigned"

---

### User Story 4 - View Assigned Videos (Priority: P2)

As a parent, I want to see which videos are assigned to each NFC chip in the NFC Chip Manager, so that I can quickly understand what content is on each chip without opening the assignment modal.

**Why this priority**: Improves usability but not essential for MVP. Parents can click "Assign Videos" to see assignments.

**Independent Test**: Can be tested by assigning videos to multiple chips and verifying each chip displays the correct video count and optionally preview thumbnails. Delivers value: quick overview of chip assignments.

**Acceptance Scenarios**:

1. **Given** I have assigned 5 videos to Chip A and 3 to Chip B, **When** I view NFC Chip Manager, **Then** Chip A shows "5 videos assigned" and Chip B shows "3 videos assigned"
2. **Given** a chip has no videos assigned, **When** I view it in NFC Chip Manager, **Then** it shows "0 videos assigned" or "No videos"

---

### Edge Cases

- What happens when a user tries to assign more than 50 videos to a single chip?
- How does the system handle assigning a video that is later deleted from the Video Library?
- What happens if two users try to modify the same chip's video assignments simultaneously?
- How does the system handle network failures during save operations?
- What happens when a chip has videos assigned but the chip itself is deleted?
- How does the system handle video assignments when the owning user's account is deleted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an "Assign Videos" action for each NFC chip in the NFC Chip Manager
- **FR-002**: System MUST display a modal showing the user's Video Library when "Assign Videos" is clicked
- **FR-003**: Users MUST be able to select multiple videos using checkboxes
- **FR-004**: System MUST allow users to reorder selected videos before saving (drag-and-drop or arrows)
- **FR-005**: System MUST persist video assignments with sequence order to the database
- **FR-006**: System MUST display currently assigned videos when reopening the assignment interface
- **FR-007**: System MUST show video count for each chip in NFC Chip Manager
- **FR-008**: Users MUST be able to remove individual videos from a chip's playlist
- **FR-009**: System MUST automatically re-sequence remaining videos when a video is removed
- **FR-010**: System MUST enforce a maximum of 50 videos per NFC chip
- **FR-011**: System MUST validate that users can only assign videos they own
- **FR-012**: System MUST validate that users can only assign videos to NFC chips they own
- **FR-013**: System MUST prevent duplicate video assignments to the same chip
- **FR-014**: System MUST remove all video assignments when an NFC chip is deleted
- **FR-015**: System MUST remove all NFC assignments when a video is deleted from Video Library
- **FR-016**: System MUST display video metadata: thumbnail, title, duration, platform
- **FR-017**: System MUST provide search/filter capability for video libraries with >20 videos
- **FR-018**: System MUST visually indicate which videos are already assigned to the current chip
- **FR-019**: System MUST return assigned videos in sequence order when fetching chip details
- **FR-020**: System MUST save assignments atomically to prevent partial updates

### Key Entities

- **NFC Chip**: A physical NFC tag owned by a user, identified by chip_uid, with properties like label and active status
- **Video**: A video in the user's library with properties like title, thumbnail, duration, platform, and platform_video_id
- **Video-NFC Mapping**: The connection between a video and an NFC chip, including sequence order, active status, and optional profile restrictions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parents can assign up to 50 videos to an NFC chip in under 2 minutes
- **SC-002**: Parents can reorder videos in a playlist in under 30 seconds
- **SC-003**: 95% of video assignment operations complete successfully without errors
- **SC-004**: Assigned videos are retrieved in correct sequence order 100% of the time
- **SC-005**: System handles deletion of videos or chips without leaving orphaned data
- **SC-006**: Assignment interface supports video libraries of up to 500 videos without performance degradation
- **SC-007**: 90% of parents successfully complete their first video assignment without help documentation

## Assumptions

- Users already have videos in their Video Library before assigning them to chips
- The existing `video_nfc_mappings` table will be extended with a `sequence_order` column
- Profile-specific assignments will be implemented in a future feature
- Max watch time restrictions will be handled in a separate feature
- Kids Mode scanning and playback logic are out of scope for this feature
- Video playback happens sequentially (Video 1 → Video 2 → Video 3), not as a continuous loop

## Dependencies

- Requires existing NFC Chip Manager page
- Requires existing Video Library with videos
- Requires database migration to add `sequence_order` column to `video_nfc_mappings` table
- Requires existing authentication system (JWT with user_id)

## Out of Scope

- Kids Mode scanning functionality (separate feature)
- Video playback logic and player UI (separate feature)
- Session management and watch time tracking (separate feature)
- Profile-specific video restrictions (future enhancement)
- Age rating filtering during scan (future enhancement)
- Loop or shuffle playback modes (future enhancement)
- Video preview/playback from assignment interface (not needed for MVP)

