/**
 * useWatchSession Hook
 *
 * Manages watch session lifecycle for Kids Mode with daily watch time enforcement.
 * Handles session start, heartbeat mechanism, and cleanup on unmount.
 *
 * Features:
 * - Automatic session initialization
 * - Heartbeat every 60 seconds to track watch time
 * - Exponential backoff on heartbeat failures
 * - Daily limit detection and enforcement
 * - Graceful cleanup with sendBeacon on unmount
 * - AbortController for request cancellation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface UseWatchSessionOptions {
  profileId: string | null;
  nfcChipId: string | null;
  videoId: string | null;
}

interface UseWatchSessionReturn {
  sessionId: string | null;
  remainingMinutes: number;
  limitReached: boolean;
  error: string | null;
  currentPosition: number;
  updatePosition: (position: number) => void;
  endSession: (reason: 'completed' | 'manual' | 'daily_limit' | 'swipe_exit' | 'error') => Promise<void>;
}

const HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds
const MAX_BACKOFF_MS = 300000; // 5 minutes
const INITIAL_BACKOFF_MS = 60000; // 1 minute

/**
 * Custom hook to manage watch session with daily limit enforcement
 */
export function useWatchSession({
  profileId,
  nfcChipId,
  videoId,
}: UseWatchSessionOptions): UseWatchSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backoffDelayRef = useRef<number>(INITIAL_BACKOFF_MS);

  /**
   * Start a new watch session
   */
  const startSession = useCallback(async () => {
    // Validate required parameters
    if (!profileId || !nfcChipId || !videoId) {
      setError('Missing required parameters for session start');
      return;
    }

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await axios.post(
        '/api/sessions/start/public',
        {
          profile_id: profileId,
          nfc_chip_id: nfcChipId,
          video_id: videoId,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      const { session_id, remaining_minutes } = response.data;

      setSessionId(session_id);
      setRemainingMinutes(remaining_minutes);
      setLimitReached(false);
      setError(null);

      // Start heartbeat mechanism
      startHeartbeat(session_id);
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;

        if (status === 403 && data.limit_reached) {
          // Daily limit already reached
          setLimitReached(true);
          setRemainingMinutes(0);
          setError(data.message || 'Daily watch time limit reached');
        } else {
          // Other errors (invalid chip, profile not found, etc.)
          setError(data.message || 'Failed to start watch session');
        }
      } else if (err.name !== 'CanceledError') {
        // Network or other errors (ignore if request was cancelled)
        setError('Failed to connect to server. Please check your internet connection.');
      }
    }
  }, [profileId, nfcChipId, videoId]);

  /**
   * Send heartbeat to track watch time and check for limit
   */
  const sendHeartbeat = useCallback(async (sessionIdParam: string) => {
    try {
      const response = await axios.post(
        `/api/sessions/${sessionIdParam}/heartbeat`,
        {
          current_position_seconds: currentPosition,
        }
      );

      const { remaining_minutes } = response.data;

      setRemainingMinutes(remaining_minutes);
      setLimitReached(false);

      // Reset backoff on successful heartbeat
      backoffDelayRef.current = INITIAL_BACKOFF_MS;

      // Schedule next heartbeat
      heartbeatTimerRef.current = setTimeout(() => {
        sendHeartbeat(sessionIdParam);
      }, HEARTBEAT_INTERVAL_MS);
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;

        if (status === 403 && data.limit_reached) {
          // Daily limit reached via heartbeat
          setLimitReached(true);
          setRemainingMinutes(0);
          setError(data.message || 'Daily watch time limit reached');

          // Stop heartbeat
          if (heartbeatTimerRef.current) {
            clearTimeout(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }

          return;
        } else if (status === 404) {
          // Session not found or already ended
          setSessionId(null);
          setError(data.message || 'Session ended');

          // Stop heartbeat
          if (heartbeatTimerRef.current) {
            clearTimeout(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }

          return;
        }
      }

      // Network error or other failure - retry with exponential backoff
      console.warn('Heartbeat failed, retrying with backoff:', err);

      const currentBackoff = backoffDelayRef.current;
      backoffDelayRef.current = Math.min(currentBackoff * 2, MAX_BACKOFF_MS);

      heartbeatTimerRef.current = setTimeout(() => {
        sendHeartbeat(sessionIdParam);
      }, currentBackoff);
    }
  }, [currentPosition]);

  /**
   * Start heartbeat mechanism
   */
  const startHeartbeat = useCallback((sessionIdParam: string) => {
    // Clear any existing heartbeat timer
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }

    // Schedule first heartbeat
    heartbeatTimerRef.current = setTimeout(() => {
      sendHeartbeat(sessionIdParam);
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  /**
   * Update current video position (for heartbeat reporting)
   */
  const updatePosition = useCallback((position: number) => {
    setCurrentPosition(position);
  }, []);

  /**
   * End the current watch session
   */
  const endSession = useCallback(async (
    reason: 'completed' | 'manual' | 'daily_limit' | 'swipe_exit' | 'error' = 'manual'
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      await axios.post(`/api/sessions/${sessionId}/end`, {
        stopped_reason: reason,
        final_position_seconds: currentPosition,
      });
    } catch (err) {
      console.error('Failed to end session:', err);
      // Continue with cleanup even if API call fails
    } finally {
      // Clear session state
      setSessionId(null);
      setRemainingMinutes(0);

      // Stop heartbeat
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }
  }, [sessionId, currentPosition]);

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    startSession();

    // Cleanup on unmount
    return () => {
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Stop heartbeat
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      // End session with sendBeacon for reliability
      if (sessionId) {
        const blob = new Blob(
          [JSON.stringify({
            stopped_reason: 'swipe_exit',
            final_position_seconds: currentPosition,
          })],
          { type: 'application/json' }
        );

        navigator.sendBeacon(`/api/sessions/${sessionId}/end`, blob);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return {
    sessionId,
    remainingMinutes,
    limitReached,
    error,
    currentPosition,
    updatePosition,
    endSession,
  };
}
