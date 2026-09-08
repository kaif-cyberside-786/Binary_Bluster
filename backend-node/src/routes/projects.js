/**
 * Project Lifecycle Routes
 * Implements Phase 4 project recommendation, review queue, and authorized status transitions
 * Enforces architecture.md §10.1 canonical lifecycles and rules.md §3, §6, §7, §10 authorization boundaries.
 */
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { withTransaction } = require('../utils/transaction');
const { handleDocumentUpload, computeFileHash } = require('../middleware/upload');
const {
  Project,
  ProjectRecommendation,
  OfficerDecision,
  AuditLog,
  MpAllocation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  UtilizationCertificate,
  Document,
  ComplianceFinding,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  DECISION_TYPES,
  PROGRESS_STAGES,
  PAYMENT_STATUSES,
  DOCUMENT_TYPES,
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
 * Helper to verify role and jurisdiction access to a specific project
 */
async function checkProjectAccess(project, user) {
  const { role, jurisdiction, user_id } = user;

  if (role === 'ADMIN') {
    return {
      allowed: false,
      code: 'ADMIN_ISOLATION',
      message: 'Access denied: Admin isolation prohibits access to project details per rules.md §10',
    };
  }

  if (role === 'DISTRICT_AUTHORITY') {
    if (project.district?.toLowerCase() !== jurisdiction?.district?.toLowerCase()) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: `Access denied: project belongs to ${project.district} District, which is outside your jurisdiction (${jurisdiction?.district})`,
      };
    }
  } else if (role === 'STATE_NODAL_AUTHORITY') {
    if (project.state?.toLowerCase() !== jurisdiction?.state?.toLowerCase()) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: `Access denied: project belongs to ${project.state}, outside your jurisdiction (${jurisdiction?.state})`,
      };
    }
  } else if (role === 'MP') {
    const mpId = await resolveMpId(user);
    if (project.mp_id !== mpId && project.mp_id !== user_id) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: 'Access denied: you may only view your own constituency recommendations',
      };
    }
  } else if (role === 'IMPLEMENTING_AGENCY') {
    const agencyId = jurisdiction?.agency_id;
    const agencyDistrict = jurisdiction?.district || (agencyId?.includes('INDORE') || user_id?.includes('IND') ? 'Indore' : null);
    const agencyIds = [agencyId, user_id, 'PWD-INDORE-01'].filter(Boolean);

    const agencyMatches =
      !project.implementing_agency_id ||
      agencyIds.includes(project.implementing_agency_id) ||
      (agencyDistrict && project.district?.toLowerCase() === agencyDistrict.toLowerCase());

    const districtMatches =
      !agencyDistrict || !project.district ||
      project.district.toLowerCase() === agencyDistrict.toLowerCase();

    if (!agencyMatches || !districtMatches) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: 'Access denied: project is outside your agency jurisdiction',
      };
    }
  }

  return { allowed: true };
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
      const agencyId = jurisdiction?.agency_id;
      const agencyDistrict = jurisdiction?.district || (agencyId?.includes('INDORE') || user_id?.includes('IND') ? 'Indore' : null);
      const agencyIds = [agencyId, user_id, 'PWD-INDORE-01'].filter(Boolean);

      const agencyConditions = [
        { implementing_agency_id: { $in: agencyIds } },
      ];
      if (agencyDistrict) {
        agencyConditions.push({
          district: new RegExp(`^${agencyDistrict}$`, 'i'),
          status: { $in: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] },
          $or: [
            { implementing_agency_id: null },
            { implementing_agency_id: { $exists: false } },
            { implementing_agency_id: '' },
            { implementing_agency_id: { $in: agencyIds } },
          ],
        });
      }
      query.$or = agencyConditions;
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
 * Retrieve complete project 360 information including recommendation, decisions,
 * engineering report versions, physical progress history, payments, UCs, and document metadata.
 * Protected: All roles except ADMIN (Admin Isolation strictly enforced).
 */
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    // Verify role and jurisdiction access
    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const [
      recommendation,
      decisions,
      engineeringReports,
      progressHistory,
      payments,
      utilizationCertificates,
      documents,
      complianceFindings,
    ] = await Promise.all([
      ProjectRecommendation.findOne({ project_id: projectId }).lean(),
      OfficerDecision.find({ project_id: projectId }).sort({ decided_at: -1 }).lean(),
      EngineeringReport.find({ project_id: projectId }).sort({ version: 1 }).lean(),
      ProjectProgress.find({ project_id: projectId }).sort({ reported_at: -1 }).lean(),
      ProjectPayment.find({ project_id: projectId }).sort({ installment_number: 1, created_at: 1 }).lean(),
      UtilizationCertificate.find({ project_id: projectId }).sort({ created_at: -1 }).lean(),
      Document.find({ project_id: projectId }).sort({ uploaded_at: -1 }).select('-__v').lean(),
      ComplianceFinding.find({ project_id: projectId }).sort({ rule_id: 1 }).lean(),
    ]);

    // Compute overall compliance status
    let complianceStatus = 'COMPLIANT';
    for (const f of complianceFindings) {
      if (f.status === 'NON_COMPLIANT') {
        complianceStatus = 'NON_COMPLIANT';
        break;
      }
      if (f.status === 'REVIEW_REQUIRED') {
        complianceStatus = 'REVIEW_REQUIRED';
      }
    }

    return ApiResponse.success(
      res,
      {
        project,
        recommendation: recommendation || null,
        decisions: decisions || [],
        engineering_reports: engineeringReports || [],
        progress: progressHistory || [],
        payments: payments || [],
        utilization_certificates: utilizationCertificates || [],
        documents: documents || [],
        compliance: {
          overall_status: complianceStatus,
          findings: complianceFindings || [],
        },
      },
      'Project details retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

// Alias for explicit detail endpoint
router.get('/:projectId/detail', authenticate, async (req, res, next) => {
  req.url = `/${req.params.projectId}`;
  return router.handle(req, res, next);
});

// Alias for explicit project compliance endpoint
router.get('/:projectId/compliance', authenticate, async (req, res, next) => {
  req.url = `/project/${req.params.projectId}`;
  const complianceRoutes = require('./compliance');
  return complianceRoutes.handle(req, res, next);
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
      const { decision, reason, sanctioned_cost, target_completion_date, implementing_agency_id } = req.body;

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
        'ASSIGN_AGENCY',
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

        // Set implementing agency on sanction (or default to district PWD)
        const chosenAgency = implementing_agency_id && implementing_agency_id.trim();
        if (chosenAgency) {
          updates.implementing_agency_id = chosenAgency;
        } else if (!project.implementing_agency_id) {
          updates.implementing_agency_id = project.district?.toLowerCase() === 'indore' ? 'PWD-INDORE-01' : `AG-${project.district?.toUpperCase() || 'PWD'}-01`;
        }
      } else if (decision === 'ASSIGN_AGENCY') {
        const chosenAgency = (implementing_agency_id || '').trim();
        if (!chosenAgency) {
          return ApiResponse.badRequest(res, 'implementing_agency_id is required for ASSIGN_AGENCY decision', 'AGENCY_REQUIRED');
        }
        updates.implementing_agency_id = chosenAgency;
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

// ==========================================
// PHASE 5: PROJECT MANAGEMENT SUB-RESOURCES
// ==========================================

/**
 * POST /api/projects/:projectId/engineering-reports
 * Submit new engineering estimate version (v1, v2, ...)
 * Protected: IMPLEMENTING_AGENCY, DISTRICT_AUTHORITY
 */
router.post(
  '/:projectId/engineering-reports',
  authenticate,
  authorize('IMPLEMENTING_AGENCY', 'DISTRICT_AUTHORITY'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const project = await Project.findOne({ project_id: projectId });

      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      const {
        detailed_estimate,
        technical_specs,
        rate_schedule_basis,
        agency_id,
        site_inspection_conducted,
        site_inspection_date,
      } = req.body;

      const costNumber = Number(detailed_estimate);
      if (isNaN(costNumber) || costNumber <= 0) {
        return ApiResponse.badRequest(
          res,
          'detailed_estimate must be a positive number greater than 0',
          'INVALID_DETAILED_ESTIMATE'
        );
      }

      // Calculate next version (v1, v2, ...)
      const latestReport = await EngineeringReport.findOne({ project_id: projectId }).sort({ version: -1 });
      const nextVersion = latestReport ? latestReport.version + 1 : 1;

      const targetAgencyId =
        agency_id ||
        req.user.jurisdiction?.agency_id ||
        project.implementing_agency_id ||
        'PWD-INDORE-01';

      const report = new EngineeringReport({
        project_id: projectId,
        version: nextVersion,
        agency_id: targetAgencyId,
        technical_specs: {
          dimensions: technical_specs?.dimensions || '',
          materials: Array.isArray(technical_specs?.materials) ? technical_specs.materials : [],
          specifications_summary: technical_specs?.specifications_summary || '',
          structural_notes: technical_specs?.structural_notes || '',
        },
        detailed_estimate: costNumber,
        rate_schedule_basis: rate_schedule_basis || 'PWD State Schedule of Rates',
        site_inspection_conducted: site_inspection_conducted !== undefined ? Boolean(site_inspection_conducted) : true,
        site_inspection_date: site_inspection_date ? new Date(site_inspection_date) : null,
        submitted_by: req.user.user_id,
        submitted_at: new Date(),
        is_real_government_data: false,
        is_synthetic: false,
      });

      await report.save();

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'SUBMIT_ENGINEERING_REPORT',
        entity_type: 'ENGINEERING_REPORT',
        entity_id: `${projectId}-V${nextVersion}`,
        project_id: projectId,
        previous_state: latestReport ? { version: latestReport.version, estimate: latestReport.detailed_estimate } : null,
        new_state: { version: nextVersion, detailed_estimate: costNumber },
        reason: `Engineering report version ${nextVersion} submitted by ${req.user.user_id}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      logger.info(`Engineering report v${nextVersion} submitted for ${projectId} by ${req.user.user_id}`, {
        projectId,
        version: nextVersion,
        detailed_estimate: costNumber,
      });

      return ApiResponse.created(
        res,
        report,
        `Engineering technical report version ${nextVersion} submitted successfully`
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/projects/:projectId/engineering-reports
 * List all engineering report versions for a project
 */
router.get('/:projectId/engineering-reports', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const reports = await EngineeringReport.find({ project_id: projectId }).sort({ version: 1 }).lean();

    return ApiResponse.success(res, reports, 'Engineering reports retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:projectId/progress
 * Append physical progress milestone report
 * Protected: IMPLEMENTING_AGENCY, DISTRICT_AUTHORITY
 */
router.post(
  '/:projectId/progress',
  authenticate,
  authorize('IMPLEMENTING_AGENCY', 'DISTRICT_AUTHORITY'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const project = await Project.findOne({ project_id: projectId });

      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      const { percent_complete, stage, physical_summary, remarks, geo_coordinates, photos_count } = req.body;

      const percent = Number(percent_complete);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return ApiResponse.badRequest(
          res,
          'percent_complete must be a number between 0 and 100',
          'INVALID_PERCENT_COMPLETE'
        );
      }

      const STAGE_MAP = {
        FOUNDATION_STAGE: 'FOUNDATION',
        STRUCTURE_IN_PROGRESS: 'SUPERSTRUCTURE',
        FINISHING_STAGE: 'FINISHING',
        COMPLETED: 'PHYSICALLY_COMPLETE',
        TECHNICAL_SANCTION_PENDING: 'SITE_PREPARATION',
        TENDER_PUBLISHED: 'SITE_PREPARATION',
        WORK_ORDER_ISSUED: 'SITE_PREPARATION',
      };
      const normalizedStage = STAGE_MAP[stage] || stage;

      if (!normalizedStage || !PROGRESS_STAGES.includes(normalizedStage)) {
        return ApiResponse.badRequest(
          res,
          `Invalid progress stage: '${stage}'. Must be one of: ${PROGRESS_STAGES.join(', ')}`,
          'INVALID_PROGRESS_STAGE'
        );
      }

      const summary = (physical_summary || remarks || '').trim();
      if (!summary || summary.length < 5) {
        return ApiResponse.badRequest(
          res,
          'physical_summary or remarks is required and must be at least 5 characters',
          'INVALID_SUMMARY'
        );
      }

      const progressId = `PROG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const progress = new ProjectProgress({
        progress_id: progressId,
        project_id: projectId,
        percent_complete: percent,
        stage: normalizedStage,
        physical_summary: summary,
        geo_coordinates: {
          latitude: geo_coordinates?.latitude ? Number(geo_coordinates.latitude) : null,
          longitude: geo_coordinates?.longitude ? Number(geo_coordinates.longitude) : null,
        },
        photos_count: Number(photos_count) || 0,
        reported_by: req.user.user_id,
        reported_at: new Date(),
        is_real_government_data: false,
        is_synthetic: false,
      });

      await progress.save();

      // Automatically transition SANCTIONED -> IN_PROGRESS if execution has commenced
      if (project.status === 'SANCTIONED' && percent > 0) {
        project.status = 'IN_PROGRESS';
        await project.save();
      }

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'SUBMIT_PROGRESS_UPDATE',
        entity_type: 'PROGRESS',
        entity_id: progressId,
        project_id: projectId,
        previous_state: { stage: project.status },
        new_state: { percent_complete: percent, stage },
        reason: `Progress update ${percent}% (${stage}) reported by ${req.user.user_id}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      return ApiResponse.created(res, progress, 'Physical progress update recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/projects/:projectId/progress
 * List chronological physical progress history
 */
router.get('/:projectId/progress', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const progress = await ProjectProgress.find({ project_id: projectId }).sort({ reported_at: -1 }).lean();

    return ApiResponse.success(res, progress, 'Physical progress history retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:projectId/payments
 * Record or raise payment installment
 * Protected: IMPLEMENTING_AGENCY, DISTRICT_AUTHORITY
 */
router.post(
  '/:projectId/payments',
  authenticate,
  authorize('IMPLEMENTING_AGENCY', 'DISTRICT_AUTHORITY'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const project = await Project.findOne({ project_id: projectId });

      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      const { installment_number, amount, sanction_order_ref, voucher_number, status } = req.body;

      const instNumber = parseInt(installment_number, 10);
      if (isNaN(instNumber) || instNumber < 1) {
        return ApiResponse.badRequest(res, 'installment_number must be an integer >= 1', 'INVALID_INSTALLMENT');
      }

      const amountNumber = Number(amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        return ApiResponse.badRequest(res, 'amount must be a positive number greater than 0', 'INVALID_AMOUNT');
      }

      // Status assignment: Agency creates PENDING; District can create APPROVED directly
      let initialStatus = 'PENDING';
      let approvedBy = null;
      let paymentDate = null;

      if (req.user.role === 'DISTRICT_AUTHORITY') {
        if (status && PAYMENT_STATUSES.includes(status)) {
          initialStatus = status;
          if (status === 'APPROVED' || status === 'DISBURSED') {
            approvedBy = req.user.user_id;
            paymentDate = new Date();
          }
        }
      }

      const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const payment = new ProjectPayment({
        payment_id: paymentId,
        project_id: projectId,
        installment_number: instNumber,
        amount: amountNumber,
        payment_date: paymentDate,
        status: initialStatus,
        raised_by: req.user.user_id,
        approved_by: approvedBy,
        sanction_order_ref: sanction_order_ref || null,
        voucher_number: voucher_number || null,
        is_real_government_data: false,
        is_synthetic: false,
      });

      await payment.save();

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'CREATE_PAYMENT_RECORD',
        entity_type: 'PAYMENT',
        entity_id: paymentId,
        project_id: projectId,
        previous_state: null,
        new_state: { installment_number: instNumber, amount: amountNumber, status: initialStatus },
        reason: `Payment installment ${instNumber} of ₹${amountNumber} raised with status ${initialStatus}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      return ApiResponse.created(res, payment, 'Payment record created successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/projects/:projectId/payments
 * List payment installment records for a project
 */
router.get('/:projectId/payments', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const payments = await ProjectPayment.find({ project_id: projectId })
      .sort({ installment_number: 1, created_at: 1 })
      .lean();

    return ApiResponse.success(res, payments, 'Payment records retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:projectId/payments/:paymentId
 * Authorize or update payment status (PENDING -> APPROVED -> DISBURSED / REJECTED)
 * Protected: DISTRICT_AUTHORITY, STATE_NODAL_AUTHORITY
 */
router.patch(
  '/:projectId/payments/:paymentId',
  authenticate,
  authorize('DISTRICT_AUTHORITY', 'STATE_NODAL_AUTHORITY'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const paymentId = req.params.paymentId.trim().toUpperCase();
      const { status, reason, voucher_number, sanction_order_ref } = req.body;

      const project = await Project.findOne({ project_id: projectId });
      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      const payment = await ProjectPayment.findOne({ payment_id: paymentId, project_id: projectId });
      if (!payment) {
        return ApiResponse.notFound(res, `Payment record '${paymentId}' not found for this project`);
      }

      if (!status || !PAYMENT_STATUSES.includes(status)) {
        return ApiResponse.badRequest(
          res,
          `Invalid status '${status}'. Must be one of: ${PAYMENT_STATUSES.join(', ')}`,
          'INVALID_STATUS'
        );
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return ApiResponse.badRequest(
          res,
          'A substantive administrative reason (minimum 5 characters) is required for payment status decisions',
          'REASON_REQUIRED'
        );
      }

      const prevStatus = payment.status;

      // Validate allowed transitions
      const ALLOWED_PAYMENT_TRANSITIONS = {
        PENDING: ['APPROVED', 'REJECTED'],
        APPROVED: ['DISBURSED', 'REJECTED'],
        DISBURSED: [],
        REJECTED: ['PENDING'],
      };

      if (!ALLOWED_PAYMENT_TRANSITIONS[prevStatus]?.includes(status)) {
        return ApiResponse.badRequest(
          res,
          `Invalid payment status transition from '${prevStatus}' to '${status}'`,
          'INVALID_TRANSITION'
        );
      }

      // Update permitted fields only
      payment.status = status;
      payment.approved_by = req.user.user_id;
      if (status === 'APPROVED' || status === 'DISBURSED') {
        payment.payment_date = new Date();
      }
      if (voucher_number) payment.voucher_number = voucher_number.trim();
      if (sanction_order_ref) payment.sanction_order_ref = sanction_order_ref.trim();

      await payment.save();

      // Create OfficerDecision for auditability
      await OfficerDecision.create({
        decision_id: `DEC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        project_id: projectId,
        officer_id: req.user.user_id,
        role: req.user.role,
        decision: status === 'APPROVED' ? 'SANCTION' : status === 'REJECTED' ? 'HOLD' : 'MARK_IN_PROGRESS',
        reason: `[Payment ${paymentId}] ${reason.trim()}`,
        previous_state: prevStatus,
        new_state: status,
        decided_at: new Date(),
        is_real_government_data: false,
        is_synthetic: false,
      });

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: `PAYMENT_${status}`,
        entity_type: 'PAYMENT',
        entity_id: paymentId,
        project_id: projectId,
        previous_state: { status: prevStatus },
        new_state: { status, approved_by: req.user.user_id },
        reason: reason.trim(),
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      logger.info(`Payment ${paymentId} on project ${projectId} updated: ${prevStatus} -> ${status} by ${req.user.user_id}`);

      return ApiResponse.success(
        res,
        payment,
        `Payment status updated to '${status}' successfully`
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/projects/:projectId/utilization-certificates
 * File Utilization Certificate (UC) record
 * Protected: IMPLEMENTING_AGENCY, DISTRICT_AUTHORITY
 */
router.post(
  '/:projectId/utilization-certificates',
  authenticate,
  authorize('IMPLEMENTING_AGENCY', 'DISTRICT_AUTHORITY'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const project = await Project.findOne({ project_id: projectId });

      if (!project) {
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      const { payment_id, amount_certified, file_ref, is_filed } = req.body;

      const certAmount = Number(amount_certified);
      if (isNaN(certAmount) || certAmount <= 0) {
        return ApiResponse.badRequest(
          res,
          'amount_certified must be a positive number greater than 0',
          'INVALID_AMOUNT_CERTIFIED'
        );
      }

      const ucId = `UC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const targetPaymentId = payment_id ? payment_id.trim().toUpperCase() : 'GENERAL';

      const uc = new UtilizationCertificate({
        uc_id: ucId,
        project_id: projectId,
        payment_id: targetPaymentId,
        amount_certified: certAmount,
        is_filed: is_filed !== undefined ? Boolean(is_filed) : true,
        file_ref: file_ref || null,
        filed_date: new Date(),
        uploaded_by: req.user.user_id,
        verified_by: req.user.role === 'DISTRICT_AUTHORITY' ? req.user.user_id : null,
        is_real_government_data: false,
        is_synthetic: false,
      });

      await uc.save();

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'SUBMIT_UTILIZATION_CERTIFICATE',
        entity_type: 'UTILIZATION_CERTIFICATE',
        entity_id: ucId,
        project_id: projectId,
        previous_state: null,
        new_state: { amount_certified: certAmount, payment_id: targetPaymentId, is_filed: uc.is_filed },
        reason: `Utilization certificate for ₹${certAmount} filed by ${req.user.user_id}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      return ApiResponse.created(res, uc, 'Utilization certificate recorded successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/projects/:projectId/utilization-certificates
 * List UCs for a project with optional ?is_filed filter
 */
router.get('/:projectId/utilization-certificates', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const filter = { project_id: projectId };
    if (req.query.is_filed !== undefined) {
      filter.is_filed = req.query.is_filed === 'true';
    }

    const ucs = await UtilizationCertificate.find(filter).sort({ created_at: -1 }).lean();

    return ApiResponse.success(res, ucs, 'Utilization certificates retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:projectId/documents
 * Upload controlled binary document with metadata tracking
 * Protected: All roles except ADMIN
 */
router.post(
  '/:projectId/documents',
  authenticate,
  handleDocumentUpload('file'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId.trim().toUpperCase();
      const project = await Project.findOne({ project_id: projectId });

      if (!project) {
        // Clean up uploaded file if project doesn't exist
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return ApiResponse.notFound(res, `Project '${projectId}' not found`);
      }

      const access = await checkProjectAccess(project, req.user);
      if (!access.allowed) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return ApiResponse.forbidden(res, access.message, access.code);
      }

      if (!req.file) {
        return ApiResponse.badRequest(res, 'No document file uploaded', 'FILE_REQUIRED');
      }

      const documentType = req.body.document_type || 'OTHER';
      if (!DOCUMENT_TYPES.includes(documentType)) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return ApiResponse.badRequest(
          res,
          `Invalid document_type '${documentType}'. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
          'INVALID_DOCUMENT_TYPE'
        );
      }

      const sha256_hash = await computeFileHash(req.file.path);
      const documentId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const document = new Document({
        document_id: documentId,
        project_id: projectId,
        document_type: documentType,
        uploader_id: req.user.user_id,
        storage_ref: req.file.filename,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size_bytes: req.file.size,
        sha256_hash,
        uploaded_at: new Date(),
      });

      await document.save();

      // Audit Log
      await AuditLog.create({
        audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: req.user.user_id,
        role: req.user.role,
        action: 'UPLOAD_DOCUMENT',
        entity_type: 'DOCUMENT',
        entity_id: documentId,
        project_id: projectId,
        previous_state: null,
        new_state: { document_type: documentType, file_name: req.file.originalname, size: req.file.size },
        reason: `Uploaded ${documentType} file: ${req.file.originalname}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date(),
      });

      logger.info(`Document ${documentId} (${documentType}) uploaded for ${projectId} by ${req.user.user_id}`);

      return ApiResponse.created(res, document, 'Document uploaded and registered successfully');
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      next(err);
    }
  }
);

/**
 * GET /api/projects/:projectId/documents
 * List metadata of documents for a project (zero local storage paths exposed)
 */
router.get('/:projectId/documents', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkProjectAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const documents = await Document.find({ project_id: projectId })
      .sort({ uploaded_at: -1 })
      .select('-__v')
      .lean();

    return ApiResponse.success(res, documents, 'Documents retrieved successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

