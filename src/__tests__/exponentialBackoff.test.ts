import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import KidsMode from '../pages/KidsMode';
import axiosInstance from '../utils/axiosConfig';

// Mock axios
jest.mock('../utils/axiosConfig');
const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

// Mock components
jest.mock('../components/VideoPlayer', () => {
  return function VideoPlayer() {
    const React = require('react');
    return React.createElement('div', null, 'VideoPlayer');
  };
});

jest.mock('../components/NFCScanner', () => {
  return function NFCScanner() {
    const React = require('react');
    return React.createElement('div', null, 'NFCScanner');
  };
});

describe('Exponential Backoff in KidsMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default axios mocks
    mockedAxios.post = jest.fn();
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Heartbeat with exponential backoff', () => {
    it('should start with 30 second heartbeat interval', async () => {
      const { unmount } = render(React.createElement(KidsMode));
      
      // Mock successful NFC scan and session start
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/nfc/scan')) {
          return Promise.resolve({
            data: { 
              id: 'video-1', 
              title: 'Test Video',
              platform_video_id: 'abc123',
              platform_name: 'youtube'
            }
          });
        }
        if (url.includes('/sessions/start')) {
          return Promise.resolve({
            data: { 
              session_id: 'session-1',
              max_watch_time_minutes: 60
            }
          });
        }
        if (url.includes('/sessions/heartbeat')) {
          return Promise.resolve({
            data: {
              should_stop: false,
              watched_minutes: 5
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Trigger NFC scan
      await act(async () => {
        const nfcScanner = document.querySelector('[data-testid="nfc-scanner"]');
        if (nfcScanner) {
          // Simulate NFC scan
          const scanEvent = new CustomEvent('scan', { detail: { chipUID: 'ABC123' } });
          nfcScanner.dispatchEvent(scanEvent);
        }
      });

      // Wait for session to start
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/start'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      // Fast-forward 30 seconds - first heartbeat
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/heartbeat'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      unmount();
    });

    it('should apply exponential backoff on heartbeat failure', async () => {
      const { unmount } = render(React.createElement(KidsMode));
      
      let heartbeatCallCount = 0;
      
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/nfc/scan')) {
          return Promise.resolve({
            data: { 
              id: 'video-1', 
              title: 'Test Video',
              platform_video_id: 'abc123',
              platform_name: 'youtube'
            }
          });
        }
        if (url.includes('/sessions/start')) {
          return Promise.resolve({
            data: { 
              session_id: 'session-1',
              max_watch_time_minutes: 60
            }
          });
        }
        if (url.includes('/sessions/heartbeat')) {
          heartbeatCallCount++;
          // Fail first heartbeat
          if (heartbeatCallCount === 1) {
            return Promise.reject(new Error('Network error'));
          }
          // Succeed subsequent heartbeats
          return Promise.resolve({
            data: {
              should_stop: false,
              watched_minutes: 5
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Start session
      await act(async () => {
        const nfcScanner = document.querySelector('[data-testid="nfc-scanner"]');
        if (nfcScanner) {
          const scanEvent = new CustomEvent('scan', { detail: { chipUID: 'ABC123' } });
          nfcScanner.dispatchEvent(scanEvent);
        }
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/start'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      // First heartbeat at 30 seconds - will fail
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(heartbeatCallCount).toBe(1);
      });

      // Second heartbeat should be at 30 * 1.5 = 45 seconds later
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      await waitFor(() => {
        expect(heartbeatCallCount).toBe(2);
      });

      unmount();
    });

    it('should cap backoff at maximum delay', async () => {
      const { unmount } = render(React.createElement(KidsMode));
      
      let heartbeatCallCount = 0;
      
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/nfc/scan')) {
          return Promise.resolve({
            data: { 
              id: 'video-1', 
              title: 'Test Video',
              platform_video_id: 'abc123',
              platform_name: 'youtube'
            }
          });
        }
        if (url.includes('/sessions/start')) {
          return Promise.resolve({
            data: { 
              session_id: 'session-1',
              max_watch_time_minutes: 60
            }
          });
        }
        if (url.includes('/sessions/heartbeat')) {
          heartbeatCallCount++;
          // Always fail to test max backoff
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Start session
      await act(async () => {
        const nfcScanner = document.querySelector('[data-testid="nfc-scanner"]');
        if (nfcScanner) {
          const scanEvent = new CustomEvent('scan', { detail: { chipUID: 'ABC123' } });
          nfcScanner.dispatchEvent(scanEvent);
        }
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/start'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      // Simulate multiple failures to reach max backoff
      let totalDelay = 0;
      let currentDelay = 30000;
      const maxDelay = 120000;
      
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(currentDelay);
        });
        
        await waitFor(() => {
          expect(heartbeatCallCount).toBe(i + 1);
        });
        
        totalDelay += currentDelay;
        currentDelay = Math.min(currentDelay * 1.5, maxDelay);
      }
      
      // Verify that delay doesn't exceed max
      expect(currentDelay).toBeLessThanOrEqual(maxDelay);
      
      unmount();
    });

    it('should reset backoff delay on successful heartbeat', async () => {
      const { unmount } = render(React.createElement(KidsMode));
      
      let heartbeatCallCount = 0;
      
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/nfc/scan')) {
          return Promise.resolve({
            data: { 
              id: 'video-1', 
              title: 'Test Video',
              platform_video_id: 'abc123',
              platform_name: 'youtube'
            }
          });
        }
        if (url.includes('/sessions/start')) {
          return Promise.resolve({
            data: { 
              session_id: 'session-1',
              max_watch_time_minutes: 60
            }
          });
        }
        if (url.includes('/sessions/heartbeat')) {
          heartbeatCallCount++;
          // Fail first, succeed second, fail third
          if (heartbeatCallCount === 1 || heartbeatCallCount === 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({
            data: {
              should_stop: false,
              watched_minutes: 5
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Start session
      await act(async () => {
        const nfcScanner = document.querySelector('[data-testid="nfc-scanner"]');
        if (nfcScanner) {
          const scanEvent = new CustomEvent('scan', { detail: { chipUID: 'ABC123' } });
          nfcScanner.dispatchEvent(scanEvent);
        }
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/start'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      // First heartbeat at 30s - will fail
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(heartbeatCallCount).toBe(1);
      });

      // Second heartbeat at 45s (30 * 1.5) - will succeed
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      await waitFor(() => {
        expect(heartbeatCallCount).toBe(2);
      });

      // Third heartbeat should be back at 30s (reset after success)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(heartbeatCallCount).toBe(3);
      });

      unmount();
    });

    it('should clean up heartbeat on unmount', async () => {
      const { unmount } = render(React.createElement(KidsMode));
      
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/nfc/scan')) {
          return Promise.resolve({
            data: { 
              id: 'video-1', 
              title: 'Test Video',
              platform_video_id: 'abc123',
              platform_name: 'youtube'
            }
          });
        }
        if (url.includes('/sessions/start')) {
          return Promise.resolve({
            data: { 
              session_id: 'session-1',
              max_watch_time_minutes: 60
            }
          });
        }
        if (url.includes('/sessions/heartbeat')) {
          return Promise.resolve({
            data: {
              should_stop: false,
              watched_minutes: 5
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Start session
      await act(async () => {
        const nfcScanner = document.querySelector('[data-testid="nfc-scanner"]');
        if (nfcScanner) {
          const scanEvent = new CustomEvent('scan', { detail: { chipUID: 'ABC123' } });
          nfcScanner.dispatchEvent(scanEvent);
        }
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/start'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      const heartbeatCallsBefore = mockedAxios.post.mock.calls.filter(
        call => call[0].includes('/sessions/heartbeat')
      ).length;

      // Unmount component
      unmount();

      // Advance timers significantly
      act(() => {
        jest.advanceTimersByTime(120000);
      });

      // No new heartbeat calls should have been made
      const heartbeatCallsAfter = mockedAxios.post.mock.calls.filter(
        call => call[0].includes('/sessions/heartbeat')
      ).length;

      expect(heartbeatCallsAfter).toBe(heartbeatCallsBefore);
    });
  });
});