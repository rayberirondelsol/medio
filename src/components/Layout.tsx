import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FiHome, 
  FiVideo, 
  FiUsers, 
  FiCreditCard, 
  FiSettings, 
  FiLogOut,
  FiSun,
  FiMoon,
  FiPlay
} from 'react-icons/fi';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/videos', label: 'Videos', icon: FiVideo },
    { path: '/profiles', label: 'Profiles', icon: FiUsers },
    { path: '/nfc', label: 'NFC Chips', icon: FiCreditCard },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  const PlayIcon = FiPlay as React.ElementType;

  const MoonIcon = FiMoon as React.ElementType;
  const SunIcon = FiSun as React.ElementType;

  const LogOutIcon = FiLogOut as React.ElementType;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <PlayIcon className="logo-icon" />
            <span>Medio</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon as React.ElementType;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>
          
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;