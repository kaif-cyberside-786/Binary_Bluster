/**
 * Project Lifecycle Routes
 * Implements Phase 4 project recommendation, review queue, and authorized status transitions
 * Enforces architecture.md §10.1 canonical lifecycles and rules.md §3, §6, §7, §10 authorization boundaries.
 */
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/transaction');
const {
  Project,
  ProjectRecommendation,
  OfficerDecision,
  AuditLog,
  MpAllocation,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  DECISION_TYPES,
} = require('../models');

const router = express.Router();

/**
 * Helper to resolve MP ID for current user
 */
async function resolveMpId(user) {
  if (user.jurisdiction?.level === 'CONSTITUENCY' && user.jurisdiction?.constituency) {
    const alloc = await MpAllocation.findOne({
      constituency: new RegExp(`^${user.jurisdiction.constituency}$`, 'i'),
      state: new RegExp(`^${user.jurisdiction.state}$`, 'i'),
    });
    if (alloc) return alloc.mp_id;
  }
  return user.user_id;
}

/**
 * POST /api/projects/recommendation
 * MP submits a new project recommendation
 * Protected: MP role only
 */
router.post('/recommendation', authenticate, authorize('MP'), async (req, res, next) => {
  try {
    const {
      title,
      category,
      estimated_cost,
      description,
      location,
      district,
    } = req.body;

    // Validate required fields
    if (!title || !category || estimated_cost === undefined || !description) {
      return ApiResponse.badRequest(
        res,
        'Missing required fields: title, category, estimated_cost, and description are mandatory',
        'VALIDATION_ERROR'
      );
    }

    if (!PROJECT_CATEGORIES.includes(category)) {
      return ApiResponse.badRequest(
        res,
        `Invalid category: '${category}'. Must be one of recognized project categories.`,
        'INVALID_CATEGORY'
      );
    }

    const costNumber = Number(estimated_cost);
    if (isNaN(costNumber) || costNumber <= 0) {
      return ApiResponse.badRequest(
        res,
        'estimated_cost must be a positive number greater than 0',
        'INVALID_ESTIMATED_COST'
      );
    }

    if (typeof description !== 'string' || description.trim().length < 10) {
      return ApiResponse.badRequest(
        res,
        'description must be at least 10 characters detailing the proposed work',
        'INVALID_DESCRIPTION'
      );
    }

    const state = req.user.jurisdiction?.state || 'Madhya Pradesh';
    const targetDistrict =
      district ||
      req.user.jurisdiction?.district ||
      req.user.jurisdiction?.constituency ||
      'Indore';
    const mpId = await resolveMpId(req.user);

    // Generate deterministic project_id: PRJ-{STATE}-{DISTRICT}-{TIMESTAMP}
    const cleanState = state.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const cleanDist = targetDistrict.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const uniqueSuffix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    const projectId = `PRJ-${cleanState}-${cleanDist}-${uniqueSuffix}`;

    const locationObj = {
      block: location?.block || '',
      gram_panchayat: location?.gram_panchayat || '',
      village_ward: location?.village_ward || '',
      latitude: location?.latitude ? Number(location.latitude) : null,
      longitude: location?.longitude ? Number(location.longitude) : null,
    };

    let createdProject = null;
    let createdRec = null;

    // Atomic creation via multi-document transaction helper
    await withTransaction(async (session) => {
      // 1. Create Project in DISTRICT_REVIEW status
      const project = new Project({
        project_id: projectId,
        mp_id: mpId,
        state,
        district: targetDistrict,
        category,
        title: title.trim(),
        status: 'DISTRICT_REVIEW',
        estimated_cost: costNumber,
        is_inspection_required: false,
        is_escalated: false,
        is_real_government_data: false,
        is_synthetic: false,
      });
      await project.save({ session });

      // 2. Create append-only ProjectRecommendation
      const recommendation = new ProjectRecommendation({
        project_id: projectId,
        mp_id: mpId,
        description: description.trim(),
        location: locationObj,
        estimated_cost: costNumber,
        work_category: category,
        recommended_at: new Date(),
        recommended_by: req.user.user_id,
        is_real_government_data: false,
        is_synthetic: false,
      });
      await recommendation.save({ session });

      // 3. Create append-only AuditLog
      const auditLog = new AuditLog({
        audit_id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'CREATE_RECOMMENDATION',
        entity_type: 'PROJECT',
        entity_id: projectId,
        project_id: projectId,
        new_state: {
          status: 'DISTRICT_REVIEW',
          title: project.title,
          category,
          estimated_cost: costNumber,
          district: targetDistrict,
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });
      await auditLog.save({ session });

      createdProject = project;
      createdRec = recommendation;
    });

    logger.info(`New recommendation created: ${projectId} by ${req.user.user_id}`, {
      projectId,
      mpId,
      district: targetDistrict,
      cost: costNumber,
    });

    return ApiResponse.created(
      res,
      {
        project: createdProject,
        recommendation: createdRec,
      },
      'Recommendation submitted successfully and forwarded to District Authority for review'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects
 * Retrieve scoped project list with pagination & filters
 * Protected: All roles except ADMIN (Admin isolation per rules.md §10)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, jurisdiction, user_id } = req.user;

    // Admin Isolation enforcement (design.md §5.32, rules.md §10)
    if (role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits administrative accounts from accessing project business data per rules.md §10',
        'ADMIN_ISOLATION'
      );
    }

    const query = {};

    // Apply role-based jurisdiction scoping
    if (role === 'MP') {
      const mpId = await resolveMpId(req.user);
      query.$or = [{ mp_id: mpId }, { mp_id: user_id }];
    } else if (role === 'DISTRICT_AUTHORITY') {
      const dist = jurisdiction?.district;
      if (dist) {
        query.district = new RegExp(`^${dist}$`, 'i');
      }
    } else if (role === 'STATE_NODAL_AUTHORITY') {
      const st = jurisdiction?.state;
      if (st) {
        query.state = new RegExp(`^${st}$`, 'i');
      }
    } else if (role === 'IMPLEMENTING_AGENCY') {
      if (jurisdiction?.agency_id) {
        query.implementing_agency_id = jurisdiction.agency_id;
      } else if (jurisdiction?.district) {
        query.district = new RegExp(`^${jurisdiction.district}$`, 'i');
      }
    }
    // MINISTRY and AUDITOR roles have national jurisdiction scope

    // Apply query filters
    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.district && ['MINISTRY', 'STATE_NODAL_AUTHORITY', 'AUDITOR'].includes(role)) {
      query.district = new RegExp(`^${req.query.district}$`, 'i');
    }

    if (req.query.mp_id && ['MINISTRY', 'STATE_NODAL_AUTHORITY', 'DISTRICT_AUTHORITY', 'AUDITOR'].includes(role)) {
      query.mp_id = req.query.mp_id;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { project_id: searchRegex }];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Project.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Project.countDocuments(query),
    ]);

    return ApiResponse.paginated(res, items, total, page, limit, 'Projects retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:projectId
 * Retrieve detailed project information including recommendation and decisions
 * Protected: All roles except ADMIN
 */
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { role, jurisdiction, user_id } = req.user;

    if (role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits access to project details per rules.md §10',
        'ADMIN_ISOLATION'
      );
    }

    const projectId = req.params.projectId.toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    // Verify jurisdiction access
    if (role === 'DISTRICT_AUTHORITY') {
      if (project.district.toLowerCase() !== jurisdiction?.district?.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: project belongs to ${project.district} District, which is outside your jurisdiction (${jurisdiction?.district})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (role === 'STATE_NODAL_AUTHORITY') {
      if (project.state.toLowerCase() !== jurisdiction?.state?.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: project belongs to ${project.state}, outside your jurisdiction (${jurisdiction?.state})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (role === 'MP') {
      const mpId = await resolveMpId(req.user);
      if (project.mp_id !== mpId && project.mp_id !== user_id) {
        return ApiResponse.forbidden(
          res,
          'Access denied: you may only view your own constituency recommendations',
          'FORBIDDEN_JURISDICTION'
        );
      }
    }

    const [recommendation, decisions] = await Promise.all([
      ProjectRecommendation.findOne({ project_id: projectId }).lean(),
      OfficerDecision.find({ project_id: projectId }).sort({ decided_at: -1 }).lean(),
    ]);

    return ApiResponse.success(
      res,
      {
        project,
        recommendation: recommendation || null,
        decisions: decisions || [],
      },
      'Project details retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:projectId/decision
 * Official administrative decision on project
 * Protected: DISTRICT_AUTHORITY, STATE_NODAL_AUTHORITY, MINISTRY
 */
router.patch(
  '/:projectId/decision',
  authenticate,
  authorize('DISTRICT_AUTHORITY', 'STATE_NODAL_AUTHORITY', 'MINISTRY'),
  async (req, res, next) => {
    try {
      const { role, jurisdiction, user_id } = req.user;
      const projectId = req.params.projectId.toUpperCase();
      const { decision, reason, sanctioned_cost, target_completion_date } = req.body;

      // Validate required decision and reason
      if (!decision) {
        return ApiResponse.badRequest(res, 'decision field is required', 'DECISION_REQUIRED');
      }

      const ALLOWED_DECISIONS = [
        'SANCTION',
        'HOLD',
        'REQUEST_CLARIFICATION',
        'REJECT',
        'ORDER_INSPECTION',
        'MARK_IN_PROGRESS',
        'MARK_COMPLETED',
      ];

      if (!ALLOWED_DECISIONS.includes(decision)) {
        return ApiResponse.badRequest(
          res,
          `Invalid decision: '${decision}'. Allowed decisions: ${ALLOWED_DECISIONS.join(', ')}`,
          'INVALID_DECISION'
        );
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return ApiResponse.badRequest(
          res,
          'Substantive reason is mandatory for all administrative decisions (minimum 5 characters)',
          'REASON_REQUIRED'
        );
      }

      const project = await Project.findOne({ project_id: projectId });
      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      // Enforce District Authority jurisdiction boundary
      if (role === 'DISTRICT_AUTHORITY') {
        if (project.district.toLowerCase() !== jurisdiction?.district?.toLowerCase()) {
          return ApiResponse.forbidden(
            res,
            `Access denied: cannot decide on works outside your district jurisdiction (${jurisdiction?.district})`,
            'FORBIDDEN_JURISDICTION'
          );
        }
      } else if (role === 'STATE_NODAL_AUTHORITY') {
        if (project.state.toLowerCase() !== jurisdiction?.state?.toLowerCase()) {
          return ApiResponse.forbidden(
            res,
            `Access denied: cannot decide on works outside your state jurisdiction (${jurisdiction?.state})`,
            'FORBIDDEN_JURISDICTION'
          );
        }
      }

      const prevStatus = project.status;
      let newStatus = prevStatus;
      const updates = {};

      // Status transition validation per architecture.md §10.1
      if (decision === 'SANCTION') {
        const validSources = ['DISTRICT_REVIEW', 'HELD', 'CLARIFICATION_REQUIRED'];
        if (!validSources.includes(prevStatus)) {
          return ApiResponse.badRequest(
            res,
            `Cannot sanction project from current status '${prevStatus}'. Must be in: ${validSources.join(', ')}`,
            'INVALID_STATUS_TRANSITION'
          );
        }
        newStatus = 'SANCTIONED';
        updates.status = newStatus;
        updates.sanction_date = new Date();
        updates.sanctioned_cost =
          sanctioned_cost !== undefined && !isNaN(Number(sanctioned_cost)) && Number(sanctioned_cost) > 0
            ? Number(sanctioned_cost)
            : project.estimated_cost;
        if (target_completion_date) {
          updates.target_completion_date = new Date(target_completion_date);
        }
      } else if (decision === 'HOLD') {
        if (prevStatus !== 'DISTRICT_REVIEW') {
          return ApiResponse.badRequest(
            res,
            `Cannot place project on hold from status '${prevStatus}'. Must be 'DISTRICT_REVIEW'`,
            'INVALID_STATUS_TRANSITION'
          );
        }
        newStatus = 'HELD';
        updates.status = newStatus;
      } else if (decision === 'REQUEST_CLARIFICATION') {
        if (prevStatus !== 'DISTRICT_REVIEW') {
          return ApiResponse.badRequest(
            res,
            `Cannot request clarification from status '${prevStatus}'. Must be 'DISTRICT_REVIEW'`,
            'INVALID_STATUS_TRANSITION'
          );
        }
        newStatus = 'CLARIFICATION_REQUIRED';
        updates.status = newStatus;
      } else if (decision === 'ORDER_INSPECTION') {
        updates.is_inspection_required = true;
      } else if (decision === 'MARK_IN_PROGRESS') {
        if (prevStatus !== 'SANCTIONED') {
          return ApiResponse.badRequest(
            res,
            `Cannot mark project in-progress from status '${prevStatus}'. Must be 'SANCTIONED'`,
            'INVALID_STATUS_TRANSITION'
          );
        }
        newStatus = 'IN_PROGRESS';
        updates.status = newStatus;
      } else if (decision === 'MARK_COMPLETED') {
        if (prevStatus !== 'IN_PROGRESS') {
          return ApiResponse.badRequest(
            res,
            `Cannot mark project completed from status '${prevStatus}'. Must be 'IN_PROGRESS'`,
            'INVALID_STATUS_TRANSITION'
          );
        }
        newStatus = 'COMPLETED';
        updates.status = newStatus;
        updates.actual_completion_date = new Date();
      }

      let createdDecision = null;

      // Atomic update via withTransaction
      await withTransaction(async (session) => {
        // 1. Update project
        Object.assign(project, updates);
        await project.save({ session });

        // 2. Create append-only OfficerDecision
        const decisionDoc = new OfficerDecision({
          decision_id: `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          project_id: projectId,
          officer_id: user_id,
          role,
          decision,
          reason: reason.trim(),
          previous_state: prevStatus,
          new_state: newStatus,
          decided_at: new Date(),
          is_real_government_data: false,
          is_synthetic: false,
        });
        await decisionDoc.save({ session });

        // 3. Create append-only AuditLog
        const auditLog = new AuditLog({
          audit_id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          user_id,
          role,
          action: `OFFICER_DECISION_${decision}`,
          entity_type: 'DECISION',
          entity_id: decisionDoc.decision_id,
          project_id: projectId,
          previous_state: { status: prevStatus },
          new_state: { status: newStatus, updates },
          reason: reason.trim(),
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          timestamp: new Date(),
        });
        await auditLog.save({ session });

        createdDecision = decisionDoc;
      });

      logger.info(
        `Decision applied on ${projectId}: ${decision} by ${user_id} (${prevStatus} -> ${newStatus})`,
        { projectId, decision, prevStatus, newStatus }
      );

      return ApiResponse.success(
        res,
        {
          project,
          decision: createdDecision,
        },
        `Decision '${decision}' recorded successfully. Status updated to '${newStatus}'.`
      );
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

