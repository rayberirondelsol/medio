import { useEffect, useRef, useState } from 'react';
import { sanitizeVideo, getSecureEmbedUrl } from '../utils/videoSanitizer';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    platform_video_id: string;
    platform_name: string;
  };
  onEnd: () => void;
  maxWatchTime?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onEnd, maxWatchTime }) => {
  const [timeRemaining, setTimeRemaining] = useState(maxWatchTime ? maxWatchTime * 60 : null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Track component mounted state
    isMountedRef.current = true;

    if (maxWatchTime) {
      timerRef.current = setInterval(() => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setTimeRemaining((prev) => {
            if (prev && prev <= 1) {
              // Only call onEnd if component is still mounted
              if (isMountedRef.current) {
                onEnd();
              }
              return 0;
            }
            return prev ? prev - 1 : null;
          });
        }
      }, 1000);
    }

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [maxWatchTime, onEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoEmbed = () => {
    // Sanitize the video data for security
    const sanitizedVideo = sanitizeVideo(video);
    
    if (!sanitizedVideo) {
      return (
        <div className="video-error">
          <h3>Error: Invalid video data</h3>
          <p>This video cannot be played due to invalid information.</p>
        </div>
      );
    }

    const embedUrl = getSecureEmbedUrl(sanitizedVideo);
    
    if (embedUrl) {
      return (
        <iframe
          className="video-iframe"
          src={embedUrl}
          title={sanitizedVideo.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      );
    }

    // For unsupported platforms, show a placeholder
    return (
      <div className="video-placeholder">
        <h2>{sanitizedVideo.title}</h2>
        <p>Platform: {sanitizedVideo.platform_name}</p>
        <p>Video ID: {sanitizedVideo.platform_video_id}</p>
        <p className="placeholder-note">
          Video playback for {sanitizedVideo.platform_name} would be integrated here
        </p>
      </div>
    );
  };

  return (
    <div className="video-player">
      {timeRemaining !== null && (
        <div className="timer-overlay">
          <span className="timer-display">
            Time left: {formatTime(timeRemaining)}
          </span>
        </div>
      )}
      
      <div className="video-container">
        {getVideoEmbed()}
      </div>

      <div className="video-info">
        <h3>{video.title}</h3>
      </div>
    </div>
  );
};

export default VideoPlayer;