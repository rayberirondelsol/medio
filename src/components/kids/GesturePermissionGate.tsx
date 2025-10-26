/**
 * GesturePermissionGate Component
 *
 * Prompts iOS users to grant device orientation and motion permissions.
 * Shows friendly UI with bouncing emoji when permission is required.
 */

import React from 'react';
import './GesturePermissionGate.css';

interface GesturePermissionGateProps {
  /** Whether permission is required (iOS 13+) */
  isRequired: boolean;

  /** Whether permission has been granted */
  isGranted: boolean;

  /** Callback to request permission */
  onRequestPermission: () => Promise<void>;

  /** Whether permission request is in progress */
  isRequesting?: boolean;
}

export const GesturePermissionGate: React.FC<GesturePermissionGateProps> = ({
  isRequired,
  isGranted,
  onRequestPermission,
  isRequesting = false,
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleEnableClick = async () => {
    setLoading(true);
    setError(null);

    try {
      await onRequestPermission();

      // Check if permission was actually granted
      // (onRequestPermission should update parent state)
    } catch (err) {
      console.error('Permission request failed:', err);
      setError('Unable to enable gestures. Please enable in Settings > Safari > Motion & Orientation Access.');
    } finally {
      setLoading(false);
    }
  };

  // Don't show gate if permission not required
  if (!isRequired) {
    return null;
  }

  // Don't show gate if permission already granted
  if (isGranted) {
    return null;
  }

  // Show denial message if user previously denied
  if (error) {
    return (
      <div className="gesture-permission-gate gesture-permission-gate--error">
        <div className="gesture-permission-gate__emoji">😔</div>
        <h3 className="gesture-permission-gate__title">Gestures Not Available</h3>
        <p className="gesture-permission-gate__message">{error}</p>
        <button
          className="gesture-permission-gate__button gesture-permission-gate__button--secondary"
          onClick={() => setError(null)}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show permission request UI
  return (
    <div className="gesture-permission-gate">
      <div className="gesture-permission-gate__emoji gesture-permission-gate__emoji--bounce">
        🎮
      </div>
      <h3 className="gesture-permission-gate__title">Enable Gesture Controls!</h3>
      <p className="gesture-permission-gate__message">
        Tilt your device to rewind or fast-forward. Shake to skip videos. It makes watching more fun!
      </p>
      <button
        className="gesture-permission-gate__button"
        onClick={handleEnableClick}
        disabled={loading || isRequesting}
      >
        {loading || isRequesting ? 'Enabling...' : 'Enable Gestures'}
      </button>
      <p className="gesture-permission-gate__skip">
        <button
          className="gesture-permission-gate__skip-button"
          onClick={() => setError('Gestures disabled')}
        >
          Skip (watch without gestures)
        </button>
      </p>
    </div>
  );
};
