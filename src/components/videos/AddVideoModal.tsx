import React, { useState, useEffect } from 'react';
import { createVideo } from '../../services/videoService';
import { getPlatforms } from '../../services/platformService';
import { AgeRating, CreateVideoRequest, Platform } from '../../types/video';
import './AddVideoModal.css';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoAdded?: () => void;
}

interface FormData {
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number | null;
  channelName: string;
  ageRating: AgeRating | '';
}

const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onVideoAdded }) => {
  // State management
  const [formData, setFormData] = useState<FormData>({
    videoUrl: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    duration: null,
    channelName: '',
    ageRating: '',
  });

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch platforms on mount
  useEffect(() => {
    if (isOpen) {
      loadPlatforms();
    }
  }, [isOpen]);

  /**
   * Load available platforms from API
   */
  const loadPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const platformList = await getPlatforms();

      // Ensure platformList is an array before setting state
      if (Array.isArray(platformList)) {
        setPlatforms(platformList);

        // Auto-select YouTube if it's the only platform or first platform
        if (platformList.length > 0) {
          const youtubePlatform = platformList.find(p => p.name.toLowerCase() === 'youtube');
          if (youtubePlatform) {
            setSelectedPlatformId(youtubePlatform.id);
          } else {
            setSelectedPlatformId(platformList[0].id);
          }
        }
      } else {
        console.error('getPlatforms returned non-array:', platformList);
        setError('Invalid platform data received. Please try again.');
        setPlatforms([]);
      }
    } catch (err: any) {
      console.error('Error loading platforms:', err);
      setError(err.message || 'Failed to load platforms');
      setPlatforms([]);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error when user edits
    if (validationError) {
      setValidationError(null);
    }
  };

  /**
   * Validate form before submission
   */
  const validateForm = (): boolean => {
    // Clear previous validation errors
    setValidationError(null);

    // Check required fields
    if (!formData.videoUrl.trim()) {
      setValidationError('Video URL is required');
      return false;
    }

    if (!formData.title.trim()) {
      setValidationError('Video title is required');
      return false;
    }

    // Age rating validation
    if (!formData.ageRating) {
      setValidationError('Please select an age rating');
      return false;
    }

    // Validate age rating is one of the allowed values
    const validRatings: AgeRating[] = ['G', 'PG', 'PG-13', 'R'];
    if (!validRatings.includes(formData.ageRating as AgeRating)) {
      setValidationError('Invalid age rating selected');
      return false;
    }

    if (!selectedPlatformId) {
      setValidationError('Please select a platform');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before save
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const videoData: CreateVideoRequest = {
        platform_id: selectedPlatformId,
        video_id: formData.videoUrl, // Use full URL as video_id for manual entry
        video_url: formData.videoUrl,
        title: formData.title,
        description: formData.description || undefined,
        thumbnail_url: formData.thumbnailUrl || undefined,
        duration: formData.duration || undefined,
        age_rating: formData.ageRating as AgeRating,
        channel_name: formData.channelName || undefined,
      };

      await createVideo(videoData);

      // Success! Reset form and close modal
      resetForm();
      onClose();

      // Notify parent component
      if (onVideoAdded) {
        onVideoAdded();
      }
    } catch (err: any) {
      // Display error message
      setError(err.message || 'Failed to save video. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      videoUrl: '',
      title: '',
      description: '',
      thumbnailUrl: '',
      duration: null,
      channelName: '',
      ageRating: '',
    });
    setError(null);
    setValidationError(null);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose} role="presentation">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="add-video-title" aria-modal="true">
        <div className="modal-header">
          <h2 id="add-video-title">Add Video</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-video-form">
          {/* Error display */}
          {(error || validationError) && (
            <div className="error-message" role="alert">
              <p>{validationError || error}</p>
            </div>
          )}

          {/* Video URL Input */}
          <div className="form-group">
            <label htmlFor="videoUrl">
              Video URL <span className="required">*</span>
            </label>
            <input
              id="videoUrl"
              type="text"
              placeholder="Enter video URL"
              value={formData.videoUrl}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              disabled={isSaving}
              aria-required="true"
              aria-invalid={!!validationError && !formData.videoUrl}
            />
          </div>

          {/* Platform Selection */}
          <div className="form-group">
            <label htmlFor="platform">
              Platform <span className="required">*</span>
            </label>
            <select
              id="platform"
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              disabled={isLoadingPlatforms || isSaving}
              aria-required="true"
            >
              <option value="">Select platform</option>
              {platforms.map(platform => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">
              Title <span className="required">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="Video title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              disabled={isSaving}
              aria-required="true"
              aria-invalid={!!validationError && !formData.title}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Video description (optional)"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSaving}
              rows={4}
            />
          </div>

          {/* Thumbnail URL */}
          <div className="form-group">
            <label htmlFor="thumbnailUrl">Thumbnail URL</label>
            <input
              id="thumbnailUrl"
              type="text"
              placeholder="https://..."
              value={formData.thumbnailUrl}
              onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Duration */}
          <div className="form-group">
            <label htmlFor="duration">Duration (seconds)</label>
            <input
              id="duration"
              type="number"
              placeholder="e.g., 180"
              value={formData.duration || ''}
              onChange={(e) => handleInputChange('duration', e.target.value ? parseInt(e.target.value, 10) : null)}
              disabled={isSaving}
              min="0"
            />
          </div>

          {/* Channel Name */}
          <div className="form-group">
            <label htmlFor="channelName">Channel Name</label>
            <input
              id="channelName"
              type="text"
              placeholder="Channel or creator name"
              value={formData.channelName}
              onChange={(e) => handleInputChange('channelName', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Age Rating (Required) */}
          <div className="form-group">
            <label htmlFor="ageRating">
              Age Rating <span className="required">*</span>
            </label>
            <select
              id="ageRating"
              value={formData.ageRating}
              onChange={(e) => handleInputChange('ageRating', e.target.value)}
              disabled={isSaving}
              aria-required="true"
              aria-invalid={!!validationError && !formData.ageRating}
            >
              <option value="">Select age rating</option>
              <option value="G">G - General Audiences</option>
              <option value="PG">PG - Parental Guidance</option>
              <option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
              <option value="R">R - Restricted</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Add Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVideoModal;
