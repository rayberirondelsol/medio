# Quickstart: Add Video via Link

**Date**: 2025-10-17
**Feature**: Add Video via Link
**Phase**: 1 (Design & Contracts)

This guide helps developers quickly understand and implement the "Add Video via Link" feature using Test-Driven Development (TDD).

---

## Overview

**Goal**: Enable parents to add videos to their family library by pasting URLs from YouTube, Vimeo, or Dailymotion.

**Key Components**:
- Backend: Platform UUID endpoint, metadata fetch service, video validation
- Frontend: URL parser, metadata auto-fill, error handling, modal UI
- TDD Workflow: Write tests first, then implement

**Timeline Estimate**: 3-5 days (following TDD workflow)

---

## Prerequisites

### Environment Setup

```bash
# 1. Ensure you're on the feature branch
git checkout 002-add-video-link

# 2. Start Docker containers (Docker-First Development - Principle V)
make dev

# 3. Verify containers are running
docker ps
# Should see: backend, frontend, postgres containers

# 4. Install dependencies (if not already installed)
cd backend && npm install
cd ../frontend && npm install
```

### API Keys Required

Add to `backend/.env`:

```bash
# YouTube Data API v3 key (get from Google Cloud Console)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Vimeo API (optional for Phase 1, free tier sufficient)
# VIMEO_ACCESS_TOKEN=your_vimeo_token_here

# Dailymotion API (public API, no key required for public videos)
```

**Getting YouTube API Key**:
1. Go to https://console.cloud.google.com/
2. Create project → Enable "YouTube Data API v3"
3. Create credentials → API Key
4. Restrict key to YouTube Data API v3 only

---

## Development Workflow (TDD)

### Phase 1: Backend - Platform UUID Endpoint

**Test First** (backend/tests/integration/platforms.test.js):

```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/platforms', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.headers['set-cookie'];
  });

  test('should return list of platforms with UUIDs', async () => {
    const res = await request(app)
      .get('/api/platforms')
      .set('Cookie', authToken)
      .expect(200);

    expect(res.body.platforms).toBeDefined();
    expect(res.body.platforms.length).toBeGreaterThan(0);

    const youtube = res.body.platforms.find(p => p.name === 'youtube');
    expect(youtube).toBeDefined();
    expect(youtube.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(youtube.requiresAuth).toBe(false);
  });

  test('should return 401 without authentication', async () => {
    await request(app)
      .get('/api/platforms')
      .expect(401);
  });
});
```

**Run Test** (should FAIL):

```bash
cd backend
npm test -- platforms.test.js
# Expected: Test fails because endpoint doesn't exist yet
```

**Implement** (backend/src/routes/platforms.js):

```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, requires_auth FROM platforms ORDER BY name'
    );

    res.json({
      platforms: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        requiresAuth: row.requires_auth
      }))
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

module.exports = router;
```

**Register Route** (backend/src/app.js):

```javascript
const platformsRouter = require('./routes/platforms');
app.use('/api/platforms', platformsRouter);
```

**Run Test Again** (should PASS):

```bash
npm test -- platforms.test.js
# Expected: All tests pass
```

---

### Phase 2: Frontend - URL Parser Utility

**Test First** (frontend/src/utils/urlParser.test.ts):

```typescript
import { parseVideoUrl, isValidVideoUrl } from './urlParser';

describe('parseVideoUrl', () => {
  describe('YouTube', () => {
    test('parses standard watch URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('parses short URL', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('parses embed URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('parses mobile URL', () => {
      const result = parseVideoUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Vimeo', () => {
    test('parses standard URL', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789');
      expect(result.platform).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
    });

    test('parses player URL', () => {
      const result = parseVideoUrl('https://player.vimeo.com/video/123456789');
      expect(result.platform).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
    });
  });

  describe('Dailymotion', () => {
    test('parses standard URL', () => {
      const result = parseVideoUrl('https://www.dailymotion.com/video/x8abcde');
      expect(result.platform).toBe('dailymotion');
      expect(result.videoId).toBe('x8abcde');
    });

    test('parses short URL', () => {
      const result = parseVideoUrl('https://dai.ly/x8abcde');
      expect(result.platform).toBe('dailymotion');
      expect(result.videoId).toBe('x8abcde');
    });
  });

  describe('Invalid URLs', () => {
    test('returns null for invalid URL', () => {
      const result = parseVideoUrl('not a url');
      expect(result.platform).toBeNull();
      expect(result.videoId).toBeNull();
    });

    test('returns null for unsupported platform', () => {
      const result = parseVideoUrl('https://www.twitch.tv/videos/12345');
      expect(result.platform).toBeNull();
      expect(result.videoId).toBeNull();
    });
  });
});

describe('isValidVideoUrl', () => {
  test('returns true for valid YouTube URL', () => {
    expect(isValidVideoUrl('https://youtube.com/watch?v=abc')).toBe(true);
  });

  test('returns false for invalid URL', () => {
    expect(isValidVideoUrl('not a url')).toBe(false);
  });
});
```

**Run Test** (should FAIL):

```bash
cd frontend
npm test -- urlParser.test.ts
# Expected: Test fails because urlParser.ts doesn't exist
```

**Implement** (frontend/src/utils/urlParser.ts):

```typescript
export interface ParsedVideoUrl {
  platform: 'youtube' | 'vimeo' | 'dailymotion' | null;
  videoId: string | null;
  originalUrl: string;
}

export function parseVideoUrl(url: string): ParsedVideoUrl {
  const trimmed = url.trim();

  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { platform: 'youtube', videoId: match[1], originalUrl: trimmed };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];

  for (const pattern of vimeoPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { platform: 'vimeo', videoId: match[1], originalUrl: trimmed };
    }
  }

  // Dailymotion patterns
  const dailymotionPatterns = [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of dailymotionPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { platform: 'dailymotion', videoId: match[1], originalUrl: trimmed };
    }
  }

  return { platform: null, videoId: null, originalUrl: trimmed };
}

export function isValidVideoUrl(url: string): boolean {
  const parsed = parseVideoUrl(url);
  return parsed.platform !== null && parsed.videoId !== null;
}
```

**Run Test Again** (should PASS):

```bash
npm test -- urlParser.test.ts
# Expected: All tests pass
```

---

### Phase 3: Backend - YouTube Metadata Service

**Test First** (backend/tests/unit/services/youtubeService.test.js):

```javascript
const youtubeService = require('../../../src/services/youtubeService');
const axios = require('axios');

jest.mock('axios');

describe('YouTubeService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches metadata for valid video ID', async () => {
    const mockResponse = {
      data: {
        items: [{
          snippet: {
            title: 'Test Video',
            description: 'Test Description',
            thumbnails: { high: { url: 'https://example.com/thumb.jpg' } },
            channelTitle: 'Test Channel'
          },
          contentDetails: {
            duration: 'PT3M32S' // 3 minutes 32 seconds
          }
        }]
      }
    };

    axios.get.mockResolvedValue(mockResponse);

    const result = await youtubeService.fetchMetadata('dQw4w9WgXcQ');

    expect(result.title).toBe('Test Video');
    expect(result.description).toBe('Test Description');
    expect(result.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    expect(result.duration).toBe(212); // Converted to seconds
    expect(result.channelName).toBe('Test Channel');
  });

  test('throws VIDEO_NOT_FOUND for empty items', async () => {
    axios.get.mockResolvedValue({ data: { items: [] } });

    await expect(youtubeService.fetchMetadata('invalid'))
      .rejects.toThrow('VIDEO_NOT_FOUND');
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    await expect(youtubeService.fetchMetadata('abc'))
      .rejects.toThrow('API_ERROR');
  });
});
```

**Implement** (backend/src/services/youtubeService.js):

```javascript
const axios = require('axios');

// Convert ISO 8601 duration to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchMetadata(videoId) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/videos';

  try {
    const response = await axios.get(url, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: API_KEY
      },
      timeout: 10000
    });

    if (response.data.items.length === 0) {
      throw new Error('VIDEO_NOT_FOUND');
    }

    const video = response.data.items[0];
    return {
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high.url,
      duration: parseDuration(video.contentDetails.duration),
      channelName: video.snippet.channelTitle
    };
  } catch (error) {
    if (error.message === 'VIDEO_NOT_FOUND') {
      throw error;
    }
    throw new Error('API_ERROR');
  }
}

module.exports = { fetchMetadata };
```

**Run Tests**:

```bash
npm test -- youtubeService.test.js
```

---

## Quick Testing Commands

### Run All Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# E2E (after implementation)
cd frontend && npx playwright test
```

### Coverage Reports

```bash
# Backend coverage
cd backend && npm run test:coverage

# Frontend coverage
cd frontend && npm run test:coverage

# Minimum 80% required (Constitution Principle III)
```

---

## Debugging Tips

### Backend API Issues

```bash
# Check backend logs
docker logs medio_backend

# Test platform endpoint manually
curl -X GET http://localhost:3001/api/platforms \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Test metadata endpoint
curl -X GET "http://localhost:3001/api/videos/metadata?platform=youtube&videoId=dQw4w9WgXcQ" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Frontend Development

```bash
# Start frontend with hot reload
make dev

# Check React DevTools for context state
# Install: https://react.devtools/

# Monitor network requests in browser DevTools
```

### Common Issues

**Issue**: YouTube API returns 403 Quota Exceeded

**Solution**:
- Check API key is valid
- Verify quota hasn't been exceeded (10,000 units/day)
- Use caching to reduce requests

**Issue**: platform_id validation fails

**Solution**:
- Ensure GET /api/platforms is called first
- Verify UUID format is correct (not string like "youtube")
- Check backend database has platform records

---

## Next Steps

After implementing and testing:

1. **Run `/speckit.tasks`** to generate task breakdown
2. **Execute `/speckit.implement`** to begin implementation
3. **Verify all 38 functional requirements** are met
4. **Check 8 success criteria** are achieved
5. **Run full E2E test suite** (Playwright)

---

## Resources

- **Spec**: [spec.md](./spec.md)
- **Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)
- **Constitution**: [/.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

**Questions?** Check the spec.md for detailed requirements or reach out to the team.
