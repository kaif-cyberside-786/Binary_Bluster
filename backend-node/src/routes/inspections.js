/**
 * Field Verification & Inspection Queue Routes (Phase 13)
 * Provides authenticated, role-guarded endpoints for inspection queue management,
 * lifecycle state transitions, officer assignment, scheduling, result recording, and quota tracking.
 * Strictly enforces Admin Isolation (403 ADMIN_ISOLATION) and jurisdiction boundaries.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const inspectionQueueService = require('../services/inspectionQueueService');
const { Inspection, Project, Document } = require('../models');

const router = express.Router();

// Helper to handle service errors
function handleServiceError(err, res, next) {
  if (err.code === 'ADMIN_ISOLATION') {
    return ApiResponse.forbidden(res, err.message, 'ADMIN_ISOLATION');
  }
  if (err.code === 'FORBIDDEN_JURISDICTION') {
    return ApiResponse.forbidden(res, err.message, 'FORBIDDEN_JURISDICTION');
  }
  if (err.code === 'FORBIDDEN_ROLE') {
    return ApiResponse.forbidden(res, err.message, 'FORBIDDEN_ROLE');
  }
  if (err.code === 'UNAUTHENTICATED') {
    return ApiResponse.unauthorized(res, err.message, 'UNAUTHENTICATED');
  }
  if (err.code === 'INSPECTION_NOT_FOUND' || err.code === 'PROJECT_NOT_FOUND') {
    return ApiResponse.notFound(res, err.message, err.code);
  }
  if (err.code === 'INVALID_STATE_TRANSITION') {
    return ApiResponse.conflict(res, err.message, 'INVALID_STATE_TRANSITION');
  }
  if (err.code === 'INVALID_RESULT' || err.code === 'OFFICER_REQUIRED' || err.code === 'INVALID_DATE') {
    return ApiResponse.badRequest(res, err.message, err.code);
  }
  next(err);
}

/**
 * GET /api/inspections
 * Retrieve prioritized, risk-ranked inspection candidate queue
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const queue = await inspectionQueueService.buildInspectionQueue({
      jurisdiction: req.user.jurisdiction,
      filters: req.query,
      user: req.user,
    });
    return ApiResponse.success(res, queue, 'Inspection queue retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/inspections/quota
 * Retrieve statutory physical inspection quota statistics
 */
router.get('/quota', authenticate, async (req, res, next) => {
  try {
    const quota = await inspectionQueueService.quotaStats({
      level: req.query.level || (req.user.role === 'STATE_NODAL_AUTHORITY' ? 'STATE' : 'DISTRICT'),
      state: req.query.state || req.user.jurisdiction?.state,
      district: req.query.district || req.user.jurisdiction?.district,
      year: req.query.year,
      user: req.user,
    });
    return ApiResponse.success(res, quota, 'Statutory quota statistics retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * POST /api/inspections/recommend
 * Recommend an inspection for a project (creates or updates recommendation)
 */
router.post('/recommend', authenticate, async (req, res, next) => {
  try {
    const { project_id, source, reason, priority, remarks } = req.body;
    if (!project_id) {
      return ApiResponse.badRequest(res, 'project_id is required', 'PROJECT_ID_REQUIRED');
    }

    const result = await inspectionQueueService.recommendInspection(
      project_id,
      source || 'OFFICER_RECOMMENDATION',
      req.user,
      { reason, priority, remarks }
    );

    const statusCode = result.is_duplicate ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      message: result.message,
      data: result.inspection,
      is_duplicate: result.is_duplicate,
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/inspections/:inspectionId
 * Retrieve detailed inspection record with project context & evidence documents
 */
router.get('/:inspectionId', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits access to inspection business data per rules.md §10',
        'ADMIN_ISOLATION'
      );
    }

    const inspectionId = req.params.inspectionId.trim().toUpperCase();
    const inspection = await Inspection.findOne({ inspection_id: inspectionId }).lean();

    if (!inspection) {
      return ApiResponse.notFound(res, `Inspection '${inspectionId}' not found`, 'INSPECTION_NOT_FOUND');
    }

    // Cross-jurisdiction verification
    if (req.user.role === 'DISTRICT_AUTHORITY') {
      const userDistrict = (req.user.jurisdiction?.district || '').toLowerCase();
      const inspDistrict = (inspection.district || '').toLowerCase();
      if (userDistrict && inspDistrict && userDistrict !== inspDistrict) {
        return ApiResponse.forbidden(
          res,
          `Access denied: inspection belongs to ${inspection.district} District, outside your jurisdiction (${req.user.jurisdiction?.district})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    }

    const project = await Project.findOne({ project_id: inspection.project_id }).lean();
    let evidenceDocs = [];
    if (inspection.evidence_document_ids && inspection.evidence_document_ids.length > 0) {
      evidenceDocs = await Document.find({ document_id: { $in: inspection.evidence_document_ids } }).lean();
    }

    return ApiResponse.success(
      res,
      {
        inspection,
        project,
        evidence_documents: evidenceDocs,
      },
      'Inspection details retrieved successfully'
    );
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * PATCH /api/inspections/:inspectionId/assign
 * Assign an authorized field inspection officer
 */
router.patch('/:inspectionId/assign', authenticate, async (req, res, next) => {
  try {
    const { assigned_officer_id, assigned_officer_name } = req.body;
    const updated = await inspectionQueueService.assignInspection(
      req.params.inspectionId,
      assigned_officer_id,
      assigned_officer_name,
      req.user
    );
    return ApiResponse.success(res, updated, 'Field officer assigned successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * PATCH /api/inspections/:inspectionId/status
 * Transition lifecycle status (e.g. Schedule, Start In-Progress, Complete)
 */
router.patch('/:inspectionId/status', authenticate, async (req, res, next) => {
  try {
    const { status, scheduled_date, notes, findings_summary, reason } = req.body;

    if (!status) {
      return ApiResponse.badRequest(res, 'Target status is required', 'STATUS_REQUIRED');
    }

    let updated;
    if (status === 'SCHEDULED') {
      updated = await inspectionQueueService.scheduleInspection(
        req.params.inspectionId,
        scheduled_date,
        req.user,
        notes || reason
      );
    } else {
      updated = await inspectionQueueService.transitionInspection(
        req.params.inspectionId,
        status,
        req.user,
        { findings_summary, reason }
      );
    }

    return ApiResponse.success(res, updated, `Inspection status transitioned to '${status}' successfully`);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * POST /api/inspections/:inspectionId/result
 * Record official inspection result (NO_ISSUE, REVIEW_REQUIRED, ESCALATE)
 */
router.post('/:inspectionId/result', authenticate, async (req, res, next) => {
  try {
    const { result, findings, evidence_document_ids, remarks } = req.body;
    if (!result) {
      return ApiResponse.badRequest(res, 'Inspection result is required', 'RESULT_REQUIRED');
    }

    const updated = await inspectionQueueService.recordResult(
      req.params.inspectionId,
      result,
      findings,
      evidence_document_ids,
      req.user,
      { remarks }
    );

    return ApiResponse.success(res, updated, `Inspection result recorded as '${result}' successfully`);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

module.exports = router;

