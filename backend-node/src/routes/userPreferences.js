/**
 * User Preferences Routes
 * Implements persistent user settings per architecture.md §10.1 & memory.md
 * Preferences are strictly owned by the authenticated user.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const { UserPreference } = require('../models');

const router = express.Router();

const DEFAULT_PREFERENCES = {
  sidebar_collapsed: false,
  table_page_size: 10,
  email_notifications: true,
  risk_alert_threshold: 'MEDIUM_AND_HIGH',
  default_dashboard_view: 'overview',
  custom_settings: {},
};

/**
 * GET /api/user/preferences
 * Retrieve authenticated user's settings or defaults
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const pref = await UserPreference.findOne({ user_id }).lean();

    if (!pref) {
      return ApiResponse.success(
        res,
        {
          user_id,
          ...DEFAULT_PREFERENCES,
        },
        'Default preferences returned'
      );
    }

    return ApiResponse.success(res, pref, 'User preferences retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/user/preferences
 * Upsert authenticated user's settings
 */
router.patch('/', authenticate, async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const {
      sidebar_collapsed,
      table_page_size,
      email_notifications,
      risk_alert_threshold,
      default_dashboard_view,
      custom_settings,
    } = req.body;

    const updates = {};

    if (sidebar_collapsed !== undefined) {
      updates.sidebar_collapsed = Boolean(sidebar_collapsed);
    }

    if (table_page_size !== undefined) {
      const size = parseInt(table_page_size, 10);
      if (isNaN(size) || size < 5 || size > 100) {
        return ApiResponse.badRequest(
          res,
          'table_page_size must be a number between 5 and 100',
          'INVALID_PAGE_SIZE'
        );
      }
      updates.table_page_size = size;
    }

    if (email_notifications !== undefined) {
      updates.email_notifications = Boolean(email_notifications);
    }

    if (risk_alert_threshold !== undefined) {
      if (!['ALL', 'MEDIUM_AND_HIGH', 'HIGH_ONLY'].includes(risk_alert_threshold)) {
        return ApiResponse.badRequest(
          res,
          'risk_alert_threshold must be ALL, MEDIUM_AND_HIGH, or HIGH_ONLY',
          'INVALID_THRESHOLD'
        );
      }
      updates.risk_alert_threshold = risk_alert_threshold;
    }

    if (default_dashboard_view !== undefined) {
      updates.default_dashboard_view = String(default_dashboard_view).trim();
    }

    if (custom_settings !== undefined && typeof custom_settings === 'object') {
      updates.custom_settings = custom_settings;
    }

    const updated = await UserPreference.findOneAndUpdate(
      { user_id },
      { $set: updates },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).lean();

    return ApiResponse.success(res, updated, 'Preferences updated successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

