import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (maxWatchTime) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev && prev <= 1) {
            onEnd();
            return 0;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [maxWatchTime, onEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoEmbed = () => {
    if (video.platform_name === 'YouTube') {
      return (
        <iframe
          className="video-iframe"
          src={`https://www.youtube.com/embed/${video.platform_video_id}?autoplay=1&modestbranding=1&rel=0`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // For other platforms, we'd need their specific embed formats
    // For now, show a placeholder
    return (
      <div className="video-placeholder">
        <h2>{video.title}</h2>
        <p>Platform: {video.platform_name}</p>
        <p>Video ID: {video.platform_video_id}</p>
        <p className="placeholder-note">
          Video playback for {video.platform_name} would be integrated here
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