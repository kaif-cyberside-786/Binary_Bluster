/**
 * Main API router
 * Mounts domain routers under /api/*
 */
const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const adminUserRoutes = require('./adminUsers');
const allocationRoutes = require('./allocations');
const projectRoutes = require('./projects');
const dashboardRoutes = require('./dashboard');
const userPreferenceRoutes = require('./userPreferences');

const router = express.Router();

// Mount health check
router.use('/', healthRoutes);

// Mount authentication routes (/api/auth/...)
router.use('/auth', authRoutes);

// Mount admin user management routes (/api/admin/users/...)
router.use('/admin/users', adminUserRoutes);

// Mount allocation routes (/api/allocations/...)
router.use('/allocations', allocationRoutes);

// Mount project lifecycle routes (/api/projects/...)
router.use('/projects', projectRoutes);

// Mount dashboard routes (/api/dashboard/...)
router.use('/dashboard', dashboardRoutes);

// Mount user preferences routes (/api/user/preferences/...)
router.use('/user/preferences', userPreferenceRoutes);

module.exports = router;
