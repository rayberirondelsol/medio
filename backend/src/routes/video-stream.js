const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Stream video with range request support
router.get('/:id/stream', authenticateToken, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    
    // Get video metadata from database
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = result.rows[0];
    
    // For external URLs, redirect to the original source
    if (video.url && (video.url.startsWith('http://') || video.url.startsWith('https://'))) {
      return res.redirect(video.url);
    }

    // For local files, implement range request streaming
    const videoPath = path.resolve(video.file_path || video.url);
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Validate range
      if (start >= fileSize || end >= fileSize) {
        res.status(416).set({
          'Content-Range': `bytes */${fileSize}`
        });
        return res.end();
      }

      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      
      // Set headers for partial content
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mime_type || 'video/mp4',
        'Cache-Control': 'no-cache'
      };

      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      // No range request, send entire file
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': video.mime_type || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      };

      res.writeHead(200, headers);
      fs.createReadStream(videoPath).pipe(res);
    }

    // Log video access for analytics
    pool.query(
      'INSERT INTO video_access_logs (video_id, user_id, accessed_at) VALUES ($1, $2, NOW())',
      [videoId, req.user.id]
    ).catch(err => console.error('Failed to log video access:', err));

  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ message: 'Failed to stream video' });
  }
});

// Get video thumbnail with caching headers
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    
    const result = await pool.query(
      'SELECT thumbnail_url FROM videos WHERE id = $1',
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const thumbnailUrl = result.rows[0].thumbnail_url;
    
    if (thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))) {
      // Redirect to external thumbnail
      res.redirect(thumbnailUrl);
    } else if (thumbnailUrl) {
      // Serve local thumbnail with caching
      const thumbnailPath = path.resolve(thumbnailUrl);
      
      if (fs.existsSync(thumbnailPath)) {
        res.set({
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Content-Type': 'image/jpeg'
        });
        fs.createReadStream(thumbnailPath).pipe(res);
      } else {
        res.status(404).json({ message: 'Thumbnail not found' });
      }
    } else {
      res.status(404).json({ message: 'No thumbnail available' });
    }
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ message: 'Failed to fetch thumbnail' });
  }
});

// Prefetch video metadata for smoother playback
router.get('/:id/metadata', authenticateToken, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    
    const result = await pool.query(`
      SELECT 
        v.id,
        v.title,
        v.description,
        v.duration,
        v.thumbnail_url,
        v.created_at,
        CASE 
          WHEN v.file_path IS NOT NULL THEN 'local'
          WHEN v.url LIKE 'http%' THEN 'external'
          ELSE 'unknown'
        END as source_type,
        COALESCE(
          (SELECT COUNT(*) FROM watch_sessions WHERE video_id = v.id),
          0
        ) as view_count
      FROM videos v
      WHERE v.id = $1 AND v.user_id = $2
    `, [videoId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.set({
      'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
    });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    res.status(500).json({ message: 'Failed to fetch video metadata' });
  }
});

module.exports = router;