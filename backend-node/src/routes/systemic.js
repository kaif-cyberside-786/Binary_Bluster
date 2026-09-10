/**
 * Systemic Intelligence & Portfolio Analytics Routes (Phase 14)
 * Provides authenticated, role-guarded endpoints for Ministry and State
 * portfolio-level monitoring, geographic rollups, category patterns,
 * systemic agency concentration, inspection health, and supervisory attention lists.
 * Strictly enforces Admin Isolation (403 ADMIN_ISOLATION) and jurisdiction boundaries.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const systemicIntelligenceService = require('../services/systemicIntelligenceService');

const router = express.Router();

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
  next(err);
}

/**
 * GET /api/systemic/overview
 * National/State consolidated portfolio overview with Value-at-Risk metrics
 */
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const overview = await systemicIntelligenceService.getPortfolioOverview({
      user: req.user,
      filters: req.query,
    });
    return ApiResponse.success(res, overview, 'Portfolio overview retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/systemic/geographic
 * Geographic breakdown (State-by-State for Ministry, District-by-District for State)
 */
router.get('/geographic', authenticate, async (req, res, next) => {
  try {
    const geographic = await systemicIntelligenceService.getGeographicBreakdown({
      user: req.user,
      filters: req.query,
    });
    return ApiResponse.success(res, geographic, 'Geographic breakdown retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/systemic/categories
 * Sectoral patterns, risk distribution, and outlays across canonical categories
 */
router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const categories = await systemicIntelligenceService.getCategoryPatterns({
      user: req.user,
      filters: req.query,
    });
    return ApiResponse.success(res, categories, 'Category patterns retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/systemic/agency-concentration
 * Systemic agency market share, HHI index, and concentration flags (separate from suitability)
 */
router.get('/agency-concentration', authenticate, async (req, res, next) => {
  try {
    const concentration = await systemicIntelligenceService.getAgencyConcentrationSystemic({
      user: req.user,
      filters: req.query,
    });
    return ApiResponse.success(res, concentration, 'Systemic agency concentration retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/systemic/inspections
 * Inspection system health, canonical 7-stage lifecycle tally, and State 1% quota progress
 */
router.get('/inspections', authenticate, async (req, res, next) => {
  try {
    const inspectionHealth = await systemicIntelligenceService.getInspectionSystemHealth({
      user: req.user,
      filters: req.query,
    });
    return ApiResponse.success(res, inspectionHealth, 'Inspection system health retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

/**
 * GET /api/systemic/attention
 * Supervisory attention list ranked by transparent multi-factor formula
 */
router.get('/attention', authenticate, async (req, res, next) => {
  try {
    const attention = await systemicIntelligenceService.getAttentionList({
      user: req.user,
      filters: req.query,
      limit: req.query.limit,
    });
    return ApiResponse.success(res, attention, 'Systemic attention list retrieved successfully');
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

module.exports = router;

