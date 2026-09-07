/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 * Enforces rules.md §10:
 * - Backend is the sole authorization boundary.
 * - Every protected request re-verifies JWT signature, role, and jurisdiction.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.unauthenticated(res, 'Authorization token is required (Bearer scheme)');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Fetch user to ensure account is active and not deleted
    const user = await User.findOne({ user_id: decoded.user_id });

    if (!user) {
      return ApiResponse.unauthenticated(res, 'User account no longer exists');
    }

    if (!user.is_active) {
      return ApiResponse.forbidden(
        res,
        'Your account has been deactivated. Please contact the administrator.',
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Attach sanitized user context to request
    req.user = {
      _id: user._id,
      user_id: user.user_id,
      official_email: user.official_email,
      full_name: user.full_name,
      role: user.role,
      designation: user.designation,
      jurisdiction: user.jurisdiction,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Access token has expired', 401, 'TOKEN_EXPIRED');
    }
    return ApiResponse.error(res, 'Invalid authorization token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Authorize specified roles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthenticated(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied: role '${req.user.role}' is not authorized to access this resource`,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
}

/**
 * Enforce jurisdiction match (rules.md §10)
 * Rejects requests if user's jurisdiction does not match the resource's jurisdiction.
 */
function requireJurisdiction(level, fieldExtractor) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthenticated(res, 'Authentication required');
    }

    const { role, jurisdiction } = req.user;

    // National-level roles bypass single-district/constituency scoping
    if (['MINISTRY', 'AUDITOR', 'ADMIN'].includes(role) || jurisdiction.level === 'NATIONAL') {
      return next();
    }

    const resourceScope = typeof fieldExtractor === 'function' ? fieldExtractor(req) : req.params[fieldExtractor || 'district'];

    if (!resourceScope) {
      return next(); // If no specific resource param is provided, proceed
    }

    if (level === 'DISTRICT') {
      if (jurisdiction.district?.toLowerCase() !== resourceScope.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: your jurisdiction (${jurisdiction.district}) does not match requested district (${resourceScope})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (level === 'STATE') {
      if (jurisdiction.state?.toLowerCase() !== resourceScope.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: your jurisdiction (${jurisdiction.state}) does not match requested state (${resourceScope})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  requireJurisdiction,
};

