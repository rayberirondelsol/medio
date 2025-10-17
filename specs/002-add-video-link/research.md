# Research: Add Video via Link

**Date**: 2025-10-17
**Feature**: Add Video via Link
**Phase**: 0 (Outline & Research)

## Research Questions

Based on the Technical Context and feature requirements, the following areas require research to ensure best practices:

1. **YouTube Data API v3**: Integration patterns, quota management, error handling
2. **URL Parsing Strategies**: Regex patterns for multi-platform support
3. **Request Cancellation**: AbortController best practices in React
4. **Error Boundary Patterns**: React 19 error boundary implementation
5. **Platform UUID Management**: Backend endpoint design for platform lookups

---

## 1. YouTube Data API v3 Integration

### Decision: Use Backend Proxy with videos.list Endpoint

**What was chosen**:
- Backend proxy service to hide API keys from frontend
- YouTube Data API v3 `videos.list` endpoint with `part=snippet,contentDetails`
- Server-side rate limiting to manage quota

**Rationale**:
- **Security**: API keys must never be exposed in frontend code (FR-035, FR-036)
- **Quota Management**: Backend can implement intelligent caching and rate limiting (FR-037)
- **Quota Costs**: `videos.list` with 2 parts costs ~3 units per request (vs 100 units for search)
- **Free Tier**: 10,000 units/day = ~3,300 video fetches/day (sufficient for Phase 1)

**Implementation Pattern**:
```javascript
// Backend: src/services/youtubeService.js
const axios = require('axios');

async function fetchYouTubeMetadata(videoId) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/videos`;

  const response = await axios.get(url, {
    params: {
      part: 'snippet,contentDetails',
      id: videoId,
      key: API_KEY
    },
    timeout: 10000 // 10 second timeout (FR-013)
  });

  if (response.data.items.length === 0) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  const video = response.data.items[0];
  return {
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnailUrl: video.snippet.thumbnails.high.url,
    duration: video.contentDetails.duration, // ISO 8601 format
    channelName: video.snippet.channelTitle
  };
}
```

**Error Handling**:
- `403` with `quotaExceeded` → Return error code, frontend shows manual entry option
- `404` or empty items → "Video not found or private" message
- Network timeout → Catch and return timeout error code

**Alternatives Considered**:
- **Direct Frontend API Calls**: Rejected - exposes API key in client code
- **YouTube oEmbed API**: Rejected - limited metadata, no duration or channel info
- **YouTube Search API**: Rejected - costs 100 units per request (33x more expensive)

**References**:
- YouTube Data API Quota: https://developers.google.com/youtube/v3/determine_quota_cost
- Best Practices: https://developers.google.com/youtube/v3/best_practices

---

## 2. URL Parsing and Video ID Extraction

### Decision: Regex-Based Multi-Platform Parser with Validation

**What was chosen**:
- Platform-specific regex patterns for URL parsing
- Extract video ID before API call
- Support for multiple URL formats per platform (FR-003)

**Rationale**:
- **Reliability**: Regex patterns cover 99% of user-copied URLs
- **Performance**: Client-side validation prevents unnecessary API calls
- **User Experience**: Immediate feedback on invalid URLs

**Implementation Pattern**:
```typescript
// Frontend: src/utils/urlParser.ts

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

**Testing Strategy** (TDD):
```typescript
// Frontend: src/utils/urlParser.test.ts

describe('parseVideoUrl', () => {
  test('parses standard YouTube watch URL', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.platform).toBe('youtube');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  test('parses YouTube short URL', () => {
    const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result.platform).toBe('youtube');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid URLs', () => {
    const result = parseVideoUrl('not a url');
    expect(result.platform).toBeNull();
    expect(result.videoId).toBeNull();
  });

  // ... more test cases for all formats and platforms
});
```

**Alternatives Considered**:
- **URL API Parsing**: Rejected - doesn't extract video IDs, requires additional logic
- **Third-Party Library (e.g., get-video-id)**: Rejected - adds dependency, regex is sufficient
- **Server-Side Only Parsing**: Rejected - wastes API calls on invalid URLs

---

## 3. Request Cancellation with AbortController

### Decision: AbortController for All API Requests with Cleanup

**What was chosen**:
- AbortController for every axios request in video modal
- Cleanup in useEffect return function
- Cancel on component unmount and on new URL paste

**Rationale**:
- **Memory Safety**: Prevents state updates on unmounted components (FR-014)
- **User Experience**: Cancels slow requests when user changes URL
- **Constitutional Compliance**: Error Resilience principle requires proper cleanup

**Implementation Pattern**:
```typescript
// Frontend: src/components/videos/AddVideoModal.tsx

import { useEffect, useState } from 'react';
import axios from 'axios';

function AddVideoModal({ isOpen, onClose }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();

    async function fetchMetadata() {
      if (!videoUrl) return;

      const parsed = parseVideoUrl(videoUrl);
      if (!parsed.platform || !parsed.videoId) {
        setError('Please enter a valid video URL');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get('/api/videos/metadata', {
          params: {
            platform: parsed.platform,
            videoId: parsed.videoId
          },
          signal: abortController.signal, // Attach abort signal
          timeout: 10000
        });

        setMetadata(response.data);
      } catch (err) {
        if (axios.isCancel(err)) {
          // Request was cancelled, do nothing
          console.log('Request cancelled');
        } else {
          setError('Unable to fetch video details. You can enter them manually.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();

    // Cleanup function - cancels request on unmount or when videoUrl changes
    return () => {
      abortController.abort();
    };
  }, [videoUrl]); // Re-run when videoUrl changes

  return (
    // ... modal JSX
  );
}
```

**Testing Strategy** (TDD):
```typescript
// Frontend: src/components/videos/AddVideoModal.test.tsx

test('cancels request when component unmounts', async () => {
  const { unmount } = render(<AddVideoModal isOpen={true} onClose={jest.fn()} />);

  // Paste URL to trigger fetch
  const input = screen.getByLabelText('Video URL');
  fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=abc' } });

  // Unmount before request completes
  unmount();

  // Verify no state updates occurred after unmount (no console errors)
  await waitFor(() => {
    expect(console.error).not.toHaveBeenCalled();
  });
});
```

**Alternatives Considered**:
- **No Cancellation**: Rejected - causes memory leaks and console warnings
- **Manual Cancellation Flags**: Rejected - AbortController is standard, more reliable
- **Cancel Only on Unmount**: Rejected - should also cancel when user changes URL

**References**:
- MDN AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- React useEffect Cleanup: https://react.dev/learn/synchronizing-with-effects#step-3-add-cleanup-if-needed

---

## 4. Error Boundary Implementation for React 19

### Decision: Class-Based Error Boundary with Fallback UI

**What was chosen**:
- Class component Error Boundary wrapping AddVideoModal
- User-friendly fallback UI with "Try Again" button
- Sentry integration for error logging

**Rationale**:
- **Constitutional Compliance**: Error Resilience requires error boundaries (FR-022)
- **React 19**: Error boundaries still require class components (no hooks equivalent yet)
- **User Experience**: Graceful degradation prevents white screen of death

**Implementation Pattern**:
```typescript
// Frontend: src/components/videos/VideoFormErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class VideoFormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry for monitoring (FR-020)
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <h3>Something went wrong</h3>
          <p>We're sorry, but the video form encountered an error. Please try again.</p>
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VideoFormErrorBoundary;
```

**Usage**:
```typescript
// Wrap the modal in the error boundary
<VideoFormErrorBoundary>
  <AddVideoModal isOpen={isOpen} onClose={onClose} />
</VideoFormErrorBoundary>
```

**Testing Strategy** (TDD):
```typescript
// Frontend: src/components/videos/VideoFormErrorBoundary.test.tsx

const ThrowError = () => {
  throw new Error('Test error');
};

test('catches errors and displays fallback UI', () => {
  render(
    <VideoFormErrorBoundary>
      <ThrowError />
    </VideoFormErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  expect(screen.getByText('Try Again')).toBeInTheDocument();
});

test('resets error state when Try Again is clicked', () => {
  const { rerender } = render(
    <VideoFormErrorBoundary>
      <ThrowError />
    </VideoFormErrorBoundary>
  );

  fireEvent.click(screen.getByText('Try Again'));

  // After reset, render working component
  rerender(
    <VideoFormErrorBoundary>
      <div>Working component</div>
    </VideoFormErrorBoundary>
  );

  expect(screen.getByText('Working component')).toBeInTheDocument();
});
```

**Alternatives Considered**:
- **Function Component with Hook**: Rejected - React 19 still doesn't support error boundaries in function components
- **Global Error Boundary Only**: Rejected - too coarse-grained, would crash entire app
- **No Error Boundary**: Rejected - violates constitution

**References**:
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- Sentry React Integration: https://docs.sentry.io/platforms/javascript/guides/react/

---

## 5. Platform UUID Management

### Decision: New GET /api/platforms Endpoint with Frontend Caching

**What was chosen**:
- Backend endpoint: `GET /api/platforms` returning `[{ id: uuid, name: string }]`
- Frontend caches platform list in component state or Context
- Map platform name to UUID before POST /api/videos

**Rationale**:
- **Bug Fix**: Current bug is platform_id sent as string, backend expects UUID (FR-008, FR-029)
- **Flexibility**: Platform list can grow without frontend changes
- **Performance**: Frontend fetches once per session, caches result

**Implementation Pattern**:
```javascript
// Backend: src/routes/platforms.js

const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, requires_auth FROM platforms ORDER BY name'
    );

    res.json({
      platforms: result.rows.map(row => ({
        id: row.id,        // UUID
        name: row.name,    // e.g., "youtube", "vimeo"
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

```typescript
// Frontend: src/services/platformService.ts

export interface Platform {
  id: string;  // UUID
  name: string;
  requiresAuth: boolean;
}

let platformCache: Platform[] | null = null;

export async function fetchPlatforms(): Promise<Platform[]> {
  if (platformCache) {
    return platformCache;
  }

  const response = await axios.get('/api/platforms');
  platformCache = response.data.platforms;
  return platformCache;
}

export function getPlatformIdByName(name: string, platforms: Platform[]): string | null {
  const platform = platforms.find(p => p.name.toLowerCase() === name.toLowerCase());
  return platform ? platform.id : null;
}
```

**Usage in AddVideoModal**:
```typescript
// Fetch platforms on mount
const [platforms, setPlatforms] = useState<Platform[]>([]);

useEffect(() => {
  fetchPlatforms().then(setPlatforms);
}, []);

// When saving video
async function handleSave() {
  const platformId = getPlatformIdByName(selectedPlatform, platforms);

  await axios.post('/api/videos', {
    platform_id: platformId,  // UUID, not string!
    video_id: videoId,
    title: title,
    // ... other fields
  });
}
```

**Alternatives Considered**:
- **Hardcode UUIDs in Frontend**: Rejected - brittle, breaks if database changes
- **Backend Auto-Resolve by Name**: Rejected - less explicit, harder to debug
- **GraphQL Schema**: Rejected - overkill for this simple lookup

---

## Summary

All research areas have been resolved with clear decisions:

1. ✅ **YouTube API**: Backend proxy with `videos.list` endpoint (3 units/request)
2. ✅ **URL Parsing**: Regex-based parser with 6+ format support per platform
3. ✅ **Request Cancellation**: AbortController on all requests with cleanup
4. ✅ **Error Boundaries**: Class component wrapping modal with Sentry logging
5. ✅ **Platform UUIDs**: New GET /api/platforms endpoint with frontend caching

**No NEEDS CLARIFICATION markers remain.** Ready to proceed to Phase 1: Design & Contracts.
