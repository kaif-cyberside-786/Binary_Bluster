/**
 * Environment configuration loader and validator
 * Enforces defaults and validates runtime parameters.
 */
const dotenv = require('dotenv');
const path = require('path');

// Load .env if present (ignored if not found)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTest =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  (process.execArgv && process.execArgv.some((a) => a.includes('test'))) ||
  (process.argv && process.argv.some((a) => a.includes('test')));

const config = {
  env: isTest ? 'test' : process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mplads',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  logLevel: isTest ? 'error' : process.env.LOG_LEVEL || 'info',

  // Authentication & Tokens (Phase 2)
  jwtSecret: process.env.JWT_SECRET || 'mplads_dev_jwt_access_secret_super_secure_key_123',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'mplads_dev_jwt_refresh_secret_super_secure_key_456',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  captchaSecret: process.env.CAPTCHA_SECRET || 'mplads_dev_captcha_hmac_secret_key_789',

  // Account Lockout
  lockoutMaxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS, 10) || 5,
  lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 15,

  // Document Storage (Phase 5)
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../uploads'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
};

module.exports = config;
