import React, { useState, useEffect, useRef } from 'react';
import { FiCreditCard, FiX } from 'react-icons/fi';
import axiosInstance, { RequestManager } from '../utils/axiosConfig';
import VideoPlayer from '../components/VideoPlayer';
import NFCScanner from '../components/NFCScanner';
import './KidsMode.css';

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error('REACT_APP_API_URL environment variable is required');
}

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
  const sessionRef = useRef<Session | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
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
        navigator.sendBeacon(`${API_URL}/sessions/end/public`, data);
      }
    };
  }, []);

  const handleNFCScan = async (chipUID: string) => {
    const controller = RequestManager.createController('nfcScan');
    
    try {
      setError('');
      const response = await axiosInstance.post(`${API_URL}/nfc/scan/public`, {
        chip_uid: chipUID,
        profile_id: null // Could be selected from a profile selector
      }, { signal: controller.signal });

      const video = response.data;
      
      if (video.limit_reached) {
        setError('Daily watch limit reached! Come back tomorrow.');
        return;
      }

      setCurrentVideo(video);
      setShowScanner(false);
      
      // Start a watch session
      startSession(video.id);
    } catch (error) {
      if (axiosInstance.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') {
          setError('Scan was cancelled');
        } else {
          setError(error.response?.data?.message || 'Failed to scan NFC chip');
        }
      } else {
        setError('Failed to scan NFC chip');
      }
    }
  };

  const startSession = async (videoId: string) => {
    const controller = RequestManager.createController('startSession');
    
    try {
      const response = await axiosInstance.post(`${API_URL}/sessions/start/public`, {
        video_id: videoId,
        profile_id: null // Could be from selected profile
      }, { signal: controller.signal });

      setCurrentSession(response.data);
      sessionRef.current = response.data;
      setWatchTime(0);

      // Start heartbeat to track session with exponential backoff
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      let heartbeatDelay = 30000; // Start with 30 seconds
      const maxDelay = 120000; // Max 2 minutes
      
      const scheduleHeartbeat = () => {
        if (!isMountedRef.current) return;
        
        heartbeatInterval.current = setTimeout(async () => {
          if (!isMountedRef.current || !sessionRef.current) return;
          
          try {
            await checkSessionStatus(sessionRef.current.session_id);
            heartbeatDelay = 30000; // Reset on success
          } catch (error) {
            // Exponential backoff on error
            heartbeatDelay = Math.min(heartbeatDelay * 1.5, maxDelay);
          }
          
          if (isMountedRef.current && sessionRef.current) {
            scheduleHeartbeat();
          }
        }, heartbeatDelay);
      };
      
      scheduleHeartbeat();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const checkSessionStatus = async (sessionId: string) => {
    const controller = RequestManager.createController('heartbeat');
    
    try {
      const response = await axiosInstance.post(`${API_URL}/sessions/heartbeat/public`, {
        session_id: sessionId
      }, { signal: controller.signal });

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
    
    const controller = RequestManager.createController('endSession');

    try {
      await axiosInstance.post(`${API_URL}/sessions/end/public`, {
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