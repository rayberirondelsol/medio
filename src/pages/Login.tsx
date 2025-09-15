import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiPlay } from 'react-icons/fi';
import './Auth.css';

const PlayIcon = FiPlay as React.ElementType;
const MailIcon = FiMail as React.ElementType;
const LockIcon = FiLock as React.ElementType;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login');
      } else {
        setError('Failed to login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <PlayIcon className="logo-icon" />
            <h1>Medio</h1>
          </div>
          <p>Welcome back!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" aria-label="Login form">
          {error && <div className="error-message" role="alert" aria-live="polite">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">
              <MailIcon />
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="parent@example.com"
              aria-label="Email address"
              aria-required="true"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <LockIcon />
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              aria-label="Password"
              aria-required="true"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Logging in' : 'Submit login form'}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
          <Link to="/kids" className="kids-mode-link">
            <PlayIcon /> Enter Kids Mode
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;