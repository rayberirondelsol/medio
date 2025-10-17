/**
 * T073: Unit Tests for AddVideoModal - Manual Entry Mode
 *
 * Tests manual entry mode state management and UI behavior when metadata fetch fails.
 * These tests verify that users can manually enter video information as a fallback.
 *
 * TDD RED Phase: These tests will FAIL until implementation is complete.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddVideoModal from '../../../src/components/videos/AddVideoModal';
import * as videoService from '../../../src/services/videoService';

// Mock the video service
jest.mock('../../../src/services/videoService');

describe('AddVideoModal - Manual Entry Mode (T073)', () => {
  const mockOnClose = jest.fn();
  const mockOnVideoAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getPlatforms to return test platforms
    (videoService.getPlatforms as jest.Mock).mockResolvedValue([
      { id: 'youtube-id', name: 'YouTube', requires_auth: false },
      { id: 'vimeo-id', name: 'Vimeo', requires_auth: false },
      { id: 'dailymotion-id', name: 'Dailymotion', requires_auth: false }
    ]);
  });

  describe('Manual Entry Mode State', () => {
    it('should enter manual mode when metadata fetch fails', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=testVideo123';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch video metadata')
      );

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      // Wait for metadata fetch to fail
      await waitFor(() => {
        expect(videoService.fetchVideoMetadata).toHaveBeenCalled();
      });

      // Assert - Manual entry mode indicator should be visible
      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });
    });

    it('should keep form fields editable after metadata fetch failure', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=privateVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Video is private or unavailable')
      );

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      // Wait for metadata fetch to fail
      await waitFor(() => {
        expect(videoService.fetchVideoMetadata).toHaveBeenCalled();
      });

      // Assert - All form fields should remain enabled (not disabled)
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).not.toBeDisabled();
        expect(screen.getByLabelText(/description/i)).not.toBeDisabled();
        expect(screen.getByLabelText(/thumbnail url/i)).not.toBeDisabled();
        expect(screen.getByLabelText(/duration/i)).not.toBeDisabled();
        expect(screen.getByLabelText(/age rating/i)).not.toBeDisabled();
      });
    });

    it('should not enter manual mode when metadata fetch succeeds', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=successVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockResolvedValue({
        title: 'Test Video Title',
        description: 'Test Description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 180,
        channelName: 'Test Channel'
      });

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      // Wait for metadata fetch to succeed
      await waitFor(() => {
        expect(videoService.fetchVideoMetadata).toHaveBeenCalled();
      });

      // Assert - Manual entry mode indicator should NOT be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('Test Video Title');
      });

      expect(screen.queryByText(/manual entry/i)).not.toBeInTheDocument();
    });

    it('should allow manual entry for unsupported platform', async () => {
      // Arrange
      const unsupportedUrl = 'https://www.tiktok.com/@user/video/123456789';

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: unsupportedUrl } });

      // Wait for detection
      await waitFor(() => {
        // Should show unsupported platform message or manual entry mode
        expect(
          screen.queryByText(/manual entry/i) || screen.queryByText(/unsupported/i)
        ).toBeInTheDocument();
      });

      // Assert - Fields should be editable for manual entry
      expect(screen.getByLabelText(/title/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/description/i)).not.toBeDisabled();
    });

    it('should clear manual mode when URL is changed', async () => {
      // Arrange
      const failingUrl = 'https://www.youtube.com/watch?v=failVideo';
      const successUrl = 'https://www.youtube.com/watch?v=successVideo';

      (videoService.fetchVideoMetadata as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          title: 'Success Video',
          description: 'Success Description',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 120,
          channelName: 'Success Channel'
        });

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);

      // Enter failing URL
      fireEvent.change(urlInput, { target: { value: failingUrl } });

      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });

      // Change to success URL
      fireEvent.change(urlInput, { target: { value: successUrl } });

      // Assert - Manual mode indicator should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/manual entry/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Manual Entry Validation', () => {
    it('should require title for manual entry submission', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=manualVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
      );

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });

      // Try to submit without title
      const ageRatingSelect = screen.getByLabelText(/age rating/i);
      fireEvent.change(ageRatingSelect, { target: { value: 'G' } });

      const submitButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(submitButton);

      // Assert - Validation error should be shown
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('should require age rating for manual entry submission', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=manualVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
      );

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });

      // Fill title but not age rating
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Manual Test Video' } });

      const submitButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(submitButton);

      // Assert - Validation error should be shown
      await waitFor(() => {
        expect(screen.getByText(/age rating.*required/i)).toBeInTheDocument();
      });
    });

    it('should allow submission with minimal fields (manual mode)', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=manualVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
      );
      (videoService.createVideo as jest.Mock).mockResolvedValue({
        id: 'new-video-id',
        title: 'Manual Test Video',
        video_url: testUrl
      });

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });

      // Fill only required fields
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Manual Test Video' } });

      const ageRatingSelect = screen.getByLabelText(/age rating/i);
      fireEvent.change(ageRatingSelect, { target: { value: 'G' } });

      const submitButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(submitButton);

      // Assert - Should submit successfully with minimal fields
      await waitFor(() => {
        expect(videoService.createVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Manual Test Video',
            video_url: testUrl,
            age_rating: 'G'
          })
        );
      });

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnVideoAdded).toHaveBeenCalled();
    });

    it('should allow submission with all optional fields filled manually', async () => {
      // Arrange
      const testUrl = 'https://www.youtube.com/watch?v=fullManualVideo';
      (videoService.fetchVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
      );
      (videoService.createVideo as jest.Mock).mockResolvedValue({
        id: 'new-video-id',
        title: 'Full Manual Video'
      });

      // Act
      render(<AddVideoModal isOpen={true} onClose={mockOnClose} onVideoAdded={mockOnVideoAdded} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/video url/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      await waitFor(() => {
        expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
      });

      // Fill all fields manually
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Full Manual Video' }
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Manual description' }
      });
      fireEvent.change(screen.getByLabelText(/thumbnail url/i), {
        target: { value: 'https://example.com/manual-thumb.jpg' }
      });
      fireEvent.change(screen.getByLabelText(/duration/i), {
        target: { value: '240' }
      });
      fireEvent.change(screen.getByLabelText(/channel name/i), {
        target: { value: 'Manual Channel' }
      });
      fireEvent.change(screen.getByLabelText(/age rating/i), {
        target: { value: 'PG' }
      });

      const submitButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(submitButton);

      // Assert - Should submit with all fields
      await waitFor(() => {
        expect(videoService.createVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Full Manual Video',
            description: 'Manual description',
            thumbnail_url: 'https://example.com/manual-thumb.jpg',
            duration: 240,
            channel_name: 'Manual Channel',
            age_rating: 'PG'
          })
        );
      });
    });
  });
});
