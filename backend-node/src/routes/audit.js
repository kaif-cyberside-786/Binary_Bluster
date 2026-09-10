/**
 * Audit Log Routes
 * Router: audit.js
 * Implements Phase 15: Audit, Traceability & Quality Assurance
 * Provides secure, read-only access to the append-only audit trail.
 * Strictly blocks all update, delete, and direct creation mutations.
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const auditService = require('../services/auditService');

// All audit routes require authentication
router.use(authenticate);

// 1. Immutable Enforcement Middleware: Reject all mutation methods
router.use((req, res, next) => {
  if (['PUT', 'PATCH', 'DELETE', 'POST'].includes(req.method)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'IMMUTABLE_RECORD',
        message:
          'Audit logs are write-once append-only. Modification and direct manual creation are strictly prohibited per rules.md §9 and architecture.md §10.1.',
      },
    });
  }
  next();
});

/**
 * GET /api/audit
 * Query audit records for authorized supervisory & oversight roles
 * Enforces Admin Isolation (403 for ADMIN)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      project_id,
      event_type,
      action,
      entity_type,
      user_id,
      from_date,
      to_date,
      page,
      limit,
    } = req.query;

    const filters = {
      project_id,
      event_type,
      action,
      entity_type,
      user_id,
      from_date,
      to_date,
    };

    const result = await auditService.queryAuditLogs(filters, req.user, { page, limit });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.code === 'ADMIN_ISOLATION') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_ISOLATION',
          message: err.message,
        },
      });
    }
    if (err.code === 'FORBIDDEN_ROLE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * GET /api/audit/project/:projectId
 * Retrieve complete chronological audit trail for a specific project
 * Enforces Admin Isolation (403 for ADMIN) and jurisdiction checks
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const trail = await auditService.getProjectAuditTrail(projectId, req.user);
    res.json({
      success: true,
      data: trail,
    });
  } catch (err) {
    if (err.code === 'ADMIN_ISOLATION') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_ISOLATION',
          message: err.message,
        },
      });
    }
    if (err.code === 'FORBIDDEN_JURISDICTION') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_JURISDICTION',
          message: err.message,
        },
      });
    }
    if (err.code === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

module.exports = router;

