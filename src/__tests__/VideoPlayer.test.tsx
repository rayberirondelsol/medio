import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { AuthContext } from '../contexts/AuthContext';

// Mock the video element
HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
HTMLMediaElement.prototype.pause = jest.fn();
HTMLMediaElement.prototype.load = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('VideoPlayer Component', () => {
  const mockVideo = {
    id: 'test-video-id',
    title: 'Test Video',
    url: 'https://example.com/video.mp4',
    thumbnail_url: 'https://example.com/thumb.jpg',
    duration_seconds: 120,
  };

  const mockProfile = {
    id: 'profile-id',
    name: 'Timmy',
    daily_limit_minutes: 60,
  };

  const mockAuthContext = {
    user: { id: 'user-id', email: 'test@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  it('renders video player with controls', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
  });

  it('starts and tracks watch session', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'session-123',
        started_at: new Date().toISOString(),
        daily_limit_remaining_minutes: 45,
        max_session_minutes: 30,
      }),
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} autoPlay />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/start/public'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            profile_id: mockProfile.id,
            video_id: mockVideo.id,
          }),
        })
      );
    });
  });

  it('sends heartbeat during playback', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-123',
          started_at: new Date().toISOString(),
          daily_limit_remaining_minutes: 45,
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          continue: true,
          remaining_minutes: 44,
          message: 'Session active',
        }),
      });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    // Fast-forward 30 seconds (heartbeat interval)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/heartbeat/public'),
        expect.any(Object)
      );
    });

    jest.useRealTimers();
  });

  it('handles daily limit reached', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-123',
          started_at: new Date().toISOString(),
          daily_limit_remaining_minutes: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          continue: false,
          remaining_minutes: 0,
          message: 'Daily limit reached',
        }),
      });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText(/Daily limit reached/i)).toBeInTheDocument();
    });

    // Video should be paused
    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(videoElement.pause).toHaveBeenCalled();
  });

  it('ends session on component unmount', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { unmount } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/start/public'),
        expect.any(Object)
      );
    });

    unmount();

    // Check if sendBeacon was called for session end
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/end/public'),
      expect.any(String)
    );
  });

  it('handles video streaming with range requests', async () => {
    const videoUrl = `/api/videos/${mockVideo.id}/stream`;

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} streaming />
      </AuthContext.Provider>
    );

    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(videoElement.src).toContain(videoUrl);
  });

  it('displays remaining time warning', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'session-123',
        started_at: new Date().toISOString(),
        daily_limit_remaining_minutes: 5,
      }),
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText(/5 minutes remaining/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to start session/i)).toBeInTheDocument();
    });
  });

  it('supports fullscreen mode', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const fullscreenButton = screen.getByLabelText('Fullscreen');
    fireEvent.click(fullscreenButton);

    const videoContainer = screen.getByTestId('video-container');
    expect(videoContainer.requestFullscreen).toHaveBeenCalled();
  });

  it('adjusts volume', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const volumeSlider = screen.getByLabelText('Volume');
    fireEvent.change(volumeSlider, { target: { value: '0.5' } });

    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(videoElement.volume).toBe(0.5);
  });

  it('displays loading state while fetching session', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('handles video progress updates', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    const progressBar = screen.getByRole('progressbar');

    // Simulate time update
    Object.defineProperty(videoElement, 'currentTime', {
      writable: true,
      value: 60,
    });
    Object.defineProperty(videoElement, 'duration', {
      writable: true,
      value: 120,
    });

    fireEvent.timeUpdate(videoElement);

    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('supports keyboard controls', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <VideoPlayer video={mockVideo} profile={mockProfile} />
      </AuthContext.Provider>
    );

    const videoContainer = screen.getByTestId('video-container');

    // Space to play/pause
    fireEvent.keyDown(videoContainer, { key: ' ', code: 'Space' });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    // Arrow keys for seeking
    fireEvent.keyDown(videoContainer, { key: 'ArrowRight', code: 'ArrowRight' });
    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(videoElement.currentTime).toBeGreaterThan(0);
  });
});