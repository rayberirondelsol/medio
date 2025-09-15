import React from 'react';
import Layout from '../components/Layout';
import { FiUser, FiLock, FiBell, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="settings-page">
        <div className="page-header">
          <h1>Settings</h1>
        </div>

        <div className="settings-sections">
          <section className="settings-section">
            <h2><FiUser /> Account Information</h2>
            <div className="settings-content">
              <div className="setting-item">
                <label>Name</label>
                <p>{user?.name}</p>
              </div>
              <div className="setting-item">
                <label>Email</label>
                <p>{user?.email}</p>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2><FiLock /> Security</h2>
            <div className="settings-content">
              <button className="btn btn-secondary">Change Password</button>
              <button className="btn btn-secondary">Enable Two-Factor Authentication</button>
            </div>
          </section>

          <section className="settings-section">
            <h2><FiBell /> Notifications</h2>
            <div className="settings-content">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Email notifications for daily limits reached</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Weekly watch time reports</span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h2><FiShield /> Parental Controls</h2>
            <div className="settings-content">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Require PIN for parent access from Kids Mode</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Enable safe search for YouTube videos</span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;