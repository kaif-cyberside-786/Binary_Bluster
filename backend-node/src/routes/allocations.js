/**
 * MP Allocation Routes
 * Endpoint: /api/allocations
 * Minimal read-only routes to verify data model and real allocation loader per Phase 3 scope.
 */
const express = require('express');
const { MpAllocation } = require('../models/MpAllocation');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

/**
 * GET /api/allocations
 * Retrieves paginated list of MP allocations with optional filtering by state/search
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.state) {
      filter.state = new RegExp(`^${req.query.state.trim()}$`, 'i');
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { mp_name: searchRegex },
        { constituency: searchRegex },
        { mp_id: searchRegex },
      ];
    }
    if (req.query.year) {
      filter.year = req.query.year.trim();
    }

    const [allocations, total] = await Promise.all([
      MpAllocation.find(filter)
        .sort({ state: 1, constituency: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MpAllocation.countDocuments(filter),
    ]);

    return ApiResponse.success(
      res,
      {
        allocations,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      'Allocations retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/allocations/:mpId
 * Retrieves specific allocation by MP ID
 */
router.get('/:mpId', async (req, res, next) => {
  try {
    const cleanMpId = req.params.mpId.trim().toUpperCase();
    const allocation = await MpAllocation.findOne({
      mp_id: cleanMpId,
    }).lean();

    if (!allocation) {
      return ApiResponse.notFound(
        res,
        `Allocation record not found for MP identifier '${cleanMpId}'`,
        'ALLOCATION_NOT_FOUND'
      );
    }

    return ApiResponse.success(res, allocation, 'Allocation record retrieved');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

