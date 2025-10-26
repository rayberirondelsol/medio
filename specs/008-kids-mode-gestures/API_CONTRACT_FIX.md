# API Contract Bug Fix - Kids Mode

**Priority:** 🚨 CRITICAL BLOCKER
**Effort:** 15 minutes
**File:** `src/pages/KidsMode.tsx`
**Lines:** 91-130

---

## Problem

Frontend and backend have mismatched API contracts for `/api/nfc/scan/public`:

- **Backend returns:** Video object directly
- **Frontend expects:** `{ chip: { id, ... } }` wrapper object

**Result:** Kids Mode shows "NFC chip not registered" error even when chip is valid and has assigned videos.

---

## Backend Response (Actual)

```json
{
  "id": "b0e59dda-c935-4090-8c37-e1b24ed71e1e",
  "user_id": "a3862a38-6918-4319-bd43-e8a1bf29bf14",
  "platform_id": "ef72d232-9fac-45ef-8d9c-5c572d2b2668",
  "title": "Peppa Wutz - Die Prinzessinnenparty",
  "description": null,
  "thumbnail_url": null,
  "platform_video_id": "pN49ZPeO4tk",
  "duration_seconds": null,
  "age_rating": "G",
  "created_at": "2025-10-24T08:28:54.015Z",
  "updated_at": "2025-10-24T08:28:54.015Z",
  "video_url": "https://youtu.be/pN49ZPeO4tk?si=QEIMq4A3nr20_5GY",
  "channel_name": null,
  "max_watch_time_minutes": null,
  "platform_name": "YouTube"
}
```

**Note:** Backend returns the FIRST video assigned to chip (with `LIMIT 1`)

---

## Frontend Code (Current - BROKEN)

```typescript
// src/pages/KidsMode.tsx:91-130

const handleScan = async (chipUID: string) => {
  const controller = RequestManager.createController('scanChip');

  try {
    setError('');

    // 1. Scan NFC chip to get chip ID
    const scanResponse = await axiosInstance.post('/nfc/scan/public', {
      chip_uid: chipUID
    }, { signal: controller.signal });

    const chip = scanResponse.data.chip;  // ❌ chip is undefined!

    if (!chip || !chip.id) {  // ❌ Always true - triggers error
      setError('NFC chip not registered. Ask a grown-up to set it up!');
      return;  // ❌ Execution stops here
    }

    setCurrentChip(chip);

    // 2. Fetch videos assigned to this chip
    const videosController = RequestManager.createController('fetchVideos');
    const videosResponse = await axiosInstance.get(
      `/nfc/chips/${chip.id}/videos`,  // ❌ Never reached
      { signal: videosController.signal }
    );

    const videos = videosResponse.data.videos || [];

    if (videos.length === 0) {
      setChipVideos([]);
      setShowScanner(false);
      setShowVideoPlayer(true);
      return;
    }

    const sortedVideos = videos.sort(
      (a: Video, b: Video) => (a.sequence_order || 0) - (b.sequence_order || 0)
    );

    setChipVideos(sortedVideos);
    setShowScanner(false);
    setShowVideoPlayer(true);

  } catch (error) {
    // Error handling...
  }
};
```

---

## Solution: Update Frontend to Match Backend

### Option 1: Single API Call (RECOMMENDED - Simpler)

**Assumption:** Backend returns first video only (current behavior with `LIMIT 1`)

```typescript
// src/pages/KidsMode.tsx:91-130 (FIXED)

const handleScan = async (chipUID: string) => {
  const controller = RequestManager.createController('scanChip');

  try {
    setError('');

    // Scan NFC chip - backend returns first video directly
    const scanResponse = await axiosInstance.post('/nfc/scan/public', {
      chip_uid: chipUID
    }, { signal: controller.signal });

    const video = scanResponse.data;  // ✅ Video object, not chip

    if (!video || !video.id) {
      setError('No video assigned to this chip. Ask a grown-up to add videos!');
      return;
    }

    // Use single video from scan response
    setChipVideos([video]);  // ✅ Wrap in array for player
    setShowScanner(false);
    setShowVideoPlayer(true);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') {
        setError('Scan was cancelled');
      } else if (error.response?.status === 404) {
        setError('No video assigned to this chip. Ask a grown-up!');
      } else {
        setError(error.response?.data?.message || 'Failed to scan NFC chip');
      }
    } else {
      setError('Failed to scan NFC chip');
    }
  }
};
```

**Pros:**
- Simple - one API call instead of two
- No breaking changes to backend
- Works with current backend implementation

**Cons:**
- Only plays first video (sequential playback requires backend update)
- Removes `currentChip` state (may be needed for other features)

---

### Option 2: Two-Step Flow (If Multiple Videos Needed)

**Requires:** Backend update to return chip data

**Backend Change** (`backend/src/routes/nfc.js:219`):
```javascript
// Return both chip and video data
const chipResult = await pool.query(
  'SELECT * FROM nfc_chips WHERE chip_uid = $1',
  [normalizedUID]
);

res.json({
  chip: chipResult.rows[0],
  video: result.rows[0]  // First video
});
```

**Frontend** (minimal changes):
```typescript
const scanResponse = await axiosInstance.post('/nfc/scan/public', {
  chip_uid: chipUID
});

const { chip, video } = scanResponse.data;  // ✅ Now both available

if (!chip || !chip.id) {
  setError('NFC chip not registered. Ask a grown-up to set it up!');
  return;
}

setCurrentChip(chip);

// Fetch ALL videos for sequential playback
const videosController = RequestManager.createController('fetchVideos');
const videosResponse = await axiosInstance.get(
  `/nfc/chips/${chip.id}/videos`,
  { signal: videosController.signal }
);

const videos = videosResponse.data.videos || [];
// ... rest of logic unchanged
```

**Pros:**
- Maintains two-step flow (scan → fetch videos)
- Supports sequential playback (all videos)
- Keeps `currentChip` state for future features

**Cons:**
- Requires backend change
- More complex (two API calls)

---

## Recommendation

**Use Option 1** (single API call) for immediate fix:

**Why:**
1. No backend changes needed ✅
2. Simpler code ✅
3. Faster to implement (15 minutes) ✅
4. Can refactor later if multi-video playback needed

**Sequential Playback Note:**
- Current backend returns `LIMIT 1` (first video only)
- For full sequential playback, backend needs update to return ALL videos
- Can add this in future iteration

---

## Testing After Fix

```bash
# 1. Apply fix to src/pages/KidsMode.tsx
# 2. Build and deploy
npm run build
flyctl deploy

# 3. Test manually
open https://medio-react-app.fly.dev/kids
# Enter chip UID: 04:5A:B2:C3:D4:E5:F6
# Click "Scan Chip"
# Expected: Video player loads with "Peppa Wutz" video

# 4. Run E2E test
npm run test:e2e tests/e2e/kids-mode-flow.spec.ts
```

---

## Related Files

- **Frontend:** `src/pages/KidsMode.tsx` (lines 91-130)
- **Backend:** `backend/src/routes/nfc.js` (lines 163-225)
- **Test:** `tests/e2e/kids-mode-flow.spec.ts`
- **Spec:** `specs/008-kids-mode-gestures/spec.md`
- **Tasks:** `specs/008-kids-mode-gestures/tasks.md`

---

## Verification Checklist

- [ ] Applied code fix to `src/pages/KidsMode.tsx`
- [ ] Removed `scanResponse.data.chip` logic
- [ ] Updated error messages
- [ ] Tested with valid chip UID (04:5A:B2:C3:D4:E5:F6)
- [ ] Tested with invalid chip UID
- [ ] Video player loads correctly
- [ ] No console errors
- [ ] Deployed to production
- [ ] E2E test passes

---

**Created:** 2025-10-26
**Status:** Ready to implement
**Estimated Fix Time:** 15 minutes
