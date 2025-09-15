import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { FiVideo, FiUsers, FiCreditCard, FiClock, FiPlay, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface DashboardStats {
  totalVideos: number;
  totalProfiles: number;
  totalNFCChips: number;
  watchTimeToday: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVideos: 0,
    totalProfiles: 0,
    totalNFCChips: 0,
    watchTimeToday: 0
  });
  const [recentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [videosRes, profilesRes, nfcRes] = await Promise.all([
        axios.get(`${API_URL}/videos`),
        axios.get(`${API_URL}/profiles`),
        axios.get(`${API_URL}/nfc/chips`)
      ]);

      setStats({
        totalVideos: videosRes.data.length,
        totalProfiles: profilesRes.data.length,
        totalNFCChips: nfcRes.data.length,
        watchTimeToday: 0 // This would come from aggregated session data
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  };

  const PlayIcon = FiPlay as React.ElementType;
const VideoIcon = FiVideo as React.ElementType;
const UsersIcon = FiUsers as React.ElementType;
const CreditCardIcon = FiCreditCard as React.ElementType;
const ClockIcon = FiClock as React.ElementType;
const PlusIcon = FiPlus as React.ElementType;

  return (
    <Layout>
      <div className="dashboard">
        <div className="page-header">
          <h1>Dashboard</h1>
          <Link to="/kids" className="btn btn-secondary">
            <PlayIcon /> Kids Mode
          </Link>
        </div>

        {isLoading ? (
          <div className="loading">Loading dashboard...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon videos">
                  <VideoIcon />
                </div>
                <div className="stat-content">
                  <h3>Videos</h3>
                  <p className="stat-value">{stats.totalVideos}</p>
                  <Link to="/videos" className="stat-link">Manage Videos</Link>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon profiles">
                  <UsersIcon />
                </div>
                <div className="stat-content">
                  <h3>Child Profiles</h3>
                  <p className="stat-value">{stats.totalProfiles}</p>
                  <Link to="/profiles" className="stat-link">Manage Profiles</Link>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon nfc">
                  <CreditCardIcon />
                </div>
                <div className="stat-content">
                  <h3>NFC Chips</h3>
                  <p className="stat-value">{stats.totalNFCChips}</p>
                  <Link to="/nfc" className="stat-link">Manage Chips</Link>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon time">
                  <ClockIcon />
                </div>
                <div className="stat-content">
                  <h3>Watch Time Today</h3>
                  <p className="stat-value">{stats.watchTimeToday} min</p>
                  <span className="stat-link">All profiles</span>
                </div>
              </div>
            </div>

            <div className="dashboard-sections">
              <section className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                  <Link to="/videos" className="action-btn">
                    <PlusIcon />
                    <span>Add Video</span>
                  </Link>
                  <Link to="/profiles" className="action-btn">
                    <PlusIcon />
                    <span>Add Profile</span>
                  </Link>
                  <Link to="/nfc" className="action-btn">
                    <PlusIcon />
                    <span>Register NFC</span>
                  </Link>
                </div>
              </section>

              <section className="recent-activity">
                <h2>Recent Activity</h2>
                {recentActivity.length > 0 ? (
                  <div className="activity-list">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="activity-item">
                        {activity.description}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-activity">No recent activity</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;