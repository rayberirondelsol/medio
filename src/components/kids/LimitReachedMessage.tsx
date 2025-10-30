/**
 * LimitReachedMessage Component
 *
 * Child-friendly message displayed when daily watch time limit is reached.
 *
 * Requirements:
 * - FR-020: Display friendly message when daily limit reached
 * - FR-025: Large fonts and colorful emojis for children
 * - FR-026: Simple language appropriate for ages 4-8
 * - FR-001: Button-free design (no interactive elements)
 *
 * Features:
 * - Large, colorful display with multiple emojis
 * - Watch time statistics (minutes watched vs daily limit)
 * - Encouraging message for tomorrow
 * - Auto-return to scan screen after 10 seconds
 * - Countdown timer showing time until auto-return
 * - Accessible for screen readers
 */

import React, { useState, useEffect } from 'react';
import './LimitReachedMessage.css';

interface LimitReachedMessageProps {
  totalMinutesWatched: number;
  dailyLimitMinutes: number;
  onReturnToScan: () => void;
}

const LimitReachedMessage: React.FC<LimitReachedMessageProps> = ({
  totalMinutesWatched,
  dailyLimitMinutes,
  onReturnToScan,
}) => {
  const [countdown, setCountdown] = useState<number>(10);

  useEffect(() => {
    // Countdown timer (update every second)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-return timer (return to scan after 10 seconds)
    const returnTimer = setTimeout(() => {
      onReturnToScan();
    }, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(countdownInterval);
      clearTimeout(returnTimer);
    };
  }, [onReturnToScan]);

  return (
    <div
      className="limit-reached-message"
      data-testid="limit-reached-message"
      role="status"
      aria-live="polite"
      aria-label="Daily watch time limit reached. You will return to the scan screen soon."
    >
      {/* Main Heading with Emoji */}
      <h1 className="limit-reached-message__heading">
        Time's Up! 🌙
      </h1>

      {/* Friendly Message */}
      <p className="limit-reached-message__message">
        Great job watching today! See you tomorrow! 🌟
      </p>

      {/* Watch Time Statistics */}
      <div
        className="limit-reached-message__stats"
        data-testid="watch-time-stats"
      >
        <div className="limit-reached-message__stat-item">
          <span className="limit-reached-message__stat-emoji">📺</span>
          <span className="limit-reached-message__stat-label">You watched today:</span>
          <span className="limit-reached-message__stat-value">{totalMinutesWatched} minutes</span>
        </div>

        <div className="limit-reached-message__stat-item">
          <span className="limit-reached-message__stat-emoji">⏰</span>
          <span className="limit-reached-message__stat-label">Daily limit:</span>
          <span className="limit-reached-message__stat-value">{dailyLimitMinutes} minutes</span>
        </div>
      </div>

      {/* Encouraging Message */}
      <p className="limit-reached-message__encouragement">
        You've had lots of fun! Time for a break! 😊
      </p>

      {/* Countdown Timer */}
      <div
        className="limit-reached-message__countdown"
        data-testid="countdown-timer"
      >
        <p className="limit-reached-message__countdown-text">
          Returning to scan screen in <strong>{countdown}</strong> seconds...
        </p>
      </div>
    </div>
  );
};

export default LimitReachedMessage;
