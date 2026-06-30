import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Upload Middleware (multer)
 * ─────────────────────────────────────────────────────────
 * Handles image uploads for issue evidence and resolution photos.
 *
 * Storage: memory storage so the buffer can be passed directly to the
 * Gemini Vision API and (in production) to cloud storage. For the
 * hackathon we keep files in memory and return a data URL / public path.
 *
 * Security:
 *  - File type whitelist (images only) — prevents malicious uploads.
 *  - Size limit from config (default 10MB).
 */

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = config.maxFileSizeMb * 1024 * 1024;

// Memory storage - buffer available on req.file.buffer for Cloudinary
const storage = multer.memoryStorage();

/**
 * File filter — reject non-image uploads.
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Generate a stable public path for an uploaded file.
 * In production this would upload to S3/GCS and return a URL.
 * For the hackathon we return a placeholder path the frontend can resolve.
 *
 * @param {object} file - multer file object
 * @returns {string} public URL/path
 */
export const getPublicUrl = (file) => {
  if (!file) return null;
  // File is already saved by diskStorage, just return its path
  return `/uploads/issues/${file.filename}`;
};

export default upload;
