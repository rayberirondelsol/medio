import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiUser } from 'react-icons/fi';
import axios from 'axios';
import './Profiles.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  daily_limit_minutes: number;
  created_at: string;
}

const PlusIcon = FiPlus as React.ElementType;
const Edit2Icon = FiEdit2 as React.ElementType;
const Trash2Icon = FiTrash2 as React.ElementType;
const ClockIcon = FiClock as React.ElementType;
const UserIcon = FiUser as React.ElementType;

const Profiles: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    daily_limit_minutes: 60,
    avatar_url: ''
  });

  const avatarOptions = [
    '🦁', '🐨', '🐼', '🦊', '🐸', '🦄', '🐙', '🦋'
  ];

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/profiles`);
      setProfiles(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setIsLoading(false);
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/profiles`, formData);
      setProfiles([response.data, ...profiles]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding profile:', error);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await axios.delete(`${API_URL}/profiles/${id}`);
        setProfiles(profiles.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting profile:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      daily_limit_minutes: 60,
      avatar_url: ''
    });
  };

  return (
    <Layout>
      <div className="profiles-page">
        <div className="page-header">
          <h1>Child Profiles</h1>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <PlusIcon /> Add Profile
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading profiles...</div>
        ) : profiles.length === 0 ? (
          <div className="empty-state">
            <UserIcon className="empty-icon" />
            <h2>No profiles yet</h2>
            <p>Create profiles for your children to manage their watch time</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <PlusIcon /> Add Profile
            </button>
          </div>
        ) : (
          <div className="profiles-grid">
            {profiles.map((profile) => (
              <div key={profile.id} className="profile-card">
                <div className="profile-avatar">
                  {profile.avatar_url || '👤'}
                </div>
                <div className="profile-info">
                  <h3>{profile.name}</h3>
                  <div className="profile-limits">
                    <ClockIcon />
                    <span>{profile.daily_limit_minutes} min/day</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="btn-icon" title="Edit">
                    <Edit2Icon />
                  </button>
                  <button 
                    className="btn-icon delete" 
                    title="Delete"
                    onClick={() => handleDeleteProfile(profile.id)}
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
                <h2>Add Child Profile</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleAddProfile} className="modal-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Child's name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Avatar</label>
                  <div className="avatar-selector">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        className={`avatar-option ${formData.avatar_url === avatar ? 'selected' : ''}`}
                        onClick={() => setFormData({...formData, avatar_url: avatar})}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Daily Watch Limit (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={formData.daily_limit_minutes}
                    onChange={(e) => setFormData({
                      ...formData, 
                      daily_limit_minutes: parseInt(e.target.value)
                    })}
                    required
                  />
                  <small>Maximum watch time per day</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Profile
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

export default Profiles;