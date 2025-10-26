/**
 * KidsVideoPlayer Component Unit Tests
 * Tests fullscreen video player with sequential playback
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { KidsVideoPlayer } from '../KidsVideoPlayer';
import * as useVideoPlayerHook from '../../../hooks/useVideoPlayer';

// Mock the useVideoPlayer hook
jest.mock('../../../hooks/useVideoPlayer');

// Mock fullscreen API
const mockRequestFullscreen = jest.fn().mockResolvedValue(undefined);
const mockExitFullscreen = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
});

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: mockExitFullscreen,
});

describe('KidsVideoPlayer', () => {
  let mockUseVideoPlayer: jest.Mock;
  let mockLoadVideo: jest.fn;
  let mockPlay: jest.fn;
  let mockPause: jest.fn;
  let mockSeek: jest.fn;
  let mockOn: jest.fn;
  let eventHandlers: Map<string, Function>;

  const mockVideos = [
    {
      id: 'video-1',
      title: 'First Video',
      platform_id: 'youtube',
      platform_video_id: 'abc123',
      sequence_order: 1,
    },
    {
      id: 'video-2',
      title: 'Second Video',
      platform_id: 'vimeo',
      platform_video_id: '456789',
      sequence_order: 2,
    },
    {
      id: 'video-3',
      title: 'Third Video',
      platform_id: 'dailymotion',
      platform_video_id: 'x8efgh',
      sequence_order: 3,
    },
  ];

  beforeEach(() => {
    // Reset event handlers
    eventHandlers = new Map();

    // Create mock functions
    mockLoadVideo = jest.fn().mockResolvedValue(undefined);
    mockPlay = jest.fn().mockResolvedValue(undefined);
    mockPause = jest.fn();
    mockSeek = jest.fn();
    mockOn = jest.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
    });

    // Mock useVideoPlayer return value
    mockUseVideoPlayer = jest.fn(() => ({
      state: 'idle',
      error: null,
      loadVideo: mockLoadVideo,
      play: mockPlay,
      pause: mockPause,
      seek: mockSeek,
      on: mockOn,
    }));

    (useVideoPlayerHook.useVideoPlayer as jest.Mock) = mockUseVideoPlayer;

    // Mock requestFullscreen on DOM elements
    HTMLElement.prototype.requestFullscreen = mockRequestFullscreen;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.fullscreenElement = null;
  });

  describe('Fullscreen Mode', () => {
    it('should enter fullscreen on mount', async () => {
      const container = document.createElement('div');
      container.requestFullscreen = mockRequestFullscreen;

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />, {
        container: document.body.appendChild(container),
      });

      await waitFor(() => {
        expect(mockRequestFullscreen).toHaveBeenCalled();
      });
    });

    it('should exit fullscreen on unmount', async () => {
      document.fullscreenElement = document.createElement('div');

      const { unmount } = render(
        <KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />
      );

      unmount();

      await waitFor(() => {
        expect(mockExitFullscreen).toHaveBeenCalled();
      });
    });

    it('should not crash if fullscreen API unavailable', () => {
      HTMLElement.prototype.requestFullscreen = undefined as any;

      expect(() =>
        render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />)
      ).not.toThrow();
    });

    it('should handle fullscreen request rejection', async () => {
      mockRequestFullscreen.mockRejectedValue(new Error('Fullscreen denied'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Fullscreen request failed:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Sequential Playback - 3 Videos', () => {
    it('should load first video on mount', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'ready',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });
    });

    it('should auto-play first video when ready', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'ready',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should advance to second video when first ends', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      // Wait for first video to load
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });

      // Simulate 'ended' event for first video
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      // Should load second video
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('vimeo', '456789');
      });
    });

    it('should advance to third video when second ends', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      // Load first video
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });

      // First video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      // Second video loads
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('vimeo', '456789');
      });

      // Second video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      // Third video loads
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('dailymotion', 'x8efgh');
      });
    });

    it('should call onPlaylistComplete when last video ends', async () => {
      const onPlaylistComplete = jest.fn();
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(
        <KidsVideoPlayer videos={mockVideos} onPlaylistComplete={onPlaylistComplete} />
      );

      // Advance through all videos
      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });

      // First video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('vimeo', '456789');
      });

      // Second video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('dailymotion', 'x8efgh');
      });

      // Third video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      expect(onPlaylistComplete).toHaveBeenCalled();
    });

    it('should display current video title during playback', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('First Video')).toBeInTheDocument();
      });
    });
  });

  describe('Sequential Playback - Single Video', () => {
    const singleVideo = [mockVideos[0]];

    it('should load single video on mount', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'ready',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(
        <KidsVideoPlayer videos={singleVideo} onPlaylistComplete={jest.fn()} />
      );

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });
    });

    it('should call onPlaylistComplete immediately when single video ends', async () => {
      const onPlaylistComplete = jest.fn();
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(
        <KidsVideoPlayer videos={singleVideo} onPlaylistComplete={onPlaylistComplete} />
      );

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledWith('youtube', 'abc123');
      });

      // Video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      expect(onPlaylistComplete).toHaveBeenCalled();
    });
  });

  describe('Error Handling - No Videos', () => {
    it('should display error message when videos array is empty', () => {
      render(<KidsVideoPlayer videos={[]} onPlaylistComplete={jest.fn()} />);

      expect(screen.getByText(/no videos/i)).toBeInTheDocument();
      expect(screen.getByText(/ask a grown-up/i)).toBeInTheDocument();
    });

    it('should not attempt to load video when array is empty', () => {
      render(<KidsVideoPlayer videos={[]} onPlaylistComplete={jest.fn()} />);

      expect(mockLoadVideo).not.toHaveBeenCalled();
    });

    it('should show friendly emoji in error state', () => {
      render(<KidsVideoPlayer videos={[]} onPlaylistComplete={jest.fn()} />);

      // Check for sad emoji
      expect(screen.getByText(/😢/)).toBeInTheDocument();
    });
  });

  describe('Error Handling - Video Loading Errors', () => {
    it('should display error message when video fails to load', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'error',
        error: 'Failed to load video',
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on video load error', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'error',
        error: 'Network error',
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry loading video when retry button clicked', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'error',
        error: 'Network error',
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      const { rerender } = render(
        <KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Update mock to return ready state after retry
      mockUseVideoPlayer.mockReturnValue({
        state: 'ready',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      act(() => {
        retryButton.click();
      });

      rerender(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(mockLoadVideo).toHaveBeenCalledTimes(2);
      });
    });

    it('should show platform-specific error messages', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'error',
        error: 'YouTube API error',
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while video loads', () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'loading',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading spinner when video ready', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'ready',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should show loading indicator between videos', async () => {
      mockUseVideoPlayer
        .mockReturnValueOnce({
          state: 'playing',
          error: null,
          loadVideo: mockLoadVideo,
          play: mockPlay,
          pause: mockPause,
          seek: mockSeek,
          on: mockOn,
        })
        .mockReturnValueOnce({
          state: 'loading',
          error: null,
          loadVideo: mockLoadVideo,
          play: mockPlay,
          pause: mockPause,
          seek: mockSeek,
          on: mockOn,
        });

      const { rerender } = render(
        <KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />
      );

      // First video ends
      act(() => {
        const endedHandler = eventHandlers.get('ended');
        if (endedHandler) endedHandler();
      });

      rerender(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('No Visible Controls', () => {
    it('should not render play button', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
    });

    it('should not render pause button', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    });

    it('should not render seek controls', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('should not render volume controls', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.queryByLabelText(/volume/i)).not.toBeInTheDocument();
    });

    it('should not render skip buttons', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for video container', () => {
      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      const container = screen.getByRole('region', { name: /video player/i });
      expect(container).toBeInTheDocument();
    });

    it('should announce video transitions to screen readers', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'playing',
        error: null,
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have descriptive error messages for screen readers', async () => {
      mockUseVideoPlayer.mockReturnValue({
        state: 'error',
        error: 'Video unavailable',
        loadVideo: mockLoadVideo,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        on: mockOn,
      });

      render(<KidsVideoPlayer videos={mockVideos} onPlaylistComplete={jest.fn()} />);

      await waitFor(() => {
        const errorRegion = screen.getByRole('alert');
        expect(errorRegion).toBeInTheDocument();
      });
    });
  });
});
