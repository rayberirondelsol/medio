import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const KidsMode = lazy(() => import('./pages/KidsMode'));
const Videos = lazy(() => import('./pages/Videos'));
const Profiles = lazy(() => import('./pages/Profiles'));
const NFCManager = lazy(() => import('./pages/NFCManager'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '1.5rem',
    color: '#666'
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="App">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/kids" element={<KidsMode />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } />
                <Route path="/videos" element={
                  <PrivateRoute>
                    <Videos />
                  </PrivateRoute>
                } />
                <Route path="/profiles" element={
                  <PrivateRoute>
                    <Profiles />
                  </PrivateRoute>
                } />
                <Route path="/nfc" element={
                  <PrivateRoute>
                    <NFCManager />
                  </PrivateRoute>
                } />
                <Route path="/settings" element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                } />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
