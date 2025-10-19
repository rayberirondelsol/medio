import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import LazyImage from '../components/LazyImage';
import AddVideoModal from '../components/videos/AddVideoModal';
import VideoFormErrorBoundary from '../components/videos/VideoFormErrorBoundary';
import { useLoading } from '../contexts/LoadingContext';
import { createRateLimiterUtils } from '../utils/rateLimiter';
import { RATE_LIMITS } from '../constants/rateLimits';
import { FiPlus, FiEdit2, FiTrash2, FiLink, FiYoutube } from 'react-icons/fi';
import { SiNetflix, SiPrime } from 'react-icons/si';
import axiosInstance from '../utils/axiosConfig';
import { resolveApiBaseUrlOrDefault } from '../utils/runtimeConfig';
import './Videos.css';

const API_URL = resolveApiBaseUrlOrDefault('http://localhost:5000/api');

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  platform_name: string;
  platform_video_id: string;
  duration_seconds?: number;
  age_rating?: string;
}

const PlusIcon = FiPlus as React.ElementType;
const Edit2Icon = FiEdit2 as React.ElementType;
const Trash2Icon = FiTrash2 as React.ElementType;
const LinkIcon = FiLink as React.ElementType;

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [videosFetchError, setVideosFetchError] = useState<string | null>(null);
  const { startLoading, stopLoading, isLoading } = useLoading();
  const deleteRateLimiter = createRateLimiterUtils({
    ...RATE_LIMITS.VIDEO_DELETE,
    key: 'video-delete'
  });

  const platforms = [
    { id: '1', name: 'YouTube', icon: FiYoutube },
    { id: '2', name: 'Netflix', icon: SiNetflix },
    { id: '3', name: 'Prime Video', icon: SiPrime },
    { id: '4', name: 'Disney+', icon: FiLink },
  ];

  const fetchVideos = useCallback(async () => {
    startLoading('videos');
    setVideosFetchError(null);
    try {
      const response = await axiosInstance.get(`${API_URL}/videos`);
      // Backend returns {data: [...], pagination: {...}}
      // Extract the videos array from response.data.data
      const videosData = response.data.data || response.data || [];
      setVideos(Array.isArray(videosData) ? videosData : []);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      setVideosFetchError(
        error.response?.data?.message ||
        error.message ||
        'Failed to load videos'
      );
    } finally {
      stopLoading('videos');
    }
  }, [startLoading, stopLoading]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoAdded = () => {
    // Refresh videos list after adding a new video
    fetchVideos();
  };

  const handleDeleteVideo = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      if (!deleteRateLimiter.isAllowed()) {
        const resetTime = deleteRateLimiter.getResetTime();
        alert(`Too many deletions. Please try again in ${Math.ceil(resetTime / 1000)} seconds.`);
        return;
      }
      
      startLoading('deleteVideo');
      try {
        await axiosInstance.delete(`${API_URL}/videos/${id}`);
        setVideos(videos.filter(v => v.id !== id));
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
      } finally {
        stopLoading('deleteVideo');
      }
    }
  };

  const getPlatformIcon = (platformName: string) => {
    const platform = platforms.find(p => p.name === platformName);
    if (platform) {
      const Icon = platform.icon as React.ElementType;
      return <Icon />;
    }
    return <LinkIcon />;
  };

  return (
    <Layout>
      <div className="videos-page">
        <div className="page-header">
          <h1>Video Library</h1>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <PlusIcon /> Add Video
          </button>
        </div>

        {videosFetchError ? (
          <div className="error-state">
            <h2>Error Loading Videos</h2>
            <p>{videosFetchError}</p>
            <button className="btn btn-primary" onClick={fetchVideos}>
              Try Again
            </button>
          </div>
        ) : isLoading('videos') ? (
          <div className="loading">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <h2>No videos yet</h2>
            <p>Add your first video to get started</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <PlusIcon /> Add Video
            </button>
          </div>
        ) : (
          <div className="videos-grid">
            {videos.map((video) => (
              <div key={video.id} className="video-card">
                <div className="video-thumbnail">
                  {video.thumbnail_url ? (
                    <LazyImage src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      {getPlatformIcon(video.platform_name)}
                    </div>
                  )}
                  {video.age_rating && (
                    <span className="age-rating">{video.age_rating}</span>
                  )}
                </div>
                <div className="video-info">
                  <h3>{video.title}</h3>
                  <p className="video-platform">
                    {getPlatformIcon(video.platform_name)}
                    {video.platform_name}
                  </p>
                  {video.description && (
                    <p className="video-description">{video.description}</p>
                  )}
                </div>
                <div className="video-actions">
                  <button className="btn-icon" title="Edit">
                    <Edit2Icon />
                  </button>
                  <button 
                    className="btn-icon delete" 
                    title="Delete"
                    onClick={() => handleDeleteVideo(video.id)}
                  >
                    <Trash2Icon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <VideoFormErrorBoundary>
          <AddVideoModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onVideoAdded={handleVideoAdded}
          />
        </VideoFormErrorBoundary>
      </div>
    </Layout>
  );
};
export default Videos;

