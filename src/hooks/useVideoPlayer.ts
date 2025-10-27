/**
 * useVideoPlayer Hook
 *
 * Manages video player state and lifecycle for multi-platform video playback.
 * Supports YouTube, Vimeo, and Dailymotion with platform-specific adapters.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPlayer, VideoPlayer } from '../utils/videoPlayerAdapter';

export type VideoPlayerState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

export type VideoPlayerEvent = 'playing' | 'paused' | 'ended' | 'error';

interface UseVideoPlayerReturn {
  state: VideoPlayerState;
  error: string | null;
  loadVideo: (platform: string, videoId: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  on: (event: VideoPlayerEvent, handler: Function) => void;
}

/**
 * Hook to manage video player lifecycle and events
 *
 * @param containerId - DOM element ID where player will be embedded
 * @returns Video player controls and state
 */
export function useVideoPlayer(containerId: string): UseVideoPlayerReturn {
  const [state, setState] = useState<VideoPlayerState>('idle');
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<VideoPlayer | null>(null);
  const eventHandlersRef = useRef<Map<VideoPlayerEvent, Set<Function>>>(
    new Map([
      ['playing' as VideoPlayerEvent, new Set<Function>()],
      ['paused' as VideoPlayerEvent, new Set<Function>()],
      ['ended' as VideoPlayerEvent, new Set<Function>()],
      ['error' as VideoPlayerEvent, new Set<Function>()],
    ])
  );

  /**
   * Load a video into the player
   */
  const loadVideo = useCallback(
    async (platform: string, videoId: string) => {
      console.log('[useVideoPlayer] loadVideo called', {
        platform,
        videoId,
        containerId,
        timestamp: new Date().toISOString()
      });

      try {
        setState('loading');
        setError(null);

        // Verify container exists BEFORE creating player
        const containerBefore = document.getElementById(containerId);
        console.log('[useVideoPlayer] Container before createPlayer:', {
          exists: !!containerBefore,
          id: containerBefore?.id,
          innerHTML: containerBefore?.innerHTML.substring(0, 100)
        });

        // Destroy existing player if present
        if (playerRef.current) {
          console.log('[useVideoPlayer] Destroying existing player');
          playerRef.current.destroy();
          playerRef.current = null;
        }

        // Create new player with platform-specific adapter
        console.log('[useVideoPlayer] Calling createPlayer...');
        const player = await createPlayer({
          platform,
          videoId,
          containerId,
          options: {
            autoplay: false,
            controls: false, // Kids Mode: no controls
            keyboard: false, // Kids Mode: no keyboard controls
            fullscreen: false, // We handle fullscreen at component level
          },
        });
        console.log('[useVideoPlayer] createPlayer returned successfully');

        // Verify container state AFTER creating player
        const containerAfter = document.getElementById(containerId);
        console.log('[useVideoPlayer] Container after createPlayer:', {
          exists: !!containerAfter,
          id: containerAfter?.id,
          innerHTML: containerAfter?.innerHTML.substring(0, 100)
        });

        playerRef.current = player;

        // Register internal event handlers
        player.on('playing', () => {
          setState('playing');
          eventHandlersRef.current.get('playing')?.forEach((handler) => handler());
        });

        player.on('paused', () => {
          setState('paused');
          eventHandlersRef.current.get('paused')?.forEach((handler) => handler());
        });

        player.on('ended', () => {
          setState('ended');
          eventHandlersRef.current.get('ended')?.forEach((handler) => handler());
        });

        player.on('error', (err: Error) => {
          setState('error');
          setError(err.message || 'Video playback error');
          eventHandlersRef.current.get('error')?.forEach((handler) => handler(err));
        });

        console.log('[useVideoPlayer] Setting state to ready');
        setState('ready');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load video';
        console.error('[useVideoPlayer] ERROR in loadVideo:', {
          error: err,
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined
        });
        setState('error');
        setError(errorMessage);
      }
    },
    [containerId]
  );

  /**
   * Play the video
   */
  const play = useCallback(async () => {
    if (!playerRef.current || state === 'idle') {
      return;
    }

    try {
      await playerRef.current.play();
      setState('playing');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Playback failed';
      setState('error');
      setError(errorMessage);
      console.error('Play error:', err);
    }
  }, [state]);

  /**
   * Pause the video
   */
  const pause = useCallback(() => {
    if (!playerRef.current || state === 'idle') {
      return;
    }

    playerRef.current.pause();
    setState('paused');
  }, [state]);

  /**
   * Seek to a specific time
   */
  const seek = useCallback(
    (time: number) => {
      if (!playerRef.current || state === 'idle') {
        return;
      }

      playerRef.current.seek(time);
    },
    [state]
  );

  /**
   * Register event handler
   */
  const on = useCallback((event: VideoPlayerEvent, handler: Function) => {
    eventHandlersRef.current.get(event)?.add(handler);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return {
    state,
    error,
    loadVideo,
    play,
    pause,
    seek,
    on,
  };
}
