import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import LazyImage from '../components/LazyImage';
import { useLoading } from '../contexts/LoadingContext';
import { createRateLimiterUtils } from '../utils/rateLimiter';
import { RATE_LIMITS } from '../constants/rateLimits';
import { FiPlus, FiEdit2, FiTrash2, FiLink, FiYoutube } from 'react-icons/fi';
import { SiNetflix, SiPrime } from 'react-icons/si';
import axios from 'axios';
import './Videos.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  const { startLoading, stopLoading, isLoading } = useLoading();
  const deleteRateLimiter = createRateLimiterUtils({ 
    ...RATE_LIMITS.VIDEO_DELETE,
    key: 'video-delete' 
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform_id: '',
    platform_video_id: '',
    thumbnail_url: '',
    age_rating: ''
  });

  const platforms = [
    { id: '1', name: 'YouTube', icon: FiYoutube },
    { id: '2', name: 'Netflix', icon: SiNetflix },
    { id: '3', name: 'Prime Video', icon: SiPrime },
    { id: '4', name: 'Disney+', icon: FiLink },
  ];

  const fetchVideos = useCallback(async () => {
    startLoading('videos');
    try {
      const response = await axios.get(`${API_URL}/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      stopLoading('videos');
    }
  }, [setVideos, startLoading, stopLoading]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    startLoading('addVideo');
    try {
      const response = await axios.post(`${API_URL}/videos`, formData);
      setVideos([response.data, ...videos]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding video:', error);
    } finally {
      stopLoading('addVideo');
    }
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
        await axios.delete(`${API_URL}/videos/${id}`);
        setVideos(videos.filter(v => v.id !== id));
      } catch (error) {
        console.error('Error deleting video:', error);
      } finally {
        stopLoading('deleteVideo');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      platform_id: '',
      platform_video_id: '',
      thumbnail_url: '',
      age_rating: ''
    });
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : url;
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

        {isLoading('videos') ? (
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

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Video</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleAddVideo} className="modal-form">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Platform</label>
                  <select
                    value={formData.platform_id}
                    onChange={(e) => setFormData({...formData, platform_id: e.target.value})}
                    required
                  >
                    <option value="">Select a platform</option>
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Video URL/ID</label>
                  <input
                    type="text"
                    value={formData.platform_video_id}
                    onChange={(e) => setFormData({
                      ...formData, 
                      platform_video_id: extractYouTubeId(e.target.value)
                    })}
                    placeholder="YouTube URL or video ID"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Age Rating (optional)</label>
                  <select
                    value={formData.age_rating}
                    onChange={(e) => setFormData({...formData, age_rating: e.target.value})}
                  >
                    <option value="">No rating</option>
                    <option value="G">G - General</option>
                    <option value="PG">PG - Parental Guidance</option>
                    <option value="PG-13">PG-13</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Video
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default Videos;