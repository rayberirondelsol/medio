import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Loading...',
  overlay = false 
}) => {
  const spinnerClass = `spinner spinner-${size}`;
  
  const spinner = (
    <div className={spinnerClass}>
      <div className="spinner-circle"></div>
      {text && <div className="spinner-text">{text}</div>}
    </div>
  );
  
  if (overlay) {
    return (
      <div className="spinner-overlay">
        {spinner}
      </div>
    );
  }
  
  return spinner;
};

export default LoadingSpinner;