/**
 * Internal Service Router (/api/internal/*)
 * Protected strictly by authenticateService middleware.
 * Exposes safe background automation endpoints for n8n workflows per rules.md §6 & architecture.md §26.2.
 * n8n never writes MongoDB directly; all background mutations are handled here.
 */
const express = require('express');
const mongoose = require('mongoose');
const { authenticateService } = require('../middleware/serviceAuth');
const {
  Project,
  Notification,
  Inspection,
  User,
  NOTIFICATION_TYPES,
} = require('../models');
const { evaluateProject } = require('../services/compliance');
const { loadMpAllocation } = require('../utils/loadMpAllocation');
const config = require('../config/env');
const logger = require('../utils/logger');

const router = express.Router();

// Apply service authentication to all internal endpoints
router.use(authenticateService);

/**
 * GET /api/internal/status
 * Automation service health and operational telemetry.
 * Safe for background monitoring telemetry and status cards.
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ONLINE',
      service: 'MPLADS_INTERNAL_AUTOMATION',
      environment: config.env,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        internal_api: 'READY',
      },
    },
  });
});

/**
 * POST /api/internal/ingestion/allocations
 * Triggers idempotent real government allocation data loader.
 * Ingests CSV into mp_allocation with is_real_government_data: true.
 */
router.post('/ingestion/allocations', async (req, res, next) => {
  try {
    const { csvPath, year } = req.body || {};
    logger.info('Internal automation: Starting MP allocations ingestion', {
      year: year || '2024-2025',
      triggeredBy: req.user?.user_id,
    });

    const result = await loadMpAllocation({ csvPath, year });

    logger.info('Internal automation: MP allocations ingestion completed', result);

    res.status(200).json({
      success: true,
      data: {
        operation: 'ALLOCATIONS_INGESTION',
        total_rows: result.totalRows,
        loaded: result.loaded,
        skipped: result.skipped,
        financial_year: year || '2024-2025',
        is_real_government_data: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Internal automation: MP allocations ingestion failed', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/internal/projects/active
 * Returns active projects needing background compliance or monitoring.
 */
router.get('/projects/active', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const { district, state, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['DISTRICT_REVIEW', 'SANCTIONED', 'IN_PROGRESS'] };
    }

    if (district) query.district = district;
    if (state) query.state = state;

    const projects = await Project.find(query)
      .select('project_id title status district state mp_id estimated_cost sanctioned_cost sanction_date created_at')
      .sort({ updated_at: -1 })
      .limit(limit)
      .lean();

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        total,
        returned: projects.length,
        limit,
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/internal/compliance/evaluate-batch
 * Evaluates compliance for multiple projects in batch using Phase 6 deterministic engine.
 */
router.post('/compliance/evaluate-batch', async (req, res, next) => {
  try {
    let { projectIds, limit } = req.body || {};
    const maxLimit = Math.min(parseInt(limit, 10) || 50, 100);

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      // Auto-select active projects up to limit
      const active = await Project.find({
        status: { $in: ['DISTRICT_REVIEW', 'SANCTIONED', 'IN_PROGRESS'] },
      })
        .select('project_id')
        .limit(maxLimit)
        .lean();
      projectIds = active.map((p) => p.project_id);
    }

    logger.info('Internal automation: Running batch compliance evaluation', {
      projectCount: projectIds.length,
    });

    let compliantCount = 0;
    let reviewRequiredCount = 0;
    let nonCompliantCount = 0;
    const results = [];

    for (const pid of projectIds) {
      try {
        const evalResult = await evaluateProject(pid, req.user);
        if (evalResult.overall_status === 'COMPLIANT') compliantCount++;
        else if (evalResult.overall_status === 'REVIEW_REQUIRED') reviewRequiredCount++;
        else if (evalResult.overall_status === 'NON_COMPLIANT') nonCompliantCount++;

        results.push({
          project_id: pid,
          overall_status: evalResult.overall_status,
          rules_evaluated: evalResult.summary?.total_rules || 0,
          failed_rules: evalResult.summary?.non_compliant_count || 0,
          review_rules: evalResult.summary?.review_required_count || 0,
        });
      } catch (err) {
        logger.warn(`Internal automation: Failed to evaluate project ${pid}`, { error: err.message });
        results.push({
          project_id: pid,
          error: err.message,
          overall_status: 'EVALUATION_ERROR',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        total_evaluated: results.length,
        compliant_count: compliantCount,
        review_required_count: reviewRequiredCount,
        non_compliant_count: nonCompliantCount,
        timestamp: new Date().toISOString(),
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/internal/notifications
 * Creates server-validated notifications for recipient roles and users.
 */
router.post('/notifications', async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body.notifications)
      ? req.body.notifications
      : [req.body];

    if (rawItems.length === 0 || !rawItems[0] || Object.keys(rawItems[0]).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one notification payload is required',
        },
      });
    }

    const docsToInsert = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (!item.recipient_user_id || !item.title || !item.message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Notification at index ${i} requires recipient_user_id, title, and message`,
          },
        });
      }

      const type = item.type && NOTIFICATION_TYPES.includes(item.type)
        ? item.type
        : 'COMPLIANCE_ALERT';

      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      docsToInsert.push({
        notification_id: notifId,
        recipient_user_id: item.recipient_user_id,
        type,
        title: item.title.trim(),
        message: item.message.trim(),
        project_id: item.project_id || null,
        is_read: false,
      });
    }

    const inserted = await Notification.insertMany(docsToInsert);

    logger.info('Internal automation: Created notifications', {
      count: inserted.length,
    });

    res.status(201).json({
      success: true,
      data: {
        created_count: inserted.length,
        notifications: inserted,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/internal/escalations
 * Dispatches a multi-level governance escalation event.
 * Alerts District Authority, State Nodal Authority, and Ministry officers.
 */
router.post('/escalations', async (req, res, next) => {
  try {
    const { district, state, trigger_reason, non_compliant_count, project_ids, notes } = req.body || {};

    if (!district || !state) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'district and state are required for escalation dispatch',
        },
      });
    }

    // Find authority recipients across governance tiers
    const [districtUsers, stateUsers, ministryUsers] = await Promise.all([
      User.find({ role: 'DISTRICT_AUTHORITY', 'jurisdiction.district': district }).select('user_id').lean(),
      User.find({ role: 'STATE_NODAL_AUTHORITY', 'jurisdiction.state': state }).select('user_id').lean(),
      User.find({ role: 'MINISTRY' }).select('user_id').lean(),
    ]);

    const recipientUserIds = [
      ...districtUsers.map((u) => u.user_id),
      ...stateUsers.map((u) => u.user_id),
      ...ministryUsers.map((u) => u.user_id),
    ];

    const escalationId = `ESC-${Date.now()}`;
    const escalationTitle = `[ESCALATION] Compliance Alert: ${district}, ${state}`;
    const escalationMessage = `Elevated compliance triggers detected: ${trigger_reason || 'Repeated non-compliance'}. Count: ${non_compliant_count || (project_ids?.length || 1)}. ${notes || ''}`;

    const notifications = recipientUserIds.map((userId) => ({
      notification_id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      recipient_user_id: userId,
      type: 'ESCALATION',
      title: escalationTitle,
      message: escalationMessage,
      project_id: project_ids && project_ids.length === 1 ? project_ids[0] : null,
      is_read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    logger.warn('Internal automation: Escalation event dispatched', {
      escalationId,
      district,
      state,
      notifiedOfficersCount: notifications.length,
    });

    res.status(200).json({
      success: true,
      data: {
        escalation_id: escalationId,
        district,
        state,
        trigger_reason: trigger_reason || 'ELEVATED_COMPLIANCE_VIOLATIONS',
        notified_users_count: notifications.length,
        notified_roles: ['DISTRICT_AUTHORITY', 'STATE_NODAL_AUTHORITY', 'MINISTRY'],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/internal/inspections/recommend
 * Creates an advisory inspection recommendation shell in inspections collection.
 * Pure skeleton placeholder; does NOT assign or execute inspections without human authority.
 */
router.post('/inspections/recommend', async (req, res, next) => {
  try {
    const { project_id, reason, priority } = req.body || {};

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'project_id is required to create an inspection recommendation',
        },
      });
    }

    const project = await Project.findOne({ project_id }).lean();
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Project ${project_id} not found`,
        },
      });
    }

    const inspectionId = `INSP-REC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const inspection = await Inspection.create({
      inspection_id: inspectionId,
      project_id: project.project_id,
      inspection_type: 'SPECIAL_RISK_TRIGGER',
      status: 'RECOMMENDED',
      priority: priority || 'HIGH',
      findings_summary: reason || 'Automated compliance rule trigger recommendation',
    });

    logger.info('Internal automation: Inspection recommendation shell created', {
      inspection_id: inspection.inspection_id,
      project_id: project.project_id,
    });

    res.status(201).json({
      success: true,
      data: {
        inspection_id: inspection.inspection_id,
        project_id: inspection.project_id,
        status: inspection.status,
        priority: inspection.priority,
        advisory_note: 'Advisory recommendation shell created. Human authority decision required for assignment/scheduling.',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

