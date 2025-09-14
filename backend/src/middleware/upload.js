const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create upload directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const videoDir = path.join(uploadDir, 'videos');
const thumbnailDir = path.join(uploadDir, 'thumbnails');

[uploadDir, videoDir, thumbnailDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  video: parseInt(process.env.MAX_VIDEO_SIZE || '524288000'), // 500MB default
  thumbnail: parseInt(process.env.MAX_THUMBNAIL_SIZE || '5242880'), // 5MB default
  avatar: parseInt(process.env.MAX_AVATAR_SIZE || '2097152'), // 2MB default
  default: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
};

// Allowed file types
const FILE_TYPES = {
  video: /\.(mp4|webm|ogg|mov|avi|mkv)$/i,
  image: /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  avatar: /\.(jpg|jpeg|png|webp)$/i
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destDir = uploadDir;
    
    if (file.fieldname === 'video') {
      destDir = videoDir;
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'avatar') {
      destDir = thumbnailDir;
    }
    
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .substring(0, 50);
    
    cb(null, `${sanitizedName}-${timestamp}-${uniqueSuffix}${ext}`);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Check file type based on field name
  if (file.fieldname === 'video') {
    if (!FILE_TYPES.video.test(file.originalname)) {
      return cb(new Error('Invalid video file type. Allowed types: mp4, webm, ogg, mov, avi, mkv'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (!FILE_TYPES.image.test(file.originalname)) {
      return cb(new Error('Invalid image file type. Allowed types: jpg, jpeg, png, gif, webp, svg'), false);
    }
  } else if (file.fieldname === 'avatar') {
    if (!FILE_TYPES.avatar.test(file.originalname)) {
      return cb(new Error('Invalid avatar file type. Allowed types: jpg, jpeg, png, webp'), false);
    }
  }
  
  cb(null, true);
};

// Create multer instances with different configurations
const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.video,
    files: 1
  }
}).single('video');

const uploadThumbnail = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.thumbnail,
    files: 1
  }
}).single('thumbnail');

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.avatar,
    files: 1
  }
}).single('avatar');

const uploadVideoWithThumbnail = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.video,
    files: 2
  }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const fieldLimits = {
        video: '500MB',
        thumbnail: '5MB',
        avatar: '2MB'
      };
      const limit = fieldLimits[err.field] || '10MB';
      return res.status(413).json({
        message: `File too large. Maximum size allowed is ${limit}`,
        field: err.field,
        code: 'FILE_TOO_LARGE'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files uploaded',
        code: 'TOO_MANY_FILES'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected file field',
        field: err.field,
        code: 'UNEXPECTED_FIELD'
      });
    }
  } else if (err) {
    // Custom file filter errors
    return res.status(400).json({
      message: err.message || 'File upload failed',
      code: 'UPLOAD_ERROR'
    });
  }
  next();
};

// Cleanup utility to delete uploaded files
const cleanupUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete file:', err);
    });
  }
};

// Validate upload directory permissions
const validateUploadDirectory = () => {
  try {
    const testFile = path.join(uploadDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    console.error('Upload directory is not writable:', error);
    return false;
  }
};

// Initialize on startup
if (!validateUploadDirectory()) {
  console.error('WARNING: Upload directory is not writable. File uploads will fail.');
}

module.exports = {
  uploadVideo,
  uploadThumbnail,
  uploadAvatar,
  uploadVideoWithThumbnail,
  handleUploadError,
  cleanupUploadedFile,
  FILE_SIZE_LIMITS,
  FILE_TYPES
};