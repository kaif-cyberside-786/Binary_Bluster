/**
 * Agency Intelligence API Router
 * Endpoints for Implementing Agency registry, performance track record,
 * per-project suitability ranking with concentration guardrail, and systemic concentration analytics.
 * Express is the sole authorization boundary. Strict Admin Isolation enforced per rules.md §10.
 * Mounted at /api/agencies/...
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const agencyIntelligenceService = require('../services/agencyIntelligenceService');

const router = express.Router();

/**
 * Middleware to enforce strict Admin Isolation on agency intelligence
 * Admin accounts are prohibited from operational and risk telemetry per rules.md §10
 */
function enforceAdminIsolation(req, res, next) {
  if (req.user?.role === 'ADMIN') {
    return ApiResponse.forbidden(
      res,
      'Access denied: Admin isolation prohibits administrative accounts from accessing agency intelligence and performance data per rules.md §10',
      'ADMIN_ISOLATION'
    );
  }
  next();
}

/**
 * GET /api/agencies
 * List eligible implementing agencies for user's jurisdiction
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { jurisdiction, role } = req.user;
    const filter = {};

    if (role === 'DISTRICT_AUTHORITY' && jurisdiction?.district) {
      filter.district = jurisdiction.district;
    } else if (role === 'STATE_NODAL_AUTHORITY' && jurisdiction?.state) {
      filter.state = jurisdiction.state;
    } else if (req.query.district) {
      filter.district = req.query.district;
    }

    if (req.query.state) {
      filter.state = req.query.state;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const agencies = await agencyIntelligenceService.getAgencies(filter);
    return ApiResponse.success(res, agencies, 'Implementing agencies retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/agencies/suitability
 * Advisory suitability ranking for project parameters (District-facing)
 * Enforces concentration guardrail and Admin Isolation
 */
router.post('/suitability', authenticate, enforceAdminIsolation, async (req, res, next) => {
  try {
    const { category, estimated_cost, district, state } = req.body;
    const { jurisdiction, role } = req.user;

    // Default district/state from jurisdiction if not specified
    const targetDistrict =
      district ||
      (role === 'DISTRICT_AUTHORITY' ? jurisdiction?.district : null) ||
      'Indore';
    const targetState =
      state ||
      jurisdiction?.state ||
      'Madhya Pradesh';

    const result = await agencyIntelligenceService.calculateSuitability({
      category,
      estimated_cost,
      district: targetDistrict,
      state: targetState,
    });

    return ApiResponse.success(res, result, 'Agency suitability ranking calculated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agencies/concentration
 * Systemic work-share and Herfindahl concentration analytics (State/Ministry-facing)
 * Enforces Admin Isolation
 */
router.get('/concentration', authenticate, enforceAdminIsolation, async (req, res, next) => {
  try {
    const { jurisdiction, role } = req.user;
    const targetDistrict =
      req.query.district ||
      (role === 'DISTRICT_AUTHORITY' ? jurisdiction?.district : null) ||
      'Indore';
    const targetState =
      req.query.state ||
      jurisdiction?.state ||
      'Madhya Pradesh';
    const year = req.query.year || '2026';

    const result = await agencyIntelligenceService.calculateConcentration({
      district: targetDistrict,
      state: targetState,
      year,
    });

    return ApiResponse.success(res, result, 'Agency concentration analytics retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agencies/:id
 * Retrieve agency profile details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const agencyId = req.params.id;
    const agency = await agencyIntelligenceService.getAgencyProfile(agencyId);
    if (!agency) {
      return ApiResponse.notFound(res, `Implementing agency '${agencyId}' not found`);
    }
    return ApiResponse.success(res, agency, 'Agency profile retrieved successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agencies/:id/performance
 * Detailed agency performance track record (completion rate, delay, cost deviation, inspections)
 * Enforces Admin Isolation
 */
router.get('/:id/performance', authenticate, enforceAdminIsolation, async (req, res, next) => {
  try {
    const agencyId = req.params.id;
    const period = req.query.period || '2025-2026';

    const agency = await agencyIntelligenceService.getAgencyProfile(agencyId);
    if (!agency) {
      return ApiResponse.notFound(res, `Implementing agency '${agencyId}' not found`);
    }

    const performance = await agencyIntelligenceService.getAgencyPerformance(agencyId, period);
    return ApiResponse.success(
      res,
      {
        agency,
        performance,
      },
      'Agency performance record retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

