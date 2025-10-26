/**
 * KidsVideoPlayer Component
 *
 * Fullscreen video player for Kids Mode with sequential playback.
 * Features:
 * - Button-free UI (no visible controls)
 * - Gesture controls (tilt-to-scrub, shake-to-skip)
 * - Automatic sequential playback (A → B → C)
 * - Returns to scan screen after last video
 * - Child-friendly error messages
 */

import React, { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { GesturePermissionGate } from './GesturePermissionGate';
import './KidsVideoPlayer.css';

interface Video {
  id: string;
  title: string;
  platform_id: string;
  platform_video_id: string;
  sequence_order: number;
}

interface KidsVideoPlayerProps {
  videos: Video[];
  onPlaylistComplete: () => void;
}

export const KidsVideoPlayer: React.FC<KidsVideoPlayerProps> = ({
  videos,
  onPlaylistComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [hasAttemptedFullscreen, setHasAttemptedFullscreen] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [endMessage, setEndMessage] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const { state, error, loadVideo, play, on, seek } = useVideoPlayer('kids-video-container');

  // Gesture hooks
  const {
    tiltIntensity,
    tiltDirection,
    permissionGranted,
    requestPermission,
  } = useDeviceOrientation();

  const {
    shakeDetected,
    shakeDirection,
  } = useShakeDetection();

  const {
    swipeDetected,
    swipeDirection,
  } = useSwipeGesture();

  // Track last seek time for tilt-to-scrub
  const lastSeekTimeRef = useRef<number>(0);

  /**
   * Enter fullscreen mode on mount
   */
  useEffect(() => {
    const enterFullscreen = async () => {
      if (!containerRef.current) return;

      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setHasAttemptedFullscreen(true);
        }
      } catch (err) {
        console.error('Fullscreen request failed:', err);
        setHasAttemptedFullscreen(true);
      }
    };

    enterFullscreen();

    // Exit fullscreen on unmount
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error('Exit fullscreen failed:', err);
        });
      }
    };
  }, []);

  /**
   * Load first video on mount
   */
  useEffect(() => {
    if (videos.length === 0) return;

    const firstVideo = videos[0];
    loadVideo(firstVideo.platform_id, firstVideo.platform_video_id);
  }, [videos, loadVideo]);

  /**
   * Auto-play when video is ready
   */
  useEffect(() => {
    if (state === 'ready') {
      play();
    }
  }, [state, play]);

  /**
   * Hide swipe hint after 5 seconds
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Handle video ended event → advance to next video or complete playlist
   */
  useEffect(() => {
    const handleEnded = () => {
      const isLastVideo = currentVideoIndex === videos.length - 1;

      if (isLastVideo) {
        // Playlist complete → return to scan screen
        onPlaylistComplete();
      } else {
        // Load next video
        const nextIndex = currentVideoIndex + 1;
        setCurrentVideoIndex(nextIndex);

        const nextVideo = videos[nextIndex];
        loadVideo(nextVideo.platform_id, nextVideo.platform_video_id);
      }
    };

    on('ended', handleEnded);
  }, [currentVideoIndex, videos, loadVideo, on, onPlaylistComplete]);

  /**
   * Tilt-to-scrub: Scrub video based on tilt intensity and direction
   */
  useEffect(() => {
    if (state !== 'playing' || tiltIntensity === 0) {
      return;
    }

    // Calculate scrub delta: 2 seconds/second at max intensity (60fps throttling)
    const scrubSpeed = 2; // seconds per second at full tilt
    const deltaPerFrame = (scrubSpeed * tiltIntensity) / 60; // 60fps

    // Calculate new seek time
    const currentTime = lastSeekTimeRef.current;
    let newTime: number;

    if (tiltDirection === 'forward') {
      newTime = currentTime + deltaPerFrame;
    } else if (tiltDirection === 'backward') {
      newTime = currentTime - deltaPerFrame;
    } else {
      return;
    }

    // Update last seek time
    lastSeekTimeRef.current = newTime;

    // Perform seek (player will clamp to [0, duration])
    seek(newTime);
  }, [tiltIntensity, tiltDirection, state, seek]);

  /**
   * Shake-to-skip: Skip to next/previous video on shake
   */
  useEffect(() => {
    if (!shakeDetected || state !== 'playing') {
      return;
    }

    const isFirstVideo = currentVideoIndex === 0;
    const isLastVideo = currentVideoIndex === videos.length - 1;

    if (shakeDirection === 'right') {
      if (isLastVideo) {
        // Show friendly "no more videos" message
        setEndMessage('🎉 Great job! You watched all the videos!');
        setShowEndMessage(true);

        setTimeout(() => {
          setShowEndMessage(false);
          onPlaylistComplete();
        }, 3000);
      } else {
        // Skip to next video
        const nextIndex = currentVideoIndex + 1;
        setCurrentVideoIndex(nextIndex);
        const nextVideo = videos[nextIndex];
        loadVideo(nextVideo.platform_id, nextVideo.platform_video_id);
      }
    } else if (shakeDirection === 'left') {
      if (isFirstVideo) {
        // Restart current video
        lastSeekTimeRef.current = 0;
        seek(0);
      } else {
        // Go to previous video
        const prevIndex = currentVideoIndex - 1;
        setCurrentVideoIndex(prevIndex);
        const prevVideo = videos[prevIndex];
        loadVideo(prevVideo.platform_id, prevVideo.platform_video_id);
      }
    }
  }, [shakeDetected, shakeDirection, state, currentVideoIndex, videos, loadVideo, seek, onPlaylistComplete]);

  /**
   * Swipe-to-exit: Exit fullscreen and return to scan screen on swipe down
   */
  useEffect(() => {
    if (!swipeDetected || swipeDirection !== 'down') {
      return;
    }

    // Stop video playback and return to scan screen
    onPlaylistComplete();
  }, [swipeDetected, swipeDirection, onPlaylistComplete]);

  /**
   * Retry loading current video on error
   */
  const handleRetry = () => {
    if (videos.length === 0) return;

    const currentVideo = videos[currentVideoIndex];
    loadVideo(currentVideo.platform_id, currentVideo.platform_video_id);
  };

  /**
   * Return to scan screen from error state
   */
  const handleBackToScan = () => {
    onPlaylistComplete();
  };

  // Error state: no videos assigned
  if (videos.length === 0) {
    return (
      <div
        className="kids-video-player kids-video-player--error"
        data-testid="kids-video-player"
        role="alert"
        aria-live="assertive"
      >
        <div className="kids-video-player__error-content">
          <div className="kids-video-player__error-emoji">😢</div>
          <h2 className="kids-video-player__error-title">
            Oops! No videos on this chip
          </h2>
          <p className="kids-video-player__error-message">
            This magic chip has no videos yet. Ask a grown-up to add some videos!
          </p>
          <button
            className="kids-video-player__button"
            onClick={handleBackToScan}
            aria-label="Scan another chip"
          >
            Scan Another Chip
          </button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  // Error state: video loading or playback error
  if (state === 'error' && error) {
    return (
      <div
        className="kids-video-player kids-video-player--error"
        data-testid="kids-video-player"
        role="alert"
        aria-live="assertive"
      >
        <div className="kids-video-player__error-content">
          <div className="kids-video-player__error-emoji">😢</div>
          <h2 className="kids-video-player__error-title">
            Oops! Something went wrong
          </h2>
          <p className="kids-video-player__error-message">
            We couldn't play this video. Let's try again!
          </p>
          <div className="kids-video-player__button-group">
            <button
              className="kids-video-player__button kids-video-player__button--primary"
              onClick={handleRetry}
              aria-label="Try again"
            >
              Try Again
            </button>
            <button
              className="kids-video-player__button kids-video-player__button--secondary"
              onClick={handleBackToScan}
              aria-label="Back to scan"
            >
              Back to Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div
        className="kids-video-player kids-video-player--loading"
        data-testid="kids-video-player"
        ref={containerRef}
        data-fullscreen-attempted={hasAttemptedFullscreen}
      >
        <div className="kids-video-player__loading-content">
          <div className="kids-video-player__spinner" role="status" aria-label="Loading video">
            <div className="kids-video-player__spinner-circle"></div>
          </div>
          <p className="kids-video-player__loading-text">Loading your video...</p>
        </div>
      </div>
    );
  }

  // Main player view
  return (
    <div
      className="kids-video-player"
      data-testid="kids-video-player"
      ref={containerRef}
      role="region"
      aria-label="Video player"
      data-fullscreen-attempted={hasAttemptedFullscreen}
    >
      {/* Hidden status announcements for screen readers */}
      <div
        className="kids-video-player__sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state === 'playing' && `Now playing: ${currentVideo.title}`}
        {state === 'loading' && 'Loading next video'}
      </div>

      {/* Video title overlay (shown briefly at start) */}
      {(state === 'ready' || state === 'playing') && (
        <div className="kids-video-player__title-overlay">
          <h2 className="kids-video-player__video-title">{currentVideo.title}</h2>
        </div>
      )}

      {/* Swipe hint (subtle down arrow at top) */}
      {showSwipeHint && (
        <div
          className={`kids-video-player__swipe-hint ${
            !showSwipeHint ? 'kids-video-player__swipe-hint--fade-out' : ''
          }`}
          aria-hidden="true"
        />
      )}

      {/* Video container (player embeds here) */}
      <div
        id="kids-video-container"
        className="kids-video-player__video-container"
        data-current-time={lastSeekTimeRef.current}
      ></div>

      {/* Gesture permission gate (iOS) */}
      <GesturePermissionGate
        isRequired={!permissionGranted}
        isGranted={permissionGranted}
        onRequestPermission={requestPermission}
      />

      {/* End message (shake right on last video) */}
      {showEndMessage && (
        <div className="kids-video-player__end-message">
          <div className="kids-video-player__end-message-content">
            <p className="kids-video-player__end-message-text">{endMessage}</p>
          </div>
        </div>
      )}

      {/* No visible controls per Kids Mode design */}
    </div>
  );
};
