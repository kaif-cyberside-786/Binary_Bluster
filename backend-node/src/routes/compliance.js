/**
 * Compliance API Router
 * Routes for deterministic compliance monitoring, evaluation, and statutory quota checks.
 * Express is the sole authorization boundary. Strict Admin Isolation enforced.
 * Mounted at /api/compliance/...
 */
const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const {
  Project,
  ComplianceFinding,
  AuditLog,
  MpAllocation,
} = require('../models');
const {
  evaluateProject,
  evaluateMpScStStatus,
} = require('../services/compliance');

const router = express.Router();

/**
 * Access control helper for compliance queries
 */
async function checkComplianceAccess(project, user) {
  const { role, jurisdiction, user_id } = user;

  if (role === 'ADMIN') {
    return {
      allowed: false,
      code: 'ADMIN_ISOLATION',
      message: 'Access denied: Admin isolation prohibits access to compliance data per rules.md §10',
    };
  }

  if (role === 'DISTRICT_AUTHORITY') {
    if (project.district?.toLowerCase() !== jurisdiction?.district?.toLowerCase()) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: `Access denied: project is in ${project.district} District, outside your jurisdiction (${jurisdiction?.district})`,
      };
    }
  } else if (role === 'STATE_NODAL_AUTHORITY') {
    if (project.state?.toLowerCase() !== jurisdiction?.state?.toLowerCase()) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: `Access denied: project is in ${project.state}, outside your jurisdiction (${jurisdiction?.state})`,
      };
    }
  } else if (role === 'MP') {
    let mpId = user_id;
    const allocation = await MpAllocation.findOne({
      state: new RegExp(`^${jurisdiction?.state}$`, 'i'),
      constituency: new RegExp(`^${jurisdiction?.constituency}$`, 'i'),
    }).lean();
    if (allocation) mpId = allocation.mp_id;

    if (project.mp_id !== mpId && project.mp_id !== user_id) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: 'Access denied: you may only view compliance for your own recommendations',
      };
    }
  } else if (role === 'IMPLEMENTING_AGENCY') {
    const agencyDistrict =
      jurisdiction?.district ||
      (user_id?.includes('IND') || jurisdiction?.agency_id?.includes('INDORE') ? 'Indore' : null);

    if (agencyDistrict && project.district && project.district.toLowerCase() !== agencyDistrict.toLowerCase()) {
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
 * POST /api/compliance/evaluate/:projectId
 * Triggers deterministic rule evaluation on a project and returns fresh findings
 */
router.post('/evaluate/:projectId', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits evaluating compliance findings',
        'ADMIN_ISOLATION'
      );
    }

    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId });

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkComplianceAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const evaluation = await evaluateProject(projectId, req.user);

    // Record AuditLog
    await AuditLog.create({
      audit_id: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      user_id: req.user.user_id,
      role: req.user.role,
      action: 'EVALUATE_COMPLIANCE',
      entity_type: 'PROJECT',
      entity_id: projectId,
      project_id: projectId,
      previous_state: null,
      new_state: {
        overall_status: evaluation.overall_status,
        summary: evaluation.summary,
      },
      reason: `Deterministic compliance evaluated: ${evaluation.overall_status}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      timestamp: new Date(),
    });

    return ApiResponse.success(res, evaluation, 'Project compliance evaluated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/compliance/project/:projectId
 * Get current compliance findings and overall status for a project
 */
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits viewing compliance findings',
        'ADMIN_ISOLATION'
      );
    }

    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await checkComplianceAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    let findings = await ComplianceFinding.find({ project_id: projectId }).sort({ rule_id: 1 }).lean();

    // If no findings exist yet, run on-demand evaluation
    if (findings.length === 0) {
      const evaluation = await evaluateProject(projectId, req.user);
      return ApiResponse.success(res, evaluation, 'Project compliance evaluated successfully');
    }

    // Roll up overall status
    let overallStatus = 'COMPLIANT';
    let nonCompliantCount = 0;
    let reviewRequiredCount = 0;
    let compliantCount = 0;

    for (const f of findings) {
      if (f.status === 'NON_COMPLIANT') {
        overallStatus = 'NON_COMPLIANT';
        nonCompliantCount++;
      } else if (f.status === 'REVIEW_REQUIRED') {
        if (overallStatus !== 'NON_COMPLIANT') {
          overallStatus = 'REVIEW_REQUIRED';
        }
        reviewRequiredCount++;
      } else {
        compliantCount++;
      }
    }

    return ApiResponse.success(
      res,
      {
        project_id: projectId,
        overall_status: overallStatus,
        summary: {
          compliant_count: compliantCount,
          review_required_count: reviewRequiredCount,
          non_compliant_count: nonCompliantCount,
          total_rules: findings.length,
        },
        findings,
        evaluated_at: findings[0]?.evaluated_at || new Date(),
      },
      'Project compliance retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

// Alias for plural projects endpoint per spec
router.get('/projects/:projectId', authenticate, async (req, res, next) => {
  req.url = `/project/${req.params.projectId}`;
  return router.handle(req, res, next);
});

/**
 * GET /api/compliance/mp & /api/compliance/mp/:mpId & /api/compliance/sc-st-status/:mpId
 * Returns SC/ST statutory quota compliance tracking for an MP
 */
router.get(['/mp', '/mp/:mpId', '/sc-st-status/:mpId'], authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits viewing quota compliance',
        'ADMIN_ISOLATION'
      );
    }

    let requestedMpId = req.params.mpId ? req.params.mpId.trim().toUpperCase() : null;

    // If no mpId in param (e.g. GET /api/compliance/mp), resolve for caller
    if (!requestedMpId) {
      if (req.user.role === 'MP') {
        requestedMpId = req.user.user_id;
      } else {
        return ApiResponse.badRequest(res, 'mpId parameter is required for non-MP roles', 'MP_ID_REQUIRED');
      }
    }

    // Scoping check for MP role
    if (req.user.role === 'MP') {
      let ownMpId = req.user.user_id;
      const alloc = await MpAllocation.findOne({
        state: new RegExp(`^${req.user.jurisdiction?.state}$`, 'i'),
        constituency: new RegExp(`^${req.user.jurisdiction?.constituency}$`, 'i'),
      }).lean();
      if (alloc) ownMpId = alloc.mp_id;

      if (requestedMpId !== ownMpId && requestedMpId !== req.user.user_id) {
        return ApiResponse.forbidden(
          res,
          'Access denied: you may only inspect your own SC/ST quota status',
          'FORBIDDEN_JURISDICTION'
        );
      }
    }

    const scStStatus = await evaluateMpScStStatus(requestedMpId, req.user);
    return ApiResponse.success(res, scStStatus, 'SC/ST quota compliance status retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/compliance/district
 * Returns review queue of non-compliant and review-required projects in district jurisdiction
 */
router.get('/district', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits viewing compliance telemetry',
        'ADMIN_ISOLATION'
      );
    }

    const { role, jurisdiction, user_id } = req.user;
    const projectFilter = {};

    if (role === 'DISTRICT_AUTHORITY') {
      projectFilter.district = new RegExp(`^${jurisdiction?.district}$`, 'i');
    } else if (role === 'IMPLEMENTING_AGENCY') {
      const agencyDistrict = jurisdiction?.district || (user_id?.includes('IND') ? 'Indore' : null);
      if (agencyDistrict) projectFilter.district = new RegExp(`^${agencyDistrict}$`, 'i');
    } else if (role === 'STATE_NODAL_AUTHORITY') {
      projectFilter.state = new RegExp(`^${jurisdiction?.state}$`, 'i');
    }

    const projects = await Project.find(projectFilter)
      .select('project_id district state category title status sanctioned_cost estimated_cost')
      .lean();
    const projectIds = projects.map((p) => p.project_id);

    const findings = await ComplianceFinding.find({
      project_id: { $in: projectIds },
      status: { $in: ['NON_COMPLIANT', 'REVIEW_REQUIRED'] },
    })
      .sort({ severity: -1, evaluated_at: -1 })
      .lean();

    const projectMap = new Map();
    for (const p of projects) {
      projectMap.set(p.project_id, p);
    }

    const queue = findings.map((f) => {
      const prj = projectMap.get(f.project_id);
      return {
        ...f,
        project_title: prj?.title || 'Unknown Title',
        category: prj?.category,
        project_status: prj?.status,
        cost: prj?.sanctioned_cost || prj?.estimated_cost,
      };
    });

    return ApiResponse.success(
      res,
      {
        total_flagged_items: queue.length,
        items: queue,
      },
      'District compliance queue retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/compliance/dashboard
 * Returns jurisdiction-scoped compliance metrics across projects
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits viewing compliance telemetry',
        'ADMIN_ISOLATION'
      );
    }

    const { role, jurisdiction, user_id } = req.user;
    const projectFilter = {};

    if (role === 'DISTRICT_AUTHORITY') {
      projectFilter.district = new RegExp(`^${jurisdiction?.district}$`, 'i');
    } else if (role === 'STATE_NODAL_AUTHORITY') {
      projectFilter.state = new RegExp(`^${jurisdiction?.state}$`, 'i');
    } else if (role === 'MP') {
      let mpId = user_id;
      const alloc = await MpAllocation.findOne({
        state: new RegExp(`^${jurisdiction?.state}$`, 'i'),
        constituency: new RegExp(`^${jurisdiction?.constituency}$`, 'i'),
      }).lean();
      if (alloc) mpId = alloc.mp_id;
      projectFilter.$or = [{ mp_id: mpId }, { mp_id: user_id }];
    } else if (role === 'IMPLEMENTING_AGENCY') {
      const agencyDistrict = jurisdiction?.district || (user_id?.includes('IND') ? 'Indore' : null);
      if (agencyDistrict) {
        projectFilter.district = new RegExp(`^${agencyDistrict}$`, 'i');
      }
    }

    // Find scoped projects
    const projects = await Project.find(projectFilter).select('project_id district state category title status sanctioned_cost estimated_cost').lean();
    const projectIds = projects.map((p) => p.project_id);

    // Find findings for these projects
    const findings = await ComplianceFinding.find({ project_id: { $in: projectIds } }).lean();

    // Group findings by project
    const findingsByProject = new Map();
    for (const f of findings) {
      if (!findingsByProject.has(f.project_id)) {
        findingsByProject.set(f.project_id, []);
      }
      findingsByProject.get(f.project_id).push(f);
    }

    let compliantCount = 0;
    let reviewRequiredCount = 0;
    let nonCompliantCount = 0;
    let unevaluatedCount = 0;

    const findingsByRule = {
      REQUIRED_FIELDS: 0,
      DOC_COMPLETENESS: 0,
      UC_OVERDUE: 0,
      PAYMENT_PROGRESS_MISMATCH: 0,
      COST_DRIFT: 0,
      STALLED_PROGRESS: 0,
    };

    const projectComplianceMap = {};

    for (const p of projects) {
      const pFindings = findingsByProject.get(p.project_id);
      if (!pFindings || pFindings.length === 0) {
        unevaluatedCount++;
        projectComplianceMap[p.project_id] = 'COMPLIANT'; // default baseline until evaluated
        compliantCount++;
        continue;
      }

      let pStatus = 'COMPLIANT';
      for (const f of pFindings) {
        if (f.status === 'NON_COMPLIANT') {
          pStatus = 'NON_COMPLIANT';
          if (findingsByRule[f.rule_id] !== undefined) findingsByRule[f.rule_id]++;
        } else if (f.status === 'REVIEW_REQUIRED') {
          if (pStatus !== 'NON_COMPLIANT') pStatus = 'REVIEW_REQUIRED';
          if (findingsByRule[f.rule_id] !== undefined) findingsByRule[f.rule_id]++;
        }
      }

      projectComplianceMap[p.project_id] = pStatus;
      if (pStatus === 'NON_COMPLIANT') nonCompliantCount++;
      else if (pStatus === 'REVIEW_REQUIRED') reviewRequiredCount++;
      else compliantCount++;
    }

    // Recent flagged findings
    const recentFlagged = findings
      .filter((f) => f.status === 'NON_COMPLIANT' || f.status === 'REVIEW_REQUIRED')
      .sort((a, b) => new Date(b.evaluated_at) - new Date(a.evaluated_at))
      .slice(0, 10);

    return ApiResponse.success(
      res,
      {
        total_projects: projects.length,
        compliant_count: compliantCount,
        review_required_count: reviewRequiredCount,
        non_compliant_count: nonCompliantCount,
        unevaluated_count: unevaluatedCount,
        findings_by_rule: findingsByRule,
        project_compliance: projectComplianceMap,
        recent_flagged_findings: recentFlagged,
      },
      'Compliance dashboard statistics retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

