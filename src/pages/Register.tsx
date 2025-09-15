import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiUser, FiPlay } from 'react-icons/fi';
import './Auth.css';

const PlayIcon = FiPlay as React.ElementType;
const UserIcon = FiUser as React.ElementType;
const MailIcon = FiMail as React.ElementType;
const LockIcon = FiLock as React.ElementType;

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength (must match backend requirements)
    const passwordErrors = [];
    if (password.length < 8) {
      passwordErrors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push('one lowercase letter');
    }
    if (!/\d/.test(password)) {
      passwordErrors.push('one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      passwordErrors.push('one special character');
    }
    
    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(', ')}`);
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
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
          <p>Create your parent account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="name">
              <UserIcon />
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
            />
          </div>

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
              placeholder="8+ chars, uppercase, lowercase, number, special"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <LockIcon />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;