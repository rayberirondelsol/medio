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
- **FR-010**: System MUST validate Chip-ID format (hexadecimal format with colons like "04:5A:B2:C3:D4:E5:F6", 7 or 10 bytes)
- **FR-011**: System MUST ensure each chip can only be registered by one parent account
- **FR-012**: System MUST validate that friendly name is not empty and within reasonable length limits

### Key Entities *(include if feature involves data)*

- **NFC Chip**: Represents a physical NFC chip with unique identifier, friendly name assigned by parent, registration date, and association to parent account
- **Parent Account**: User account that owns and manages registered NFC chips
- **Chip Registration**: Links a chip to a parent account with timestamp and friendly name

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parents can manually register a chip in under 30 seconds
- **SC-002**: Parents can register a chip via NFC scan in under 15 seconds (on supported devices)
- **SC-003**: Registered chips appear in chip manager list within 1 second of registration
- **SC-004**: 100% of duplicate chip registration attempts are blocked with clear error message
- **SC-005**: Chip data persists correctly across browser refreshes and re-logins
- **SC-006**: NFC scan button is visible on 100% of NFC-capable devices and hidden on non-capable devices
- **SC-007**: Parents can successfully delete chips with immediate removal from UI and backend

## Assumptions *(optional)*

- NFC chips use standard NFC Forum Type 2 or Type 4 tags
- Web NFC API is available on modern Android devices with Chrome/Edge browsers
- iOS devices may not support Web NFC API (manual entry remains available)
- Chip IDs are typically 7 or 10 bytes in hexadecimal format
- Maximum number of chips per parent account is 20 (reasonable default)
- Chip-ID format validation allows common NFC UID formats

## Out of Scope *(optional)*

- Encoding data onto NFC chips (write operations)
- Bulk import of chip registrations
- Sharing chips between multiple parent accounts
- Chip history or usage statistics
- Integration with physical NFC readers beyond smartphone/tablet
