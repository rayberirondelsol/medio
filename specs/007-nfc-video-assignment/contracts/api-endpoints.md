# API Contracts: NFC Chip Video Assignment

**Feature**: 007-nfc-video-assignment
**Date**: 2025-10-24

## Endpoints

### 1. GET /api/nfc/chips/:chipId/videos

Get all videos assigned to an NFC chip in sequence order.

**Auth**: Required (httpOnly cookie)

**URL Parameters**:
- `chipId` (UUID, required): NFC chip ID

**Response 200**:
```json
{
  "chip": {
    "id": "uuid",
    "label": "Peppa Pig Chip",
    "chip_uid": "04A3B2C1D5E6F788"
  },
  "videos": [
    {
      "id": "uuid",
      "title": "Peppa Goes Swimming",
      "thumbnail_url": "https://...",
      "duration_seconds": 300,
      "platform_name": "YouTube",
      "sequence_order": 1,
      "mapping_id": "uuid"
    }
  ]
}
```

**Response 404**: Chip not found or not owned by user
**Response 401**: Unauthorized (no valid session)

---

### 2. PUT /api/nfc/chips/:chipId/videos

Batch update video assignments for an NFC chip (replaces all existing assignments).

**Auth**: Required (httpOnly cookie)

**URL Parameters**:
- `chipId` (UUID, required): NFC chip ID

**Request Body**:
```json
{
  "videos": [
    { "video_id": "uuid", "sequence_order": 1 },
    { "video_id": "uuid", "sequence_order": 2 },
    { "video_id": "uuid", "sequence_order": 3 }
  ]
}
```

**Validation Rules**:
- Max 50 videos (FR-010)
- Sequence must be contiguous (1, 2, 3, ...)
- All video_ids must exist and belong to authenticated user
- Chip must belong to authenticated user
- No duplicate video_ids

**Response 200**:
```json
{
  "message": "Video assignments updated successfully",
  "count": 3
}
```

**Response 400**: Validation error (invalid sequence, too many videos, etc.)
**Response 404**: Chip not found
**Response 409**: One or more videos not found
**Response 401**: Unauthorized

---

### 3. DELETE /api/nfc/chips/:chipId/videos/:videoId

Remove a video from an NFC chip. Remaining videos are automatically re-sequenced.

**Auth**: Required (httpOnly cookie)

**URL Parameters**:
- `chipId` (UUID, required): NFC chip ID
- `videoId` (UUID, required): Video ID to remove

**Response 200**:
```json
{
  "message": "Video removed from chip successfully",
  "remaining_videos": 2
}
```

**Side Effect**: Remaining videos are re-sequenced (e.g., if videos were 1,2,3 and #2 is removed, remaining become 1,2)

**Response 404**: Mapping not found
**Response 401**: Unauthorized

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": ["Validation error details"]
  }
}
```

**Common Error Codes**:
- `MAX_VIDEOS_EXCEEDED`: More than 50 videos
- `NON_CONTIGUOUS_SEQUENCE`: Sequence has gaps (e.g., 1, 3, 5)
- `INVALID_VIDEO_IDS`: One or more videos don't exist or don't belong to user
- `UNAUTHORIZED_CHIP`: Chip doesn't belong to user
- `DUPLICATE_VIDEO`: Same video assigned multiple times

---

**Status**: ✅ Complete
**Next**: See test-spec-unit.md and test-spec-e2e.md for test specifications
