/**
 * Service Authentication Middleware
 * Guards internal routes (/api/internal/*) per rules.md §6 and architecture.md §26.2.
 * Ensures only authorized automated services (such as n8n) can invoke background jobs.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Safely compares two strings in constant time to prevent timing attacks
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware: authenticateService
 * Validates request carries valid service credentials via X-Service-Token header
 * or Authorization: Bearer <token>.
 */
function authenticateService(req, res, next) {
  let token = null;

  // 1. Check X-Service-Token header
  const customHeader = req.headers['x-service-token'];
  if (customHeader) {
    token = Array.isArray(customHeader) ? customHeader[0] : customHeader;
  }

  // 2. Check Authorization: Bearer <token>
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    logger.warn('Internal service access rejected: missing service credentials', {
      ip: req.ip,
      path: req.originalUrl,
    });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_SERVICE',
        message: 'Valid service credentials required for internal endpoints',
      },
    });
  }

  // 3. Match against configured N8N_SERVICE_TOKEN
  if (safeCompare(token, config.n8nServiceToken)) {
    req.user = {
      user_id: 'SYSTEM_N8N_SERVICE',
      role: 'SERVICE',
      designation: 'Automated Background Service',
      jurisdiction: { level: 'NATIONAL' },
    };
    return next();
  }

  // 4. Alternatively verify as signed JWT with role: 'SERVICE'
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded && decoded.role === 'SERVICE') {
      req.user = {
        user_id: decoded.user_id || 'SYSTEM_SERVICE_JWT',
        role: 'SERVICE',
        designation: decoded.designation || 'Automated Service Worker',
        jurisdiction: decoded.jurisdiction || { level: 'NATIONAL' },
      };
      return next();
    }
  } catch (err) {
    // JWT verification failed
  }

  logger.warn('Internal service access rejected: invalid service credentials', {
    ip: req.ip,
    path: req.originalUrl,
  });

  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED_SERVICE',
      message: 'Invalid service token provided',
    },
  });
}

module.exports = {
  authenticateService,
  safeCompare,
};

