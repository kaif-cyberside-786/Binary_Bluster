/**
 * Controlled Document Upload Middleware
 * Enforces architecture.md §14 and rules.md §4:
 * - Binary files stored on disk outside MongoDB in gitignored upload directory
 * - Type and size validation server-side
 * - Generates secure randomized filenames with SHA-256 integrity checksums
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `DOC-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file type '${file.mimetype}'. Allowed types: PDF, JPEG, PNG, WEBP, DOC, DOCX.`
    );
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024, // default 10MB
  },
});

/**
 * Express wrapper for multer single file upload with standard API error responses
 */
function handleDocumentUpload(fieldName = 'file') {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return ApiResponse.badRequest(
            res,
            `File size exceeds maximum allowed limit of ${config.maxFileSizeMb}MB`,
            'FILE_TOO_LARGE'
          );
        }
        return ApiResponse.badRequest(res, `Upload error: ${err.message}`, 'UPLOAD_ERROR');
      } else if (err) {
        return ApiResponse.badRequest(res, err.message, err.code || 'UPLOAD_ERROR');
      }
      next();
    });
  };
}

/**
 * Compute SHA-256 hash of a file on disk
 */
function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

module.exports = {
  handleDocumentUpload,
  computeFileHash,
  ALLOWED_MIME_TYPES,
};

