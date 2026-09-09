/**
 * Risk Engine & Explainable AI Routes (Phase 9)
 * Exposes project-level combined risk assessment, contributors breakdown,
 * historical evaluation timeline, and synchronous risk analysis trigger.
 * Strict RBAC & Admin Isolation enforced per architecture.md §13 and rules.md §10, §12.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const aiOrchestrator = require('../services/aiOrchestrator');
const { verifyProjectAiAccess } = require('./ai');
const { Project } = require('../models');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/projects/:projectId/risk
 * Retrieve the current combined risk score and explainability breakdown
 */
router.get('/', authenticate, async (req, res, next) => {
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

    const currentRisk = await aiOrchestrator.getProjectRisk(projectId);
    if (!currentRisk) {
      return ApiResponse.success(
        res,
        {
          project_id: projectId,
          evaluated: false,
          score: null,
          level: null,
          signals: {},
          top_contributors: [],
          explanation: 'No risk evaluation recorded yet. Run analysis to evaluate signals.',
          ai_status: 'AI_ANALYSIS_PENDING',
        },
        'Risk assessment pending evaluation'
      );
    }

    return ApiResponse.success(
      res,
      {
        project_id: projectId,
        evaluated: true,
        score: currentRisk.overall_score,
        level: currentRisk.risk_level,
        signals: currentRisk.component_scores || currentRisk.signals || {},
        top_contributors: currentRisk.top_contributors || [],
        explanation: currentRisk.explanation || '',
        ai_status: currentRisk.ai_status || 'AI_ANALYSIS_COMPLETE',
        analysis_id: currentRisk.analysis_id,
        calculated_at: currentRisk.computed_at,
      },
      'Current project risk score retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:projectId/risk/history
 * Retrieve chronological historical risk evaluations
 */
router.get('/history', authenticate, async (req, res, next) => {
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

    const history = await aiOrchestrator.getProjectRiskHistory(projectId);
    return ApiResponse.success(
      res,
      {
        project_id: projectId,
        history: history || [],
        count: history ? history.length : 0,
      },
      'Project risk history timeline retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:projectId/risk/flags
 * Retrieve individual findings stored in ai_risk_flags
 */
router.get('/flags', authenticate, async (req, res, next) => {
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
        count: flags ? flags.length : 0,
      },
      'Project risk flags retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:projectId/risk/analyze
 * Synchronously triggers full Phase 9 risk evaluation and persistence
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
    return ApiResponse.success(res, result, 'Risk engine evaluation completed successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

