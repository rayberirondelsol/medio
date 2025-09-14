import React, { useState, useEffect, useRef } from 'react';
import { FiCreditCard, FiX } from 'react-icons/fi';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import NFCScanner from '../components/NFCScanner';
import './KidsMode.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  platform_video_id: string;
  platform_name: string;
  max_watch_time_minutes?: number;
  remaining_minutes?: number;
}

interface Session {
  session_id: string;
  max_watch_time_minutes: number | null;
}

const KidsMode: React.FC = () => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [watchTime, setWatchTime] = useState(0);
  const [error, setError] = useState('');
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, []);

  // Separate effect for session cleanup to avoid dependency issues
  useEffect(() => {
    return () => {
      // Use a ref to track if we should end session on unmount
      if (currentSession) {
        // Using a synchronous cleanup for session end
        const sessionId = currentSession.session_id;
        // Send beacon for cleanup (works even when page is closing)
        if (navigator.sendBeacon) {
          const data = JSON.stringify({
            session_id: sessionId,
            stopped_reason: 'manual'
          });
          navigator.sendBeacon(`${API_URL}/sessions/end`, data);
        }
      }
    };
  }, [currentSession]);

  const handleNFCScan = async (chipUID: string) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/nfc/scan/public`, {
        chip_uid: chipUID,
        profile_id: null // Could be selected from a profile selector
      });

      const video = response.data;
      
      if (video.limit_reached) {
        setError('Daily watch limit reached! Come back tomorrow.');
        return;
      }

      setCurrentVideo(video);
      setShowScanner(false);
      
      // Start a watch session
      startSession(video.id);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to scan NFC chip');
    }
  };

  const startSession = async (videoId: string) => {
    try {
      const response = await axios.post(`${API_URL}/sessions/start/public`, {
        video_id: videoId,
        profile_id: null // Could be from selected profile
      });

      setCurrentSession(response.data);
      setWatchTime(0);

      // Start heartbeat to track session
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      heartbeatInterval.current = setInterval(() => {
        checkSessionStatus(response.data.session_id);
      }, 30000); // Every 30 seconds
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const checkSessionStatus = async (sessionId: string) => {
    try {
      const response = await axios.post(`${API_URL}/sessions/heartbeat/public`, {
        session_id: sessionId
      });

      if (response.data.should_stop) {
        handleTimeLimit(response.data.stop_reason);
      }

      setWatchTime(response.data.watched_minutes);
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  };

  const endSession = async (reason: string) => {
    if (!currentSession) return;

    try {
      await axios.post(`${API_URL}/sessions/end/public`, {
        session_id: currentSession.session_id,
        stopped_reason: reason
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }

    setCurrentSession(null);
  };

  const handleTimeLimit = (reason: string) => {
    endSession(reason);
    setCurrentVideo(null);
    setShowScanner(true);
    setError(reason === 'daily_limit' 
      ? 'Daily watch time reached! See you tomorrow!' 
      : 'Video time is up! Scan another chip to watch more.');
  };

  const handleVideoEnd = () => {
    endSession('manual');
    setCurrentVideo(null);
    setShowScanner(true);
  };

  const handleExit = () => {
    if (currentSession) {
      endSession('manual');
    }
    setCurrentVideo(null);
    setShowScanner(true);
  };

  return (
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

          <NFCScanner onScan={handleNFCScan} />

          {error && (
            <div className="error-bubble">
              {error}
            </div>
          )}

          <div className="parent-access">
            <a href="/login" className="parent-link">
              Parent Access
            </a>
          </div>
        </div>
      ) : currentVideo ? (
        <div className="player-view">
          <button className="exit-button" onClick={handleExit}>
            <FiX />
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
  );
};

export default KidsMode;