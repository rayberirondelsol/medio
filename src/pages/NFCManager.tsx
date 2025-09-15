import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FiPlus, FiCreditCard, FiLink2, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import './NFCManager.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface NFCChip {
  id: string;
  chip_uid: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
}

const NFCManager: React.FC = () => {
  const [chips, setChips] = useState<NFCChip[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedChip, setSelectedChip] = useState<NFCChip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    chip_uid: '',
    label: ''
  });
  const [linkData, setLinkData] = useState({
    video_id: '',
    max_watch_time_minutes: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [chipsRes, videosRes] = await Promise.all([
        axios.get(`${API_URL}/nfc/chips`),
        axios.get(`${API_URL}/videos`)
      ]);
      setChips(chipsRes.data);
      setVideos(videosRes.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  const handleAddChip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/nfc/chips`, formData);
      setChips([response.data, ...chips]);
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('This NFC chip is already registered');
      } else {
        console.error('Error adding chip:', error);
      }
    }
  };

  const handleLinkVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChip) return;

    try {
      await axios.post(`${API_URL}/nfc/map`, {
        video_id: linkData.video_id,
        nfc_chip_id: selectedChip.id,
        max_watch_time_minutes: linkData.max_watch_time_minutes
      });
      setShowLinkModal(false);
      resetLinkForm();
      alert('Video linked successfully!');
    } catch (error) {
      console.error('Error linking video:', error);
    }
  };

  const handleDeleteChip = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this NFC chip?')) {
      try {
        await axios.delete(`${API_URL}/nfc/chips/${id}`);
        setChips(chips.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting chip:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      chip_uid: '',
      label: ''
    });
  };

  const resetLinkForm = () => {
    setLinkData({
      video_id: '',
      max_watch_time_minutes: 30
    });
    setSelectedChip(null);
  };

  const openLinkModal = (chip: NFCChip) => {
    setSelectedChip(chip);
    setShowLinkModal(true);
  };

  return (
    <Layout>
      <div className="nfc-page">
        <div className="page-header">
          <h1>NFC Chip Manager</h1>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <FiPlus /> Register Chip
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading NFC chips...</div>
        ) : chips.length === 0 ? (
          <div className="empty-state">
            <FiCreditCard className="empty-icon" />
            <h2>No NFC chips registered</h2>
            <p>Register NFC chips to link them with videos</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <FiPlus /> Register First Chip
            </button>
          </div>
        ) : (
          <div className="chips-grid">
            {chips.map((chip) => (
              <div key={chip.id} className="chip-card">
                <div className="chip-icon">
                  <FiCreditCard />
                </div>
                <div className="chip-info">
                  <h3>{chip.label}</h3>
                  <p className="chip-uid">ID: {chip.chip_uid}</p>
                  <span className={`chip-status ${chip.is_active ? 'active' : 'inactive'}`}>
                    {chip.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="chip-actions">
                  <button 
                    className="btn-icon" 
                    title="Link Video"
                    onClick={() => openLinkModal(chip)}
                  >
                    <FiLink2 />
                  </button>
                  <button 
                    className="btn-icon delete" 
                    title="Delete"
                    onClick={() => handleDeleteChip(chip.id)}
                  >
                    <FiTrash2 />
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
                <h2>Register NFC Chip</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleAddChip} className="modal-form">
                <div className="form-group">
                  <label>Chip ID</label>
                  <input
                    type="text"
                    value={formData.chip_uid}
                    onChange={(e) => setFormData({...formData, chip_uid: e.target.value})}
                    placeholder="e.g., CHIP001"
                    required
                  />
                  <small>Unique identifier from the NFC chip</small>
                </div>

                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({...formData, label: e.target.value})}
                    placeholder="e.g., Blue Dinosaur Card"
                    required
                  />
                  <small>Friendly name to identify this chip</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Chip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLinkModal && selectedChip && (
          <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Link Video to {selectedChip.label}</h2>
                <button className="close-btn" onClick={() => setShowLinkModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleLinkVideo} className="modal-form">
                <div className="form-group">
                  <label>Select Video</label>
                  <select
                    value={linkData.video_id}
                    onChange={(e) => setLinkData({...linkData, video_id: e.target.value})}
                    required
                  >
                    <option value="">Choose a video</option>
                    {videos.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Max Watch Time (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={linkData.max_watch_time_minutes}
                    onChange={(e) => setLinkData({
                      ...linkData,
                      max_watch_time_minutes: parseInt(e.target.value)
                    })}
                  />
                  <small>Leave empty for unlimited (within daily limit)</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Link Video
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

export default NFCManager;