# Feature Specification: NFC Chip Registrierung

**Feature Branch**: `005-specify-scripts-bash`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "NFC Chip Registrierung für Eltern mit zwei Registrierungsmethoden implementieren. Eltern sollen NFC-Chips registrieren können um später ihren Kindern sicheren Zugriff auf Videos zu ermöglichen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manuelle Chip-Registrierung (Priority: P1)

Eltern navigieren zur NFC Chips Seite und möchten einen neuen Chip registrieren indem sie die Chip-ID manuell eingeben. Sie füllen das Formular mit der eindeutigen Chip-ID und einem freundlichen Namen aus (z.B. "Bens Chip"). Nach dem Absenden erscheint der registrierte Chip sofort in der Chip-Liste.

**Why this priority**: Dies ist die grundlegende Funktionalität die auch ohne NFC-Hardware funktioniert und den Kern des Features darstellt. Ohne diese Basis-Registrierung kann kein weiteres Feature aufgebaut werden.

**Independent Test**: Kann vollständig getestet werden indem ein Elternteil ein Formular ausfüllt und bestätigt dass der Chip in der Liste erscheint und persistent gespeichert wird.

**Acceptance Scenarios**:

1. **Given** Elternteil ist eingeloggt und auf NFC Chips Seite, **When** Formular mit Chip-ID "04:5A:B2:C3:D4:E5:F6" und Namen "Bens Chip" ausgefüllt und abgesendet wird, **Then** erscheint "Bens Chip" sofort in der Chip-Manager Liste

2. **Given** Elternteil hat bereits Chip mit ID "04:5A:B2:C3:D4:E5:F6" registriert, **When** versucht wird denselben Chip erneut zu registrieren, **Then** erscheint Fehlermeldung "Dieser Chip ist bereits registriert"

3. **Given** Elternteil füllt Formular aus, **When** nur Chip-ID eingegeben aber kein freundlicher Name, **Then** erscheint Validierungsfehler "Freundlicher Name ist erforderlich"

4. **Given** Elternteil hat Chips registriert, **When** Seite neu geladen wird, **Then** bleiben alle registrierten Chips sichtbar

---

### User Story 2 - NFC Scan Registrierung (Priority: P2)

Eltern mit NFC-fähigem Smartphone oder Tablet können einen Chip durch direktes Scannen registrieren. Sie klicken auf "NFC Chip Scannen" Button, halten ihr Gerät an den Chip, und die App liest automatisch die Chip-ID aus. Elternteil gibt nur noch einen freundlichen Namen ein und bestätigt.

**Why this priority**: Dies ist eine bedeutende UX-Verbesserung die Fehler bei manueller Eingabe verhindert aber nicht für die grundlegende Funktionalität erforderlich ist. P1 muss zuerst funktionieren.

**Independent Test**: Kann unabhängig getestet werden durch Simulation eines NFC-Scans (Mock) und Verifikation dass die ausgelesene ID korrekt im Formular vorausgefüllt wird.

**Acceptance Scenarios**:

1. **Given** Gerät unterstützt NFC und Elternteil ist auf NFC Chips Seite, **When** "NFC Chip Scannen" Button geklickt wird, **Then** startet NFC-Lesevorgang

2. **Given** NFC-Scan ist aktiv, **When** Gerät an NFC-Chip gehalten wird, **Then** wird Chip-ID automatisch ausgelesen und im Formular angezeigt

3. **Given** Chip-ID wurde gescannt, **When** Elternteil gibt Namen "Lisas Chip" ein und bestätigt, **Then** wird Chip mit gescannter ID und Namen "Lisas Chip" registriert

4. **Given** Gerät unterstützt kein NFC, **When** NFC Chips Seite geladen wird, **Then** wird "NFC Chip Scannen" Button nicht angezeigt

---

### User Story 3 - Chip-Verwaltung (Priority: P3)

Eltern können ihre registrierten Chips verwalten: Liste aller Chips anzeigen, Details einsehen, und nicht mehr benötigte Chips löschen. Gelöschte Chips verschwinden sofort aus der Liste und werden dauerhaft aus dem System entfernt.

**Why this priority**: Verwaltungsfunktionen sind wichtig für langfristige Nutzung aber nicht für initiale Registrierung erforderlich. Kann nach P1 und P2 hinzugefügt werden.

**Independent Test**: Kann getestet werden indem registrierte Chips angezeigt werden und Löschvorgang funktioniert mit sofortiger UI-Aktualisierung.

**Acceptance Scenarios**:

1. **Given** Elternteil hat 3 Chips registriert, **When** NFC Chips Seite geladen wird, **Then** werden alle 3 Chips in der Liste angezeigt

2. **Given** Chip "Bens Chip" ist in der Liste, **When** Löschen-Button geklickt und bestätigt wird, **Then** verschwindet Chip sofort aus Liste und Backend

3. **Given** Elternteil löscht einen Chip, **When** Seite neu geladen wird, **Then** bleibt der Chip gelöscht

---

### Edge Cases

- Was passiert wenn ein Elternteil versucht einen bereits von einem anderen Elternkonto registrierten Chip zu registrieren?
- Wie reagiert das System wenn NFC-Scan fehlschlägt oder unterbrochen wird?
- Was geschieht wenn die Chip-ID ein unerwartetes Format hat?
- Wie verhält sich die App wenn während des NFC-Scans die Netzwerkverbindung verloren geht?
- Was passiert wenn ein Elternteil versucht mehr als die maximal erlaubte Anzahl Chips zu registrieren?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow parents to register NFC chips via manual form entry with Chip-ID and friendly name
- **FR-002**: System MUST validate that Chip-IDs are unique per parent account
- **FR-003**: System MUST prevent duplicate chip registrations and display clear error message
- **FR-004**: System MUST display all registered chips in a chip manager list immediately after registration
- **FR-005**: System MUST persist registered chips in database and maintain them across sessions
- **FR-006**: System MUST allow parents to delete registered chips with immediate removal from list and database
- **FR-007**: System MUST detect NFC capability of device and show scan button only when supported
- **FR-008**: System MUST allow parents to scan NFC chips using Web NFC API on supported devices
- **FR-009**: System MUST auto-fill Chip-ID field when NFC chip is scanned successfully
- **FR-010**: System MUST validate Chip-ID format (hexadecimal format with colons like "04:5A:B2:C3:D4:E5:F6", 4 to 10 bytes / 8-20 hex characters)
- **FR-011**: System MUST ensure each chip_uid is globally unique across ALL parent accounts (enforced via database UNIQUE constraint on nfc_chips.chip_uid column). When a duplicate registration is attempted, return HTTP 409 with identical error message regardless of ownership.
- **FR-012**: System MUST validate that friendly name is not empty and within reasonable length limits (1-50 characters)
- **FR-013**: System MUST provide DELETE /api/nfc/chips/:chipId endpoint to permanently delete chips with cascading deletion of associated video mappings
- **FR-014**: System MUST log all NFC registration errors to Sentry with contextual metadata (user_id, chip_uid, error_type, platform, timestamp)
- **FR-015**: System MUST return identical error messages for duplicate chip registrations regardless of ownership to prevent UID enumeration attacks

### Key Entities *(include if feature involves data)*

- **NFC Chip**: Represents a physical NFC chip with unique identifier, friendly name assigned by parent, registration date, and association to parent account
- **Parent Account**: User account that owns and manages registered NFC chips
- **Chip Registration**: Links a chip to a parent account with timestamp and friendly name

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: POST /api/nfc/chips registration completes within 2 seconds after form submission
- **SC-002**: NFC scan detection and chip_uid extraction completes within 3 seconds of chip contact (on supported devices)
- **SC-003**: Registered chips appear in chip manager list within 1 second of API response (frontend rendering time)
- **SC-004**: 100% of duplicate chip registration attempts are blocked with clear error message
- **SC-005**: Chip data persists correctly across browser refreshes and re-logins
- **SC-006**: NFC scan button is visible on 100% of NFC-capable devices and hidden on non-capable devices
- **SC-007**: Parents can successfully delete chips with immediate removal from UI and backend

## Assumptions *(optional)*

- NFC chips use standard NFC Forum Type 2 or Type 4 tags
- Web NFC API is available on Chrome 89+ (February 2021) or Edge 89+ on Android devices only
- iOS Safari does NOT support Web NFC API (manual entry remains available)
- Desktop browsers do NOT support Web NFC API (manual entry remains available)
- Feature detection using `if ("NDEFReader" in window)` check determines scan button visibility
- Chip IDs are typically 4 to 10 bytes in hexadecimal format (8-20 hex characters after removing colons/spaces)
- Maximum number of chips per parent account is 20 (reasonable default)
- Chip-ID format validation allows common NFC UID formats

## API Contract

### POST /api/nfc/chips
Register a new NFC chip for the authenticated parent.

**Authentication**: Required (JWT token via httpOnly cookie)

**Request Body**:
```json
{
  "chip_uid": "04:5A:B2:C3:D4:E5:F6",
  "label": "Bens Chip"
}
```

**Validation**:
- `chip_uid`: Required, string, 4-10 bytes (8-20 hex characters), hexadecimal format (with or without colons/spaces)
- `label`: Required, string, 1-50 characters, trimmed

**Success Response (201 Created)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "chip_uid": "04:5A:B2:C3:D4:E5:F6",
  "label": "Bens Chip",
  "created_at": "2025-10-19T12:34:56.789Z"
}
```

**Error Responses**:

- **400 Bad Request** (Validation failure):
```json
{
  "errors": [
    {
      "msg": "NFC UID must be between 4-10 bytes (8-20 hex characters)",
      "param": "chip_uid",
      "location": "body"
    }
  ]
}
```

- **409 Conflict** (Duplicate chip_uid):
```json
{
  "message": "NFC chip already registered"
}
```
*Note: Identical message returned regardless of whether chip is owned by current user or another user (prevents UID enumeration)*

- **500 Internal Server Error**:
```json
{
  "message": "Failed to register NFC chip"
}
```

---

### GET /api/nfc/chips
Retrieve all NFC chips registered by the authenticated parent.

**Authentication**: Required (JWT token via httpOnly cookie)

**Query Parameters**: None

**Success Response (200 OK)**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "chip_uid": "04:5A:B2:C3:D4:E5:F6",
    "label": "Bens Chip",
    "created_at": "2025-10-19T12:34:56.789Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "chip_uid": "04:7B:C3:D4:E5:F6:08",
    "label": "Lisas Chip",
    "created_at": "2025-10-19T13:45:12.345Z"
  }
]
```

**Error Responses**:

- **401 Unauthorized** (Missing or invalid token):
```json
{
  "message": "Authentication required"
}
```

- **500 Internal Server Error**:
```json
{
  "message": "Failed to fetch NFC chips"
}
```

---

### DELETE /api/nfc/chips/:chipId
Permanently delete an NFC chip and cascade delete all associated video mappings.

**Authentication**: Required (JWT token via httpOnly cookie)

**URL Parameters**:
- `chipId`: UUID of the chip to delete

**Success Response (200 OK)**:
```json
{
  "message": "NFC chip deleted successfully"
}
```

**Error Responses**:

- **404 Not Found** (Chip not found or not owned by user):
```json
{
  "message": "NFC chip not found"
}
```

- **500 Internal Server Error**:
```json
{
  "message": "Failed to delete NFC chip"
}
```

**Database Behavior**:
- Deletes chip record from `nfc_chips` table
- CASCADE deletes all records in `video_nfc_mappings` table where `nfc_chip_id` matches deleted chip

---

## Database Schema

### nfc_chips Table

**Purpose**: Stores NFC chips registered by parents for Kids Mode access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique chip record identifier |
| user_id | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Parent account that owns the chip |
| chip_uid | VARCHAR(30) | NOT NULL, UNIQUE | Normalized NFC chip UID (uppercase with colons) |
| label | VARCHAR(50) | NOT NULL | Friendly name assigned by parent |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration timestamp |

**Indexes**:
- `PRIMARY KEY (id)` - Default primary key index
- `UNIQUE (chip_uid)` - **CRITICAL**: Enforces global uniqueness across all users
- `INDEX (user_id)` - Speeds up queries for chips owned by a specific user

**Foreign Keys**:
- `user_id` references `users(id)` ON DELETE CASCADE

**Business Rules**:
- `chip_uid` MUST be normalized to uppercase hex with colons (e.g., "04:5A:B2:C3:D4:E5:F6") via backend `normalizeNFCUID()` function
- `chip_uid` UNIQUE constraint prevents same physical chip from being registered by multiple users
- Deleting a user cascades to delete all their registered chips
- Maximum 20 chips per user (enforced via application logic, not database constraint)

---

### video_nfc_mappings Table (Context)

**Purpose**: Links NFC chips to specific videos for Kids Mode playback.

**Relevant Columns**:
- `nfc_chip_id`: UUID FOREIGN KEY → nfc_chips(id) **ON DELETE CASCADE**

**Cascade Behavior**:
When a chip is deleted from `nfc_chips`, all mappings referencing that chip are automatically removed.

---

## Non-Functional Requirements

### Performance

- **NFR-001**: POST /api/nfc/chips registration MUST complete within 2 seconds under normal network conditions
- **NFR-002**: GET /api/nfc/chips MUST return results within 1 second for accounts with up to 20 chips
- **NFR-003**: DELETE /api/nfc/chips/:chipId MUST complete within 2 seconds including cascade deletion
- **NFR-004**: NFC scan chip_uid detection MUST complete within 3 seconds of physical chip contact on supported devices
- **NFR-005**: Frontend chip list rendering MUST complete within 500ms for up to 20 chips

### Security

- **NFR-006**: All chip endpoints MUST require JWT authentication (except public scan endpoints)
- **NFR-007**: Server-side MUST normalize chip_uid before database insertion to prevent case-sensitivity bypass
- **NFR-008**: Server-side MUST validate chip_uid format to reject malformed input (prevent injection attacks)
- **NFR-009**: Duplicate chip registration MUST return identical error messages regardless of ownership (prevent UID enumeration)
- **NFR-010**: All NFC registration errors MUST be logged to Sentry with user_id, chip_uid (truncated), error_type for security monitoring
- **NFR-011**: DELETE endpoint MUST verify chip ownership before deletion (user can only delete their own chips)

### Accessibility

- **NFR-012**: Chip registration form MUST be fully keyboard navigable (Tab, Enter, Escape keys)
- **NFR-013**: NFC scan button MUST include ARIA label "Scan NFC chip" for screen readers
- **NFR-014**: Error messages MUST be announced to screen readers via ARIA live regions
- **NFR-015**: Chip list MUST include semantic HTML (proper heading levels, list structure)
- **NFR-016**: Manual entry fallback MUST be accessible to users with motor disabilities (no required NFC scanning)

### Usability

- **NFR-017**: Manual registration form MUST accept chip_uid with or without colons/spaces (flexible input)
- **NFR-018**: NFC scan button MUST only appear on devices with `NDEFReader` support (no false advertising)
- **NFR-019**: Chip deletion MUST require confirmation modal to prevent accidental deletion
- **NFR-020**: Duplicate registration error MUST suggest manual override option if applicable

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Coverage Target**: 80% minimum (per project constitution)

**Frontend Components**:
- `ChipRegistrationForm.test.tsx`:
  - Chip-ID format validation (valid: "04:5A:B2:C3:D4:E5:F6", "045AB2C3D4E5F6")
  - Invalid formats rejected (too short, non-hex, special characters)
  - Label validation (empty, too long >50 chars, special characters)
  - Form submission with valid data calls POST /api/nfc/chips
  - Duplicate registration displays error message
  - Manual entry mode vs NFC scan mode switching

- `NFCScanButton.test.tsx`:
  - NFC capability detection (`NDEFReader in window`)
  - Button hidden on non-NFC devices (iOS, desktop)
  - Button visible on NFC-capable devices (Chrome 89+ Android)
  - Scan success auto-fills chip_uid field
  - Scan failure displays user-friendly error message
  - Scan cancellation clears loading state

- `ChipManager.test.tsx`:
  - Renders list of registered chips from GET /api/nfc/chips
  - Empty state message when no chips registered
  - Chip deletion triggers DELETE /api/nfc/chips/:chipId
  - Confirmation modal before deletion
  - Immediate UI update after deletion
  - Error handling for failed deletion

**Backend Services** (backend/src/routes/nfc.test.js):
- `validateNFCUID()`:
  - Valid UIDs accepted (4-10 bytes, hex only)
  - Invalid UIDs rejected (too short <8 chars, too long >20 chars, non-hex)

- `normalizeNFCUID()`:
  - Removes spaces, hyphens, colons
  - Converts to uppercase
  - Adds colons every 2 characters
  - Examples: "045ab2c3d4e5f6" → "04:5A:B2:C3:D4:E5:F6"

- POST /api/nfc/chips:
  - Returns 201 with chip object on success
  - Returns 409 when chip_uid already exists
  - Returns 400 for validation errors
  - Identical error message for duplicate regardless of ownership

- DELETE /api/nfc/chips/:chipId:
  - Returns 200 on success
  - Returns 404 when chip not found or not owned
  - Cascades deletion to video_nfc_mappings

---

### Integration Tests (Supertest + Jest)

**Backend API Endpoints**:
- POST /api/nfc/chips with valid data returns 201 with normalized chip_uid
- POST /api/nfc/chips with duplicate chip_uid returns 409 (test twice: same user, different user)
- GET /api/nfc/chips returns only chips owned by authenticated user
- DELETE /api/nfc/chips/:chipId removes chip and associated mappings
- DELETE /api/nfc/chips/:chipId returns 404 when trying to delete another user's chip

**Database Constraints**:
- Verify nfc_chips.chip_uid UNIQUE constraint prevents duplicates at DB level
- Verify ON DELETE CASCADE removes video_nfc_mappings when chip deleted

---

### E2E Tests (Playwright)

**Test Scenarios** (test/e2e/nfc-chip-registration.spec.js):

1. **Manual Registration Workflow**:
   - User logs in as parent
   - Navigates to NFC Chips page
   - Clicks "Register Chip" button
   - Fills in chip_uid "04:5A:B2:C3:D4:E5:F6" and label "Test Chip"
   - Clicks "Save"
   - Verifies chip appears in chip list
   - Refreshes page and verifies persistence

2. **Duplicate Registration Error**:
   - User registers chip with UID "04:5A:B2:C3:D4:E5:F6"
   - Attempts to register same UID again
   - Verifies error message "NFC chip already registered" displayed
   - Form remains open for correction

3. **NFC Scan Registration** (mocked on non-Android devices):
   - Mock `NDEFReader` if not available
   - User clicks "Scan NFC Chip" button
   - Simulates scan returning UID "04:7B:C3:D4:E5:F6:08"
   - Verifies chip_uid field auto-filled
   - User enters label "Scanned Chip"
   - Clicks "Save"
   - Verifies chip appears in list

4. **Chip Deletion Workflow**:
   - User registers 2 chips
   - Clicks delete button on first chip
   - Confirms deletion in modal
   - Verifies chip removed from list immediately
   - Refreshes page and verifies chip still deleted
   - Verifies second chip still present

5. **Validation Errors**:
   - Attempt to submit with empty label → displays error
   - Attempt to submit with invalid chip_uid "ZZZZZ" → displays error
   - Attempt to submit with too-short UID "04:5A" → displays error

6. **NFC Button Visibility**:
   - On non-NFC device (desktop, iOS): Scan button hidden
   - On NFC device (Chrome 89+ Android): Scan button visible

---

### Manual Testing Checklist

**Device Compatibility**:
- [ ] Test on Chrome 89+ Android (NFC scan works)
- [ ] Test on iOS Safari (manual entry only, no scan button)
- [ ] Test on desktop Chrome (manual entry only, no scan button)
- [ ] Test on Edge Android (NFC scan works)

**Error Scenarios**:
- [ ] Interrupt NFC scan mid-read → graceful error
- [ ] Attempt to register 21st chip → error message
- [ ] Network failure during registration → error message

---

## Out of Scope *(optional)*

- Encoding data onto NFC chips (write operations)
- Bulk import of chip registrations
- Sharing chips between multiple parent accounts
- Chip history or usage statistics
- Integration with physical NFC readers beyond smartphone/tablet
