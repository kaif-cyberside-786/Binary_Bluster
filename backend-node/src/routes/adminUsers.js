/**
 * Admin User Management API
 * Endpoint: /api/admin/users
 * Restricted to ADMIN role only.
 * Enforces design.md §5.32 & rules.md §10:
 * - Admin manages user accounts, roles, and jurisdictions ONLY.
 * - Strictly NO risk scores, decisions, or audit content is ever exposed here.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

// Apply auth + ADMIN role check across all routes in this file
router.use(authenticate, authorize('ADMIN'));

const SANITIZED_USER_FIELDS = '-password_hash -password_reset_token -password_reset_expires';

/**
 * GET /api/admin/users
 * Paginated list of users with optional role & status filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.role && ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { user_id: searchRegex },
        { full_name: searchRegex },
        { official_email: searchRegex },
        { designation: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SANITIZED_USER_FIELDS)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ApiResponse.success(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users
 * Create a new user account with hashed password
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      user_id,
      official_email,
      password,
      full_name,
      role,
      designation,
      phone,
      jurisdiction,
    } = req.body;

    if (!password || password.length < 8) {
      return ApiResponse.badRequest(
        res,
        'A temporary password of at least 8 characters is required for new accounts',
        'PASSWORD_REQUIREMENT'
      );
    }

    // Check duplicate natural keys before hashing
    const existing = await User.findOne({
      $or: [
        { user_id: (user_id || '').toUpperCase().trim() },
        { official_email: (official_email || '').toLowerCase().trim() },
      ],
    });

    if (existing) {
      const conflictField =
        existing.user_id === (user_id || '').toUpperCase().trim()
          ? 'user_id'
          : 'official_email';
      return ApiResponse.conflict(
        res,
        `A user with this ${conflictField} already exists in the registry`,
        'DUPLICATE_USER'
      );
    }

    // Hash password with bcrypt cost factor 12
    const password_hash = await bcrypt.hash(password, 12);

    const newUser = new User({
      user_id: (user_id || '').toUpperCase().trim(),
      official_email: (official_email || '').toLowerCase().trim(),
      password_hash,
      full_name,
      role,
      designation,
      phone,
      jurisdiction,
    });

    // Validate with Mongoose schema
    await newUser.validate();
    await newUser.save();

    const sanitized = newUser.toObject();
    delete sanitized.password_hash;
    delete sanitized.password_reset_token;
    delete sanitized.password_reset_expires;

    return ApiResponse.created(res, sanitized, 'User account registered successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:userId
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findOne({
      user_id: req.params.userId.toUpperCase(),
    })
      .select(SANITIZED_USER_FIELDS)
      .lean();

    if (!user) {
      return ApiResponse.notFound(res, `User '${req.params.userId}' not found`);
    }

    return ApiResponse.success(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details (name, designation, phone, role, jurisdiction)
 */
router.patch('/:userId', async (req, res, next) => {
  try {
    const user = await User.findOne({
      user_id: req.params.userId.toUpperCase(),
    });

    if (!user) {
      return ApiResponse.notFound(res, `User '${req.params.userId}' not found`);
    }

    const allowedUpdates = [
      'full_name',
      'designation',
      'phone',
      'role',
      'jurisdiction',
      'is_active',
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    }

    await user.save();

    const sanitized = user.toObject();
    delete sanitized.password_hash;
    delete sanitized.password_reset_token;
    delete sanitized.password_reset_expires;

    return ApiResponse.success(res, sanitized, 'User profile updated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Activate or deactivate a user account
 */
router.patch('/:userId/status', async (req, res, next) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return ApiResponse.badRequest(res, 'is_active boolean is required');
    }

    const user = await User.findOne({
      user_id: req.params.userId.toUpperCase(),
    });

    if (!user) {
      return ApiResponse.notFound(res, `User '${req.params.userId}' not found`);
    }

    user.is_active = is_active;
    await user.save();

    return ApiResponse.success(
      res,
      { user_id: user.user_id, is_active: user.is_active },
      `Account ${is_active ? 'activated' : 'deactivated'} successfully`
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

