/**
 * useVideoPlayer Hook Unit Tests
 * Tests video player hook functionality for multi-platform video playback
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoPlayer } from '../useVideoPlayer';
import * as videoPlayerAdapter from '../../utils/videoPlayerAdapter';

// Mock the video player adapter
jest.mock('../../utils/videoPlayerAdapter');

const mockVideoPlayerAdapter = videoPlayerAdapter as jest.Mocked<typeof videoPlayerAdapter>;

describe('useVideoPlayer', () => {
  let mockPlayer: any;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    // Reset event handlers
    eventHandlers = new Map();

    // Create mock player with event system
    mockPlayer = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      seek: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      getCurrentTime: jest.fn().mockReturnValue(0),
      getDuration: jest.fn().mockReturnValue(100),
    };

    // Mock adapter to return our mock player
    mockVideoPlayerAdapter.createPlayer.mockResolvedValue(mockPlayer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Video Loading', () => {
    it('should load YouTube video successfully', async () => {
      const containerId = 'player-container';
      const { result } = renderHook(() => useVideoPlayer(containerId));

      expect(result.current.state).toBe('idle');

      await act(async () => {
        await result.current.loadVideo('youtube', 'dQw4w9WgXcQ');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });

      expect(mockVideoPlayerAdapter.createPlayer).toHaveBeenCalledWith({
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        containerId,
        options: {
          autoplay: false,
          controls: false,
          keyboard: false,
          fullscreen: false,
        },
      });
    });

    it('should load Vimeo video successfully', async () => {
      const containerId = 'player-container';
      const { result } = renderHook(() => useVideoPlayer(containerId));

      await act(async () => {
        await result.current.loadVideo('vimeo', '123456789');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });

      expect(mockVideoPlayerAdapter.createPlayer).toHaveBeenCalledWith({
        platform: 'vimeo',
        videoId: '123456789',
        containerId,
        options: {
          autoplay: false,
          controls: false,
          keyboard: false,
          fullscreen: false,
        },
      });
    });

    it('should load Dailymotion video successfully', async () => {
      const containerId = 'player-container';
      const { result } = renderHook(() => useVideoPlayer(containerId));

      await act(async () => {
        await result.current.loadVideo('dailymotion', 'x8abcde');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });

      expect(mockVideoPlayerAdapter.createPlayer).toHaveBeenCalledWith({
        platform: 'dailymotion',
        videoId: 'x8abcde',
        containerId,
        options: {
          autoplay: false,
          controls: false,
          keyboard: false,
          fullscreen: false,
        },
      });
    });

    it('should set loading state while video loads', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      act(() => {
        result.current.loadVideo('youtube', 'test123');
      });

      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });
    });

    it('should handle video loading errors', async () => {
      const error = new Error('Failed to load video');
      mockVideoPlayerAdapter.createPlayer.mockRejectedValue(error);

      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'invalid');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toBe('Failed to load video');
      });
    });

    it('should handle network errors during load', async () => {
      mockVideoPlayerAdapter.createPlayer.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('Network error');
      });
    });
  });

  describe('Play/Pause Functionality', () => {
    it('should play video successfully', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      await act(async () => {
        await result.current.play();
      });

      expect(mockPlayer.play).toHaveBeenCalled();
      expect(result.current.state).toBe('playing');
    });

    it('should pause video successfully', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
        await result.current.play();
      });

      act(() => {
        result.current.pause();
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(result.current.state).toBe('paused');
    });

    it('should not play if video not loaded', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.play();
      });

      expect(mockPlayer.play).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('should handle play errors gracefully', async () => {
      mockPlayer.play.mockRejectedValue(new Error('Playback failed'));

      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      await act(async () => {
        await result.current.play();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('Playback failed');
      });
    });
  });

  describe('Seek Operations', () => {
    beforeEach(async () => {
      // Set up loaded player for all seek tests
    });

    it('should seek to specific time', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.seek(30);
      });

      expect(mockPlayer.seek).toHaveBeenCalledWith(30);
    });

    it('should not seek if video not loaded', () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      act(() => {
        result.current.seek(30);
      });

      expect(mockPlayer.seek).not.toHaveBeenCalled();
    });

    it('should handle seek to start (0)', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.seek(0);
      });

      expect(mockPlayer.seek).toHaveBeenCalledWith(0);
    });

    it('should handle seek to end', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.seek(100);
      });

      expect(mockPlayer.seek).toHaveBeenCalledWith(100);
    });
  });

  describe('Event Handling', () => {
    it('should handle "ended" event', async () => {
      const onEnded = jest.fn();
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.on('ended', onEnded);
      });

      // Simulate video ended event
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      expect(onEnded).toHaveBeenCalled();
      expect(result.current.state).toBe('ended');
    });

    it('should handle "playing" event', async () => {
      const onPlaying = jest.fn();
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.on('playing', onPlaying);
      });

      act(() => {
        const playingHandler = eventHandlers.get('playing');
        if (playingHandler) playingHandler();
      });

      expect(onPlaying).toHaveBeenCalled();
    });

    it('should handle "paused" event', async () => {
      const onPaused = jest.fn();
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.on('paused', onPaused);
      });

      act(() => {
        const pausedHandler = eventHandlers.get('paused');
        if (pausedHandler) pausedHandler();
      });

      expect(onPaused).toHaveBeenCalled();
    });

    it('should handle "error" event', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.on('error', onError);
      });

      act(() => {
        const errorHandler = eventHandlers.get('error');
        if (errorHandler) errorHandler(new Error('Playback error'));
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.state).toBe('error');
    });

    it('should support multiple event listeners', async () => {
      const onEnded1 = jest.fn();
      const onEnded2 = jest.fn();
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      act(() => {
        result.current.on('ended', onEnded1);
        result.current.on('ended', onEnded2);
      });

      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      expect(onEnded1).toHaveBeenCalled();
      expect(onEnded2).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error state by loading new video', async () => {
      mockVideoPlayerAdapter.createPlayer
        .mockRejectedValueOnce(new Error('First load failed'))
        .mockResolvedValueOnce(mockPlayer);

      const { result } = renderHook(() => useVideoPlayer('container'));

      // First load fails
      await act(async () => {
        await result.current.loadVideo('youtube', 'invalid');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      // Second load succeeds
      await act(async () => {
        await result.current.loadVideo('youtube', 'valid');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
        expect(result.current.error).toBeNull();
      });
    });

    it('should clear error message on successful load', async () => {
      mockVideoPlayerAdapter.createPlayer
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValueOnce(mockPlayer);

      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'bad');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      await act(async () => {
        await result.current.loadVideo('youtube', 'good');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle consecutive errors', async () => {
      mockVideoPlayerAdapter.createPlayer.mockRejectedValue(
        new Error('Persistent error')
      );

      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'bad1');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      await act(async () => {
        await result.current.loadVideo('youtube', 'bad2');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('Persistent error');
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy player on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useVideoPlayer('container')
      );

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      unmount();

      expect(mockPlayer.destroy).toHaveBeenCalled();
    });

    it('should destroy old player when loading new video', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'video1');
      });

      const firstPlayer = mockPlayer;

      // Create new mock player for second video
      const secondPlayer = { ...mockPlayer, destroy: jest.fn() };
      mockVideoPlayerAdapter.createPlayer.mockResolvedValue(secondPlayer);

      await act(async () => {
        await result.current.loadVideo('vimeo', 'video2');
      });

      expect(firstPlayer.destroy).toHaveBeenCalled();
    });

    it('should not crash if player already destroyed', async () => {
      const { result, unmount } = renderHook(() =>
        useVideoPlayer('container')
      );

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
      });

      // Destroy player manually first
      mockPlayer.destroy();

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('State Transitions', () => {
    it('should transition: idle → loading → ready → playing', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      expect(result.current.state).toBe('idle');

      act(() => {
        result.current.loadVideo('youtube', 'test');
      });

      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });

      await act(async () => {
        await result.current.play();
      });

      expect(result.current.state).toBe('playing');
    });

    it('should transition: playing → paused → playing', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
        await result.current.play();
      });

      expect(result.current.state).toBe('playing');

      act(() => {
        result.current.pause();
      });

      expect(result.current.state).toBe('paused');

      await act(async () => {
        await result.current.play();
      });

      expect(result.current.state).toBe('playing');
    });

    it('should transition: playing → ended', async () => {
      const { result } = renderHook(() => useVideoPlayer('container'));

      await act(async () => {
        await result.current.loadVideo('youtube', 'test');
        await result.current.play();
      });

      expect(result.current.state).toBe('playing');

      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      expect(result.current.state).toBe('ended');
    });
  });
});
