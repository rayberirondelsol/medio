/**
 * T070: Video Form Error Boundary
 *
 * Wraps the AddVideoModal with an error boundary to catch rendering errors
 * and provide user-friendly fallback UI.
 *
 * Part of Phase 5: Graceful Error Handling (US3)
 */

import React from 'react';
import ErrorBoundary from '../common/ErrorBoundary';

interface VideoFormErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error Boundary specific to video form operations
 *
 * Provides custom error messaging and fallback UI for video-related errors
 */
const VideoFormErrorBoundary: React.FC<VideoFormErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

export default VideoFormErrorBoundary;