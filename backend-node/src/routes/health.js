/**
 * Health check route
 * Endpoint: GET /api/health
 */
const express = require('express');
const { getDatabaseStatus } = require('../config/db');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

router.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    platform: 'MPLADS AI Risk Monitoring & Decision Support Platform',
    version: '1.0.0',
    phase: 'Phase 1 - Foundation & Portal Shell',
    environment: config.env,
    database: getDatabaseStatus(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return ApiResponse.success(res, healthData, 'System is healthy and operational');
});

module.exports = router;

