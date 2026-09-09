/**
 * AI Historical Intelligence Routes (Phase 8)
 * Exposes internal AI analysis trigger and findings retrieval.
 * Strict RBAC & Admin Isolation enforced per architecture.md §13 and rules.md §10, §12.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const aiOrchestrator = require('../services/aiOrchestrator');
const { Project, MpAllocation } = require('../models');

const router = express.Router({ mergeParams: true });

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
 * Access control helper for AI endpoints
 */
async function verifyProjectAiAccess(project, user) {
  const { role, jurisdiction, user_id } = user;

  // Strict Admin Isolation per rules.md §10 & design.md §5.32
  if (role === 'ADMIN') {
    return {
      allowed: false,
      code: 'ADMIN_ISOLATION',
      message: 'Access denied: Admin isolation prohibits access to AI risk findings per rules.md §10',
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
        message: 'Access denied: you may only view AI findings for your own constituency works',
      };
    }
  } else if (role === 'IMPLEMENTING_AGENCY') {
    const agencyDistrict = jurisdiction?.district;
    if (agencyDistrict && project.district?.toLowerCase() !== agencyDistrict.toLowerCase()) {
      return {
        allowed: false,
        code: 'FORBIDDEN_JURISDICTION',
        message: 'Access denied: project is outside your agency district jurisdiction',
      };
    }
  }

  // AUDITOR and MINISTRY have national read access across AI findings
  return { allowed: true };
}

/**
 * POST /api/projects/:projectId/ai/analyze
 * Trigger Phase 8 AI Historical Intelligence analysis
 */
router.post('/analyze', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await verifyProjectAiAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const result = await aiOrchestrator.analyzeProject(projectId, req.user);
    return ApiResponse.success(res, result, 'AI historical intelligence analysis evaluated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:projectId/ai/findings
 * Retrieve stored AI risk flags for a project
 */
router.get('/findings', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: projectId }).lean();

    if (!project) {
      return ApiResponse.notFound(res, `Project '${projectId}' not found`);
    }

    const access = await verifyProjectAiAccess(project, req.user);
    if (!access.allowed) {
      return ApiResponse.forbidden(res, access.message, access.code);
    }

    const flags = await aiOrchestrator.getProjectFlags(projectId);
    return ApiResponse.success(
      res,
      {
        project_id: projectId,
        flags: flags || [],
        count: flags.length,
      },
      'AI risk findings retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.verifyProjectAiAccess = verifyProjectAiAccess;
module.exports.resolveMpId = resolveMpId;

