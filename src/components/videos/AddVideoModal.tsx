import React, { useState, useEffect, useCallback, useRef } from 'react';
import { detectPlatform } from '../../utils/platformDetector';
import { extractYouTubeVideoId, extractVimeoVideoId, extractDailymotionVideoId } from '../../utils/urlParser';
import { fetchVideoMetadata, createVideo } from '../../services/videoService';
import { getPlatforms } from '../../services/platformService';
import LoadingSpinner from '../LoadingSpinner';
import { AgeRating, CreateVideoRequest, Platform } from '../../types/video';
import { formatErrorMessage, ErrorType } from '../../utils/errorFormatter';
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

interface FieldDirtyState {
  title: boolean;
  description: boolean;
  thumbnailUrl: boolean;
  duration: boolean;
  channelName: boolean;
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
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorActionable, setErrorActionable] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isManualEntryMode, setIsManualEntryMode] = useState(false); // T078: Manual entry mode indicator

  // Track which fields have been manually edited by the user
  const [dirtyFields, setDirtyFields] = useState<FieldDirtyState>({
    title: false,
    description: false,
    thumbnailUrl: false,
    duration: false,
    channelName: false,
  });

  // AbortController for request cancellation (T029)
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch platforms on mount
  useEffect(() => {
    if (isOpen) {
      loadPlatforms();
    }
  }, [isOpen]);

  // Handle URL changes and trigger platform detection
  useEffect(() => {
    if (formData.videoUrl) {
      handleUrlChange(formData.videoUrl);
    } else {
      setDetectedPlatform(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.videoUrl]);

  // Cleanup: Cancel any pending requests on unmount (T029)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
        setPlatforms([]); // Ensure platforms is always an array
      }
    } catch (err: any) {
      console.error('Error loading platforms:', err);
      setError(err.message || 'Failed to load platforms');
      setPlatforms([]); // Ensure platforms is always an array even on error
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  /**
   * T025: Handle URL paste and platform detection
   */
  const handleUrlChange = useCallback((url: string) => {
    // Clear previous errors when URL changes (T072 - User Story 3)
    setError(null);
    setErrorTitle(null);
    setErrorActionable(null);
    setValidationError(null);
    setIsManualEntryMode(false); // T078: Clear manual entry mode when URL changes

    // Detect platform from URL
    const platform = detectPlatform(url);
    setDetectedPlatform(platform);

    if (platform) {
      // Auto-select the detected platform in the dropdown
      const matchingPlatform = platforms.find(
        p => p.name.toLowerCase() === platform.toLowerCase()
      );
      if (matchingPlatform) {
        setSelectedPlatformId(matchingPlatform.id);
      }

      // Trigger metadata fetch
      fetchMetadata(url, platform);
    } else if (url.trim()) {
      // T076: Unsupported platform - enter manual entry mode
      setIsManualEntryMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platforms]);

  /**
   * T026, T028, T029, T030: Fetch metadata with loading state, AbortController, and timeout
   */
  const fetchMetadata = async (url: string, platform: string) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Extract video ID based on platform
    let videoId: string | null = null;
    if (platform === 'youtube') {
      videoId = extractYouTubeVideoId(url);
    } else if (platform === 'vimeo') {
      videoId = extractVimeoVideoId(url);
    } else if (platform === 'dailymotion') {
      videoId = extractDailymotionVideoId(url);
    }

    // T065: Invalid URL error handling
    if (!videoId) {
      const formattedError = formatErrorMessage(
        new Error('Unable to extract video ID from URL'),
        ErrorType.MALFORMED_URL
      );
      setErrorTitle(formattedError.title);
      setError(formattedError.message);
      setErrorActionable(formattedError.actionable);
      return;
    }

    // Create new AbortController for this request (T029)
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingMetadata(true);
    setError(null);

    try {
      // T026, T030: Fetch metadata with 10-second timeout
      const metadata = await fetchVideoMetadata(platform, videoId, abortController.signal);

      // T027: Auto-fill form fields with metadata (only if not manually edited)
      setFormData(prev => ({
        ...prev,
        title: dirtyFields.title ? prev.title : metadata.title,
        description: dirtyFields.description ? prev.description : metadata.description,
        thumbnailUrl: dirtyFields.thumbnailUrl ? prev.thumbnailUrl : metadata.thumbnailUrl,
        duration: dirtyFields.duration ? prev.duration : metadata.duration,
        channelName: dirtyFields.channelName ? prev.channelName : metadata.channelName,
      }));
    } catch (err: any) {
      // Only show error if request wasn't cancelled
      if (err.message !== 'Request cancelled') {
        // T066, T067, T068: Private video, API failure, and timeout error handling
        const formattedError = formatErrorMessage(err);
        setErrorTitle(formattedError.title);
        setError(formattedError.message);
        setErrorActionable(formattedError.actionable);

        // T077, T078: Enter manual entry mode on API failure
        setIsManualEntryMode(true);
      }
    } finally {
      setIsLoadingMetadata(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Handle input changes and track dirty state
   */
  const handleInputChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Mark field as dirty (manually edited)
    if (field in dirtyFields) {
      setDirtyFields(prev => ({ ...prev, [field]: true }));
    }

    // Clear validation error when user edits
    if (validationError) {
      setValidationError(null);
    }
  };

  /**
   * T031: Validate form before submission
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

    // T031: Age rating validation
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

    // T031: Validate before save
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Find the selected platform name from the platforms array
      const selectedPlatform = platforms.find(p => p.id === selectedPlatformId);
      const platformName = selectedPlatform?.name.toLowerCase();

      // Extract video ID for backend based on selected platform
      let videoId: string | null = null;
      if (platformName === 'youtube') {
        videoId = extractYouTubeVideoId(formData.videoUrl);
      } else if (platformName === 'vimeo') {
        videoId = extractVimeoVideoId(formData.videoUrl);
      } else if (platformName === 'dailymotion') {
        videoId = extractDailymotionVideoId(formData.videoUrl);
      }

      if (!videoId) {
        throw new Error('Unable to extract video ID from URL');
      }

      const videoData: CreateVideoRequest = {
        platform_id: selectedPlatformId,
        video_id: videoId,
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
      // T069: Duplicate URL detection and enhanced error handling
      const formattedError = formatErrorMessage(err);
      setErrorTitle(formattedError.title);
      setError(formattedError.message);
      setErrorActionable(formattedError.actionable);
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
    setDirtyFields({
      title: false,
      description: false,
      thumbnailUrl: false,
      duration: false,
      channelName: false,
    });
    setDetectedPlatform(null);
    setError(null);
    setErrorTitle(null);
    setErrorActionable(null);
    setValidationError(null);
    setIsManualEntryMode(false); // T078: Reset manual entry mode
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
          <h2 id="add-video-title">Add Video via Link</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-video-form">
          {/* T078: Manual Entry Mode Indicator */}
          {isManualEntryMode && (
            <div className="manual-entry-indicator" role="status">
              <strong>Manual Entry Mode</strong>
              <p>Automatic metadata could not be fetched. Please enter video information manually.</p>
            </div>
          )}

          {/* Enhanced Error display (T065-T069) */}
          {(error || validationError) && (
            <div className="error-message" role="alert">
              {errorTitle && <strong>{errorTitle}</strong>}
              <p>{validationError || error}</p>
              {errorActionable && <p className="error-actionable">{errorActionable}</p>}
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
              placeholder="Paste video URL (YouTube, Vimeo, or Dailymotion)"
              value={formData.videoUrl}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              disabled={isLoadingMetadata || isSaving}
              aria-required="true"
              aria-invalid={!!validationError && !formData.videoUrl}
            />
            {detectedPlatform && (
              <span className="platform-detected" aria-live="polite">
                Detected: {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)}
              </span>
            )}
          </div>

          {/* T028: Loading spinner during metadata fetch */}
          {isLoadingMetadata && (
            <div className="metadata-loading">
              <LoadingSpinner size="small" text="Fetching video details..." />
            </div>
          )}

          {/* Platform Selection */}
          <div className="form-group">
            <label htmlFor="platform">
              Platform <span className="required">*</span>
            </label>
            <select
              id="platform"
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              disabled={isLoadingPlatforms || isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
            />
          </div>

          {/* T031: Age Rating (Required) */}
          <div className="form-group">
            <label htmlFor="ageRating">
              Age Rating <span className="required">*</span>
            </label>
            <select
              id="ageRating"
              value={formData.ageRating}
              onChange={(e) => handleInputChange('ageRating', e.target.value)}
              disabled={isLoadingMetadata || isSaving}
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
              disabled={isLoadingMetadata || isSaving}
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
