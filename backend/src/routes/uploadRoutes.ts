import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '@/utils/logger';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // In production, use cloud storage (AWS S3, Cloudinary, etc.)
    // Ensure directory exists before saving
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for videos)
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and video files
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|avi|mkv|webm|m4v|3gp/;
    const allowedMimeTypes = /image|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument|video/;
    
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and videos are allowed.'));
    }
  },
});

/**
 * @route   POST /api/upload/chat-file
 * @desc    Upload file for chat
 * @access  Private
 */
router.post('/chat-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // In production, upload to cloud storage and return public URL
    const fileUrl = `/uploads/${req.file.filename}`;

    logger.info(`File uploaded: ${req.file.filename} by user: ${(req as any).user.id}`);

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
    });
  }
});

export default router;

