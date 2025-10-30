/**
 * useWatchSession Hook Unit Tests
 * Tests watch session management for Kids Mode with daily watch time enforcement
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWatchSession } from '../useWatchSession';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('useWatchSession', () => {
  const mockProfileId = '550e8400-e29b-41d4-a716-446655440001';
  const mockNfcChipId = '550e8400-e29b-41d4-a716-446655440002';
  const mockVideoId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Session Initialization', () => {
    it('should start session successfully when limit not reached', async () => {
      // Mock successful session start response
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      expect(result.current.remainingMinutes).toBe(50);
      expect(result.current.limitReached).toBe(false);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/sessions/start/public', {
        profile_id: mockProfileId,
        nfc_chip_id: mockNfcChipId,
        video_id: mockVideoId,
      });
    });

    it('should set limitReached to true when daily limit already reached', async () => {
      // Mock 403 response for limit reached
      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            error: 'Daily watch time limit reached',
            limit_reached: true,
            total_minutes: 60,
            daily_limit_minutes: 60,
            message: "You've watched enough for today! See you tomorrow! 🌙",
          },
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.limitReached).toBe(true);
      });

      expect(result.current.sessionId).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should handle invalid chip/profile error gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            error: 'Invalid NFC chip or profile',
            message: "Oops! This chip doesn't belong to your profile. Ask a grown-up for help!",
          },
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.sessionId).toBeNull();
    });

    it('should handle network error gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat every 60 seconds and update remaining time', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      // Mock heartbeat responses
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          elapsed_seconds: 60,
          remaining_minutes: 49,
          limit_reached: false,
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      // Fast-forward 60 seconds to trigger heartbeat
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(result.current.remainingMinutes).toBe(49);
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/sessions/session-123/heartbeat', {
        current_position_seconds: 0,
      });
    });

    it('should detect limit reached via heartbeat and stop session', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 1,
          daily_limit_minutes: 60,
        },
      });

      // Mock heartbeat with limit reached
      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            session_id: 'session-123',
            elapsed_seconds: 60,
            remaining_minutes: 0,
            limit_reached: true,
            message: "Time's up! You've watched enough for today. 🌙",
          },
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      // Fast-forward to trigger heartbeat
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(result.current.limitReached).toBe(true);
      });

      expect(result.current.remainingMinutes).toBe(0);
    });

    it('should use exponential backoff on heartbeat failures', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      // Mock heartbeat failures
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network Error')) // First failure
        .mockResolvedValueOnce({
          data: {
            session_id: 'session-123',
            elapsed_seconds: 120,
            remaining_minutes: 48,
            limit_reached: false,
          },
        }); // Retry success

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      // Fast-forward initial heartbeat interval (60s)
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Wait for error to be processed
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledTimes(2); // start + first heartbeat
      });

      // Fast-forward exponential backoff (120s)
      act(() => {
        jest.advanceTimersByTime(120000);
      });

      // Verify retry succeeded
      await waitFor(() => {
        expect(result.current.remainingMinutes).toBe(48);
      });
    });
  });

  describe('Session Termination', () => {
    it('should end session with manual reason', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      // Mock session end
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          duration_seconds: 120,
          stopped_reason: 'manual',
          total_watched_today: 2,
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      await act(async () => {
        await result.current.endSession('manual');
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/sessions/session-123/end', {
        stopped_reason: 'manual',
        final_position_seconds: 0,
      });

      expect(result.current.sessionId).toBeNull();
    });

    it('should end session automatically on unmount with swipe_exit reason', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      // Mock navigator.sendBeacon for cleanup
      const mockSendBeacon = jest.fn().mockReturnValue(true);
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: mockSendBeacon,
      });

      const { unmount } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledTimes(1); // start
      });

      unmount();

      // Verify sendBeacon was called for cleanup
      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/sessions/session-123/end',
        expect.any(Blob)
      );
    });

    it('should handle end session error gracefully', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      // Mock session end error
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      await act(async () => {
        await result.current.endSession('manual');
      });

      // Session should still be cleared even if API fails
      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('AbortController Integration', () => {
    it('should abort pending requests on unmount', async () => {
      // Mock session start that takes time
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      mockAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { unmount } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      // Unmount before request completes
      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profileId gracefully', () => {
      const { result } = renderHook(() =>
        useWatchSession({
          profileId: null as any,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      expect(result.current.sessionId).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should not start heartbeat if session start fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Start failed'));

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Fast-forward heartbeat interval
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Verify no heartbeat was sent (only start call was made)
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should update currentPosition when provided', async () => {
      // Mock session start
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          remaining_minutes: 50,
          daily_limit_minutes: 60,
        },
      });

      const { result } = renderHook(() =>
        useWatchSession({
          profileId: mockProfileId,
          nfcChipId: mockNfcChipId,
          videoId: mockVideoId,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      act(() => {
        result.current.updatePosition(45);
      });

      expect(result.current.currentPosition).toBe(45);

      // Mock heartbeat with updated position
      mockAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 'session-123',
          elapsed_seconds: 60,
          remaining_minutes: 49,
          limit_reached: false,
        },
      });

      // Fast-forward to trigger heartbeat
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/sessions/session-123/heartbeat', {
          current_position_seconds: 45,
        });
      });
    });
  });
});
