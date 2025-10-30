/**
 * Unit Tests for LimitReachedMessage Component
 *
 * Tests the child-friendly daily watch time limit reached message display.
 *
 * Requirements:
 * - FR-020: Display friendly message when daily limit reached
 * - FR-025: Large fonts and colorful emojis for children
 * - FR-026: Simple language appropriate for ages 4-8
 * - No buttons (button-free design per FR-001)
 *
 * Test Coverage:
 * - Component renders with required elements
 * - Displays watch time statistics correctly
 * - Child-friendly messaging with emojis
 * - Button-free design verification
 * - Accessibility features
 * - Auto-return-to-scan functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LimitReachedMessage from '../LimitReachedMessage';

describe('LimitReachedMessage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering and Visual Elements', () => {
    it('renders the limit reached message with main heading', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for main heading
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toMatch(/time's up|all done|enough/i);
    });

    it('displays child-friendly message with moon emoji', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for friendly message
      expect(screen.getByText(/see you tomorrow/i)).toBeInTheDocument();

      // Check for moon emoji
      const component = screen.getByTestId('limit-reached-message');
      expect(component.textContent).toContain('🌙');
    });

    it('displays watch time statistics correctly', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={45}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for watch time display
      expect(screen.getByText(/45/)).toBeInTheDocument();
      expect(screen.getByText(/60/)).toBeInTheDocument();

      // Check for descriptive text
      expect(screen.getByText(/minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });

    it('displays watch time statistics when limit exactly reached', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check that both values are displayed
      const allText = screen.getByTestId('limit-reached-message').textContent;
      expect(allText).toContain('60');
    });

    it('displays watch time statistics when limit exceeded (edge case)', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={65}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check that exceeded time is displayed
      expect(screen.getByText(/65/)).toBeInTheDocument();
      expect(screen.getByText(/60/)).toBeInTheDocument();
    });

    it('renders with large fonts suitable for children', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const heading = screen.getByRole('heading', { level: 1 });

      // Check that heading has appropriate class for large fonts
      expect(heading).toHaveClass(/limit-reached-message__heading|large-text/i);
    });

    it('includes multiple colorful emojis for visual appeal', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      const text = component.textContent || '';

      // Count emojis (should have at least 2-3 different emojis)
      const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      expect(emojiCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Button-Free Design', () => {
    it('does not render any buttons', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check that no buttons exist
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('does not render clickable elements that could be interactive', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');

      // Check for absence of clickable elements
      expect(component.querySelector('button')).toBeNull();
      expect(component.querySelector('a')).toBeNull();
      expect(component.querySelector('[role="button"]')).toBeNull();
    });
  });

  describe('Auto-Return Functionality', () => {
    it('calls onReturnToScan callback after 10 seconds', async () => {
      const mockOnReturn = jest.fn();

      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={mockOnReturn}
        />
      );

      // Verify callback not called immediately
      expect(mockOnReturn).not.toHaveBeenCalled();

      // Fast-forward 10 seconds
      jest.advanceTimersByTime(10000);

      // Verify callback was called
      await waitFor(() => {
        expect(mockOnReturn).toHaveBeenCalledTimes(1);
      });
    });

    it('displays countdown timer showing time until auto-return', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for countdown display
      expect(screen.getByText(/10/)).toBeInTheDocument();
      expect(screen.getByText(/seconds/i)).toBeInTheDocument();
    });

    it('updates countdown every second', async () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Initial countdown shows 10
      expect(screen.getByText(/10/)).toBeInTheDocument();

      // Fast-forward 1 second
      jest.advanceTimersByTime(1000);

      // Countdown should show 9
      await waitFor(() => {
        expect(screen.getByText(/9/)).toBeInTheDocument();
      });

      // Fast-forward 1 more second
      jest.advanceTimersByTime(1000);

      // Countdown should show 8
      await waitFor(() => {
        expect(screen.getByText(/8/)).toBeInTheDocument();
      });
    });

    it('cleans up timer on unmount', () => {
      const mockOnReturn = jest.fn();

      const { unmount } = render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={mockOnReturn}
        />
      );

      // Unmount before timer completes
      unmount();

      // Fast-forward past timer
      jest.advanceTimersByTime(10000);

      // Verify callback was NOT called after unmount
      expect(mockOnReturn).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate ARIA label for screen readers', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      expect(component).toHaveAttribute('aria-label');

      const ariaLabel = component.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/limit reached|all done/i);
    });

    it('has role="status" for screen reader announcements', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      expect(component).toHaveAttribute('role', 'status');
    });

    it('has aria-live="polite" for non-intrusive announcements', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      expect(component).toHaveAttribute('aria-live', 'polite');
    });

    it('includes descriptive text for watch time statistics', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={45}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for descriptive labels
      expect(screen.getByText(/watched today|you watched/i)).toBeInTheDocument();
      expect(screen.getByText(/daily limit|allowed/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero minutes watched', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={0}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('handles very low daily limit (e.g., 10 minutes)', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={10}
          dailyLimitMinutes={10}
          onReturnToScan={jest.fn()}
        />
      );

      expect(screen.getByText(/10/)).toBeInTheDocument();
    });

    it('handles high daily limit (e.g., 240 minutes / 4 hours)', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={240}
          dailyLimitMinutes={240}
          onReturnToScan={jest.fn()}
        />
      );

      expect(screen.getByText(/240/)).toBeInTheDocument();
    });

    it('handles slightly exceeded limit (off by 1-2 minutes due to heartbeat)', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={62}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Should display actual time watched
      expect(screen.getByText(/62/)).toBeInTheDocument();
    });
  });

  describe('Child-Friendly Language', () => {
    it('uses simple, positive language appropriate for ages 4-8', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      const text = component.textContent?.toLowerCase() || '';

      // Check for positive, encouraging language (not negative)
      const hasPositiveLanguage =
        text.includes('great job') ||
        text.includes('good work') ||
        text.includes('well done') ||
        text.includes('see you tomorrow') ||
        text.includes('time for a break');

      expect(hasPositiveLanguage).toBeTruthy();

      // Ensure no harsh language
      expect(text).not.toContain('exceeded');
      expect(text).not.toContain('violation');
      expect(text).not.toContain('restricted');
    });

    it('includes encouraging message for tomorrow', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for encouraging future message
      const tomorrow = screen.getByText(/see you tomorrow|come back tomorrow/i);
      expect(tomorrow).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders with correct data-testid', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      expect(screen.getByTestId('limit-reached-message')).toBeInTheDocument();
    });

    it('renders all required child elements', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      // Check for main container
      const container = screen.getByTestId('limit-reached-message');
      expect(container).toBeInTheDocument();

      // Check for heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Check for watch time stats section
      const statsSection = screen.getByTestId('watch-time-stats');
      expect(statsSection).toBeInTheDocument();

      // Check for countdown section
      const countdownSection = screen.getByTestId('countdown-timer');
      expect(countdownSection).toBeInTheDocument();
    });

    it('has appropriate CSS classes for styling', () => {
      render(
        <LimitReachedMessage
          totalMinutesWatched={60}
          dailyLimitMinutes={60}
          onReturnToScan={jest.fn()}
        />
      );

      const component = screen.getByTestId('limit-reached-message');
      expect(component).toHaveClass('limit-reached-message');
    });
  });
});
