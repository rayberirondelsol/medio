import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoPlayer from '../components/VideoPlayer';

// Mock the videoSanitizer utils
const mockSanitizeVideo = jest.fn();
const mockGetSecureEmbedUrl = jest.fn();

jest.mock('../utils/videoSanitizer', () => ({
  sanitizeVideo: mockSanitizeVideo,
  getSecureEmbedUrl: mockGetSecureEmbedUrl
}));

describe('VideoPlayer Component', () => {
  const mockVideo = {
    id: 'test-video-id',
    title: 'Test Video',
    platform_video_id: 'abc123',
    platform_name: 'youtube',
  };

  const mockOnEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mock behavior
    mockSanitizeVideo.mockImplementation((video) => video);
    mockGetSecureEmbedUrl.mockImplementation((video) => {
      if (video.platform_name === 'youtube') {
        return `https://www.youtube.com/embed/${video.platform_video_id}`;
      }
      return null;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders video player with title', () => {
    render(
      <VideoPlayer video={mockVideo} onEnd={mockOnEnd} />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });

  it('renders YouTube iframe for YouTube videos', () => {
    render(
      <VideoPlayer video={mockVideo} onEnd={mockOnEnd} />
    );

    const iframe = screen.getByTitle('Test Video');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/abc123');
  });

  it('renders placeholder for unsupported platforms', () => {
    const unsupportedVideo = {
      ...mockVideo,
      platform_name: 'vimeo',
    };

    render(
      <VideoPlayer video={unsupportedVideo} onEnd={mockOnEnd} />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('Platform: vimeo')).toBeInTheDocument();
    expect(screen.getByText('Video ID: abc123')).toBeInTheDocument();
  });

  it('displays timer when maxWatchTime is provided', () => {
    render(
      <VideoPlayer video={mockVideo} onEnd={mockOnEnd} maxWatchTime={5} />
    );

    expect(screen.getByText('Time left: 5:00')).toBeInTheDocument();
  });

  it('counts down timer and calls onEnd when time expires', () => {
    render(
      <VideoPlayer video={mockVideo} onEnd={mockOnEnd} maxWatchTime={1} />
    );

    expect(screen.getByText('Time left: 1:00')).toBeInTheDocument();

    // Advance timer by 59 seconds
    act(() => {
      jest.advanceTimersByTime(59000);
    });

    expect(screen.getByText('Time left: 0:01')).toBeInTheDocument();
    expect(mockOnEnd).not.toHaveBeenCalled();

    // Advance timer by 1 more second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Time left: 0:00')).toBeInTheDocument();
    expect(mockOnEnd).toHaveBeenCalledTimes(1);
  });

  it('cleans up timer on unmount', () => {
    const { unmount } = render(
      <VideoPlayer video={mockVideo} onEnd={mockOnEnd} maxWatchTime={5} />
    );

    unmount();

    // Advance timer - onEnd should not be called after unmount
    act(() => {
      jest.advanceTimersByTime(300000); // 5 minutes
    });

    expect(mockOnEnd).not.toHaveBeenCalled();
  });

  it('displays error for invalid video data', () => {
    const invalidVideo = {
      id: '',
      title: '',
      platform_video_id: '',
      platform_name: '',
    };

    // Mock sanitizeVideo to return null for invalid video
    mockSanitizeVideo.mockReturnValueOnce(null);

    render(
      <VideoPlayer video={invalidVideo} onEnd={mockOnEnd} />
    );

    expect(screen.getByText('Error: Invalid video data')).toBeInTheDocument();
    expect(screen.getByText('This video cannot be played due to invalid information.')).toBeInTheDocument();
  });
});