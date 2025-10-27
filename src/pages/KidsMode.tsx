import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import axios from 'axios';
import axiosInstance, { RequestManager } from '../utils/axiosConfig';
import VideoPlayer from '../components/VideoPlayer';
import KidsModeNFCScan from '../components/kids/KidsModeNFCScan';
import { KidsVideoPlayer } from '../components/kids/KidsVideoPlayer';
import { KidsErrorBoundary } from '../components/kids/KidsErrorBoundary';

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string;
  platform_video_id: string;
  platform_name: string;  // Platform name string (e.g., "YouTube", "Vimeo")
  sequence_order: number;
  max_watch_time_minutes?: number;
  remaining_minutes?: number;
}

interface NFCChip {
  id: string;
  chip_uid: string;
}

interface Session {
  session_id: string;
  max_watch_time_minutes: number | null;
}

const XIcon = FiX as React.ElementType;

const KidsMode: React.FC = () => {
  // Using BFF proxy mode: axiosInstance has baseURL='/api'
  // So we use relative URLs without '/api' prefix (e.g., '/nfc/scan/public')
  // sendBeacon() calls still need full '/api' path as they don't use baseURL

  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [chipVideos, setChipVideos] = useState<Video[]>([]);
  const [, setCurrentChip] = useState<NFCChip | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [error, setError] = useState('');
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (heartbeatInterval.current) {
        clearTimeout(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      RequestManager.cancelAllRequests();
    };
  }, []);

  // Separate effect for session cleanup to avoid dependency issues
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);
  
  useEffect(() => {
    return () => {
      // Use ref to access session on unmount to avoid stale closure
      if (sessionRef.current && navigator.sendBeacon) {
        const data = JSON.stringify({
          session_id: sessionRef.current.session_id,
          stopped_reason: 'manual'
        });
        // sendBeacon uses full path, not baseURL
        navigator.sendBeacon('/api/sessions/end/public', data);
      }
    };
  }, []);

  const handleNFCScan = async (chipUID: string) => {
    const controller = RequestManager.createController('nfcScan');

    try {
      setError('');

      // Scan NFC chip - backend returns first video directly (not chip wrapper)
      // Using axiosInstance with baseURL already set to '/api'
      const scanResponse = await axiosInstance.post('/nfc/scan/public', {
        chip_uid: chipUID
        // profile_id omitted - backend validation rejects null
        // TODO: Add profile selector UI and pass selected profile_id
      }, { signal: controller.signal });

      const video = scanResponse.data;  // Backend returns video object directly

      if (!video || !video.id) {
        setError('No video assigned to this chip. Ask a grown-up to add videos!');
        return;
      }

      // Use single video from scan response
      // Note: For multi-video sequential playback, backend needs to return ALL videos
      setChipVideos([video]);  // Wrap in array for KidsVideoPlayer
      setShowScanner(false);
      setShowVideoPlayer(true);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') {
          setError('Scan was cancelled');
        } else if (error.response?.status === 404) {
          setError('No video assigned to this chip. Ask a grown-up to add videos!');
        } else {
          setError(error.response?.data?.message || 'Failed to scan NFC chip');
        }
      } else {
        setError('Failed to scan NFC chip');
      }
    }
  };

  const endSession = async (reason: string) => {
    if (!currentSession) return;

    const controller = RequestManager.createController('endSession');

    try {
      await axiosInstance.post('/sessions/end/public', {
        session_id: currentSession.session_id,
        stopped_reason: reason
      }, { signal: controller.signal });
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    if (heartbeatInterval.current) {
      clearTimeout(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }

    setCurrentSession(null);
    sessionRef.current = null;
  };

  const handleVideoEnd = () => {
    endSession('manual');
    setCurrentVideo(null);
    setShowScanner(true);
  };

  const handlePlaylistComplete = () => {
    // Playlist finished → return to scan screen
    if (currentSession) {
      endSession('manual');
    }
    setCurrentVideo(null);
    setChipVideos([]);
    setCurrentChip(null);
    setShowVideoPlayer(false);
    setShowScanner(true);
  };

  const handleExit = () => {
    if (currentSession) {
      endSession('manual');
    }
    setCurrentVideo(null);
    setChipVideos([]);
    setCurrentChip(null);
    setShowVideoPlayer(false);
    setShowScanner(true);
  };

  const handleErrorBoundaryReset = () => {
    // Reset all state and return to scanner
    handleExit();
  };

  return (
    <KidsErrorBoundary onReset={handleErrorBoundaryReset}>
      <div className="kids-mode">
        {showScanner ? (
        <div className="scanner-view">
          <div className="scanner-header">
            <h1 className="kids-title">
              <span className="rainbow-text">Medio Kids</span>
            </h1>
            <p className="scanner-instruction">
              Scan your magic chip to watch a video!
            </p>
          </div>

          <KidsModeNFCScan onScan={handleNFCScan} />
          {error && (
            <div className="error-bubble" role="alert">
              {error}
            </div>
          )}

          <div className="parent-access">
            <a href="/login" className="parent-link">
              Parent Access
            </a>
          </div>
        </div>
      ) : showVideoPlayer ? (
        <KidsVideoPlayer
          videos={chipVideos}
          onPlaylistComplete={handlePlaylistComplete}
        />
      ) : currentVideo ? (
        <div className="player-view">
          <button className="exit-button" onClick={handleExit}>
            <XIcon />
          </button>

          {currentVideo.remaining_minutes && (
            <div className="time-remaining">
              Time remaining today: {currentVideo.remaining_minutes} minutes
            </div>
          )}

          <VideoPlayer
            video={currentVideo}
            onEnd={handleVideoEnd}
            maxWatchTime={currentVideo.max_watch_time_minutes}
          />
        </div>
        ) : null}
      </div>
    </KidsErrorBoundary>
  );
};

export default KidsMode;

