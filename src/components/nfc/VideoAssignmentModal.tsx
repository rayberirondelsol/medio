/**
 * VideoAssignmentModal Component
 *
 * Feature: 007-nfc-video-assignment
 * Allows parents to assign videos to NFC chips with drag-and-drop reordering.
 *
 * Features:
 * - Assign up to 50 videos per chip
 * - Drag-and-drop reordering (react-beautiful-dnd)
 * - Virtual scrolling for performance (react-window)
 * - Real-time validation
 * - Optimistic UI updates
 */

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getChipVideos, updateChipVideos, removeChipVideo } from '../../services/nfcService';
import axiosInstance from '../../utils/axiosConfig';
import './VideoAssignmentModal.css';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  platform_name: string;
  sequence_order: number;
  mapping_id?: string;
}

interface LibraryVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  platform_name: string;
}

interface Chip {
  id: string;
  label: string;
  chip_uid: string;
}

interface VideoAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chipId: string;
  chipLabel: string;
  onVideosUpdated?: () => void;
}

const MAX_VIDEOS = 50;

const VideoAssignmentModal: React.FC<VideoAssignmentModalProps> = ({
  isOpen,
  onClose,
  chipId,
  chipLabel,
  onVideosUpdated
}) => {
  // State management
  const [, setChip] = useState<Chip | null>(null);
  const [assignedVideos, setAssignedVideos] = useState<Video[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [selectedLibraryVideos, setSelectedLibraryVideos] = useState<Set<string>>(new Set());
  const [showLibrary, setShowLibrary] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load chip videos on mount
  useEffect(() => {
    if (isOpen && chipId) {
      loadChipVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chipId]);

  /**
   * Load assigned videos for the chip
   */
  const loadChipVideos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getChipVideos(chipId);
      setChip(data.chip);
      setAssignedVideos(data.videos || []);
    } catch (err: any) {
      console.error('Error loading chip videos:', err);
      setError(err.message || 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load video library for selection
   */
  const loadLibraryVideos = async () => {
    setIsLoadingLibrary(true);
    try {
      const response = await axiosInstance.get('/videos');
      const videos = response.data.data || response.data || [];

      // Filter out videos already assigned to this chip
      const assignedIds = new Set(assignedVideos.map(v => v.id));
      const availableVideos = videos.filter((v: LibraryVideo) => !assignedIds.has(v.id));

      setLibraryVideos(availableVideos);
    } catch (err: any) {
      console.error('Error loading library videos:', err);
      setError(err.message || 'Failed to load video library');
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  /**
   * Toggle video selection in library
   */
  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedLibraryVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      // Check if we'd exceed the max limit
      if (assignedVideos.length + newSelection.size >= MAX_VIDEOS) {
        setValidationError(`Maximum ${MAX_VIDEOS} videos per chip`);
        return;
      }
      newSelection.add(videoId);
    }
    setSelectedLibraryVideos(newSelection);
    setValidationError(null);
  };

  /**
   * Add selected videos from library to assigned list
   */
  const handleAddVideos = () => {
    const videosToAdd = libraryVideos.filter(v => selectedLibraryVideos.has(v.id));

    // Calculate next sequence number
    const maxSequence = assignedVideos.length > 0
      ? Math.max(...assignedVideos.map(v => v.sequence_order))
      : 0;

    // Add videos with new sequence orders
    const newVideos: Video[] = videosToAdd.map((video, index) => ({
      ...video,
      sequence_order: maxSequence + index + 1
    }));

    setAssignedVideos([...assignedVideos, ...newVideos]);
    setSelectedLibraryVideos(new Set());
    setShowLibrary(false);

    // Remove added videos from library
    setLibraryVideos(libraryVideos.filter(v => !selectedLibraryVideos.has(v.id)));
  };

  /**
   * Handle drag end event
   */
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // No movement
    if (destination.index === source.index) {
      return;
    }

    // Reorder videos
    const reorderedVideos = Array.from(assignedVideos);
    const [movedVideo] = reorderedVideos.splice(source.index, 1);
    reorderedVideos.splice(destination.index, 0, movedVideo);

    // Update sequence orders
    const updatedVideos = reorderedVideos.map((video, index) => ({
      ...video,
      sequence_order: index + 1
    }));

    setAssignedVideos(updatedVideos);

    // Clear validation error on reorder
    if (validationError) {
      setValidationError(null);
    }
  }, [assignedVideos, validationError]);


  /**
   * Handle removing a video from the chip
   */
  const handleRemoveVideo = async (videoId: string) => {
    if (!window.confirm('Remove this video from the chip?')) {
      return;
    }

    try {
      await removeChipVideo(chipId, videoId);

      // Update local state (optimistic update)
      const updatedVideos = assignedVideos
        .filter(v => v.id !== videoId)
        .map((video, index) => ({
          ...video,
          sequence_order: index + 1
        }));

      setAssignedVideos(updatedVideos);

      if (onVideosUpdated) {
        onVideosUpdated();
      }
    } catch (err: any) {
      console.error('Error removing video:', err);
      setError(err.message || 'Failed to remove video');
    }
  };

  /**
   * Handle saving video assignments
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setValidationError(null);

    try {
      // Validate sequence is contiguous
      const sequences = assignedVideos.map(v => v.sequence_order).sort((a, b) => a - b);
      for (let i = 0; i < sequences.length; i++) {
        if (sequences[i] !== i + 1) {
          setValidationError('Video sequence must be contiguous (1, 2, 3, ...)');
          setIsSaving(false);
          return;
        }
      }

      // Prepare payload
      const payload = {
        videos: assignedVideos.map(v => ({
          video_id: v.id,
          sequence_order: v.sequence_order
        }))
      };

      await updateChipVideos(chipId, payload);

      if (onVideosUpdated) {
        onVideosUpdated();
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving video assignments:', err);
      setError(err.message || 'Failed to save video assignments');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Render video row (for virtual scrolling)
   */
  const VideoRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const video = assignedVideos[index];

    return (
      <Draggable draggableId={video.id} index={index} key={video.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...style,
              ...provided.draggableProps.style,
            }}
            className={`video-row ${snapshot.isDragging ? 'dragging' : ''}`}
          >
            <div className="video-sequence">{video.sequence_order}</div>
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="video-thumbnail"
            />
            <div className="video-info">
              <div className="video-title">{video.title}</div>
              <div className="video-meta">
                {video.platform_name} • {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveVideo(video.id)}
              className="btn-remove"
              aria-label="Remove video"
            >
              ×
            </button>
          </div>
        )}
      </Draggable>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content video-assignment-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title">Manage Videos - {chipLabel}</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {error && (
            <div className="error-message" role="alert">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          )}

          {validationError && (
            <div className="validation-error" role="alert">
              <p>{validationError}</p>
            </div>
          )}

          {isLoading ? (
            <div className="loading-state">
              <p>Loading videos...</p>
            </div>
          ) : (
            <>
              {/* Video count and limit */}
              <div className="video-count-info">
                <p>
                  {assignedVideos.length} of {MAX_VIDEOS} videos assigned
                </p>
                {assignedVideos.length === MAX_VIDEOS && (
                  <p className="limit-warning">Maximum videos reached</p>
                )}
              </div>

              {/* Add Videos Button */}
              {!showLibrary && assignedVideos.length < MAX_VIDEOS && (
                <button
                  type="button"
                  className="btn btn-secondary add-videos-btn"
                  onClick={() => {
                    setShowLibrary(true);
                    loadLibraryVideos();
                  }}
                  disabled={isLoading}
                >
                  + Add Videos from Library
                </button>
              )}

              {/* Video Library Selection */}
              {showLibrary && (
                <div className="video-library-section">
                  <div className="library-header">
                    <h3>Select Videos to Add</h3>
                    <button
                      type="button"
                      className="btn-close-library"
                      onClick={() => {
                        setShowLibrary(false);
                        setSelectedLibraryVideos(new Set());
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {isLoadingLibrary ? (
                    <div className="loading-state">
                      <p>Loading video library...</p>
                    </div>
                  ) : libraryVideos.length === 0 ? (
                    <div className="empty-state">
                      <p>No more videos available to add.</p>
                    </div>
                  ) : (
                    <>
                      <div className="library-videos-list">
                        {libraryVideos.map((video) => (
                          <div
                            key={video.id}
                            className={`library-video-item ${
                              selectedLibraryVideos.has(video.id) ? 'selected' : ''
                            }`}
                            onClick={() => toggleVideoSelection(video.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLibraryVideos.has(video.id)}
                              onChange={() => toggleVideoSelection(video.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="video-thumbnail"
                            />
                            <div className="video-info">
                              <div className="video-title">{video.title}</div>
                              <div className="video-meta">
                                {video.platform_name} •{' '}
                                {Math.floor(video.duration_seconds / 60)}:
                                {String(video.duration_seconds % 60).padStart(2, '0')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="library-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleAddVideos}
                          disabled={selectedLibraryVideos.size === 0}
                        >
                          Add {selectedLibraryVideos.size} Video
                          {selectedLibraryVideos.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Assigned Videos List (with drag-and-drop) */}
              {assignedVideos.length > 0 ? (
                <div className="assigned-videos-section">
                  <h3>Assigned Videos</h3>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="assigned-videos" mode="virtual">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="videos-list"
                        >
                          {assignedVideos.map((video, index) => (
                            <VideoRow key={video.id} index={index} style={{}} />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No videos assigned to this chip yet.</p>
                  <p>Add videos from your library to get started.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || isLoading || assignedVideos.length === 0}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoAssignmentModal;
