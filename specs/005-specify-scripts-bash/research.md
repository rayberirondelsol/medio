# Research: NFC Chip Registration Implementation

**Date**: 2025-10-19
**Feature**: NFC Chip Registration
**Branch**: 005-specify-scripts-bash

## Overview

This document consolidates research findings for implementing NFC chip registration with two methods (manual entry and NFC scanning), focusing on security, performance, and UX best practices.

## 1. Web NFC API Best Practices

### Decision
Use Web NFC API (NDEFReader) with progressive enhancement - provide manual input fallback for unsupported devices.

### Rationale

**Browser Support:**
- **Supported**: Chrome 89+ (February 2021), Edge 89+ on **Android only**
- **NOT Supported**: iOS Safari, Desktop browsers (all platforms)
- **Detection**: `"NDEFReader" in window`

**Key Implementation Points:**

1. **Feature Detection**: Check for NDEFReader before showing scan button
2. **Timeout Handling**: 30-second timeout using AbortController
3. **Error Types**:
   - `NotAllowedError`: Permission denied
   - `NotSupportedError`: NFC unavailable
   - `InvalidStateError`: NFC disabled
   - `AbortError`: Scan cancelled
   - `NetworkError`: Hardware failure
   - `NotReadableError`: Incompatible tag
4. **User Feedback**: Visual scanning animation, status messages, vibration on success
5. **Cancellation**: Explicit cancel button with `controller.abort()`

**Existing Implementation Gap:**
Current NFCScanner component (src/components/NFCScanner.tsx) has basic structure but missing:
- Timeout handling
- AbortController cancellation
- Detailed error type differentiation
- Permission denied handling

### Alternatives Considered
- **Third-party NFC libraries**: Rejected (no mature React/TS options; Web NFC is W3C standard)
- **Manual entry only**: Rejected (poor UX for compatible devices; kept as fallback)
- **Native mobile app**: Rejected (out of scope for web application)

### Security Considerations
- HTTPS required in production (already enforced via Fly.io)
- Explicit user permission required (browser-level)
- Validate scanned UID format before use

---

## 2. Global Uniqueness Enforcement

### Decision
Use database-level UNIQUE constraint on `nfc_chips.chip_uid` column (already implemented).

### Rationale

**Current Schema** (backend/src/db/migrate.js:66):
```sql
chip_uid VARCHAR(255) UNIQUE NOT NULL,
```

**Why Global (Not Per-User):**
- Physical NFC chips have globally unique UIDs (IEEE/NFC Forum standard)
- Same chip cannot be owned by two parent accounts simultaneously
- Prevents chip ownership conflicts in Kids Mode

**Performance:**
- UNIQUE constraint creates automatic B-tree index
- Index size for 100,000 chips: ~10-20 MB
- Lookup time: <5ms on modern PostgreSQL
- No performance concerns for expected scale

**Error Handling:**
PostgreSQL error code 23505 (unique_violation) already handled in nfc.js:73:
```javascript
if (error.code === '23505') {
  return res.status(409).json({ message: 'NFC chip already registered' });
}
```

### Alternatives Considered
- **Composite UNIQUE (user_id, chip_uid)**: Rejected (allows multiple owners for same physical chip)
- **Application-level check**: Rejected (race condition vulnerability, slower)
- **Distributed lock**: Rejected (overly complex, requires Redis)

### Implementation
No migration needed - constraint already exists in schema.

---

## 3. Timing Attack Prevention

### Decision
Return identical error messages for duplicate registrations regardless of ownership. Rate limiting provides primary defense against enumeration.

### Rationale

**Vulnerability:**
Attackers could enumerate valid chip UIDs by measuring response times:
- Fast (~50ms): UID not in database
- Slow (~150ms): UID exists, ownership check performed

**Defense Layers:**
1. **Identical error messages** (primary): "NFC chip already registered" for all 409 errors
2. **Rate limiting** (secondary): 10 requests per 15 minutes (see Topic 4)
3. **Sentry monitoring** (detection): Log suspicious patterns
4. **Response time normalization** (optional): Add random 0-100ms delay

**Current Implementation:**
nfc.js:74 already returns generic message ✓

**Constant-Time Comparison:**
Node.js `crypto.timingSafeEqual()` available but not needed - database query timing dominates, making application-level timing-safe comparison ineffective.

### Alternatives Considered
- **Random delay on every response**: Rejected (degrades UX, still vulnerable to statistics)
- **CAPTCHA on registration**: Rejected (overkill, poor UX)
- **Logging only**: Rejected (passive defense insufficient)

### Recommendation
**Essential**: Identical error messages (✓ implemented)
**High priority**: Rate limiting (see Topic 4)
**Optional**: Response time normalization (only if high-security needs)

---

## 4. Rate Limiting Strategy

### Decision
Tiered rate limiting using express-rate-limit 7.5.1:
- **POST /api/nfc/chips**: 10 requests per 15 minutes per user
- **DELETE /api/nfc/chips/:chipId**: 20 requests per 15 minutes per user
- **GET /api/nfc/chips**: 100 requests per 15 minutes (general API limit)

### Rationale

**Threat Model:**
1. **UID Enumeration**: Attacker tries thousands of chip UIDs → Mitigated by 10 req/15min POST limit
2. **DoS Attack**: Attacker floods endpoint → Mitigated by rate limiting + Fly.io autoscaling
3. **Legitimate Use**: Parent registering 10 chips → 1 chip per 90 seconds (reasonable)

**Industry Standards:**
- GitHub API: 5000 req/hour (write operations)
- Stripe API: 100 req/sec (very high)
- Auth0: 10 req/sec user creation
- **Common pattern**: Write 10-20 req/min; Read 100-500 req/min

**Existing Infrastructure:**
backend/src/server.js already has:
- General API limiter: 100 req/15min (line 101-104) ✓
- Auth endpoints: 5 req/15min (line 107-113) ✓
- **Gap**: No specific NFC mutation endpoint limiters

**Configuration:**
```javascript
const nfcChipRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many chip registration attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // Per-user preferred
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many chip registration attempts',
      retryAfter: req.rateLimit.resetTime
    });
  }
});
```

### Alternatives Considered
- **Stricter (5 req/15min)**: Rejected (too restrictive for batch registration)
- **More lenient (30 req/15min)**: Rejected (increases enumeration risk)
- **Dynamic rate limiting**: Rejected (complex, benefit doesn't justify cost)
- **Token bucket algorithm**: Rejected (sliding window sufficient)

### Implementation
Add to backend/src/server.js after existing rate limiters.

---

## 5. HTML Sanitization

### Decision
Use express-validator 7.2.1 `escape()` + character allowlist for HTML entity encoding.

### Rationale

**Current Pattern** (backend/src/routes/videos.js:55):
```javascript
body('title').notEmpty().trim().escape(),
```

**express-validator escape() Effectiveness:**
- Converts: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, `"` → `&quot;`, `'` → `&#x27;`
- Uses validator.js (well-tested library)
- Prevents stored XSS attacks

**React Built-in Protection:**
React automatically escapes text in JSX:
```tsx
<div>{chip.label}</div> // Safe - React escapes by default
```

**Spec Requirement (FR-012):**
"Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), apostrophes (')"

**Recommended Implementation:**
```javascript
body('label')
  .notEmpty()
  .trim()
  .isLength({ min: 1, max: 50 })
  .matches(/^[a-zA-Z0-9\s\-']+$/)
  .withMessage('Label can only contain letters, numbers, spaces, hyphens, and apostrophes')
  .escape()
```

**Defense in Depth:**
1. **Layer 1**: Input validation (character allowlist) - Reject malicious input
2. **Layer 2**: express-validator escape() - Encode HTML entities
3. **Layer 3**: React JSX escaping - Prevent rendering as HTML
4. **Layer 4**: CSP headers - Block inline scripts (already in server.js:53-72)

### Alternatives Considered
- **DOMPurify**: Rejected (overkill for plain text, 20KB minified)
- **Custom regex sanitization**: Rejected (silent data modification confuses users)
- **No sanitization**: Rejected (single point of failure violates defense-in-depth)
- **xss npm package**: Rejected (8KB, still overkill when built-in solution exists)

### Testing Requirements
- `<script>alert('xss')</script>` → Rejected by allowlist OR escaped
- `Ben's Chip` → Pass validation
- `Lisa-2` → Pass validation
- `Ben's 🎮 Chip` → Rejected with clear error

---

## 6. Cascading Deletion

### Decision
Use PostgreSQL `ON DELETE CASCADE` foreign key constraints (already implemented).

### Rationale

**Current Schema** (backend/src/db/migrate.js:78):
```sql
nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id) ON DELETE CASCADE,
```

Also line 23: `user_id REFERENCES users(id) ON DELETE CASCADE` (chips deleted when parent deleted)

**How It Works:**
1. `DELETE FROM nfc_chips WHERE id = 'chip-uuid'`
2. PostgreSQL automatically: `DELETE FROM video_nfc_mappings WHERE nfc_chip_id = 'chip-uuid'`
3. Both operations in same transaction (atomic)

**Cascade Chain:**
```
users (parent account)
  ↓ ON DELETE CASCADE
nfc_chips
  ↓ ON DELETE CASCADE
video_nfc_mappings
```

**Edge Case - Active Kids Mode Session:**
- Child scans chip → Receives video
- Parent deletes chip → Mapping deleted
- Child's active session continues (not interrupted)
- Child rescans same chip → 404 "No video assigned"

**Performance:**
- Single chip: <10ms (O(1) primary key lookup + O(log n) cascade)
- Bulk deletion (10 chips, 30 mappings): <100ms
- 100,000 chips scale: No concerns (B-tree index logarithmic)

**Testing Strategy:**
```javascript
test('DELETE cascades to video_nfc_mappings', async () => {
  const chip = await registerChip('AABBCCDD', 'Test');
  const mapping = await createMapping(chip.id, video.id);

  await deleteChip(chip.id);

  const exists = await queryMapping(mapping.id);
  expect(exists).toBe(null); // Mapping deleted
});
```

### Alternatives Considered
- **Application-level cascade**: Rejected (race conditions, manual transactions)
- **Soft delete (deleted_at timestamp)**: Rejected (complicates queries, blocks re-registration)
- **ON DELETE SET NULL**: Rejected (orphaned mappings, complicates Kids Mode)
- **ON DELETE RESTRICT**: Rejected (poor UX, parent must delete mappings first)

### Implementation
No migration needed - constraint already exists. Verify with:
```bash
psql $DATABASE_URL -c "\d video_nfc_mappings"
```

---

## Summary & Implementation Priority

### Phase 1 (Security Critical)
1. **Rate limiting**: Add NFC-specific limiters (10/15min POST, 20/15min DELETE)
2. **Input validation**: Add character allowlist regex to label validation
3. **Identical errors**: Verify 409 responses don't leak ownership info

### Phase 2 (UX Critical)
4. **NFC error handling**: Add detailed error types, timeout, cancellation
5. **Scan timeout**: Implement 30s AbortController timeout

### Phase 3 (Verification)
6. **Cascading deletion**: Verify existing ON DELETE CASCADE works correctly
7. **Global uniqueness**: Verify UNIQUE constraint prevents cross-user duplicates

### No Implementation Needed
- Global uniqueness constraint ✓ Already implemented
- Cascading deletion ✓ Already implemented

### Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| NFC Scanning | Web NFC API (NDEFReader) | W3C standard, Chrome/Edge Android 89+ |
| Browser Detection | `"NDEFReader" in window` | Standard feature detection |
| Rate Limiting | express-rate-limit 7.5.1 | Already installed, proven solution |
| Input Sanitization | express-validator escape() | Already used in codebase |
| Database Constraints | PostgreSQL UNIQUE + CASCADE | Native, reliable, performant |
| Error Logging | Sentry | Already configured in project |

---

## References

**Codebase Files:**
- `backend/src/db/migrate.js` - Database schema
- `backend/src/routes/nfc.js` - NFC API endpoints
- `backend/src/server.js` - Rate limiting config
- `src/components/NFCScanner.tsx` - Current NFC implementation
- `specs/005-specify-scripts-bash/spec.md` - Feature specification

**External Standards:**
- W3C Web NFC API Specification
- PostgreSQL Foreign Key Documentation
- OWASP XSS Prevention Cheat Sheet
- IEEE/NFC Forum UID Standards
