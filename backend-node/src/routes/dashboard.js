/**
 * Role-Based Dashboard Aggregation Routes
 * Delivers role-appropriate metrics, financial summaries, and workflow queues
 * Enforces rules.md §10, §17:
 * - Express is the authorization boundary.
 * - Admin isolation strictly enforced (telemetry + user stats only).
 * - mp_attention_scores is a derived runtime aggregation, never a stored collection.
 */
const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const {
  Project,
  MpAllocation,
  OfficerDecision,
  AuditLog,
  Inspection,
  User,
  AiRiskScore,
} = require('../models');

const router = express.Router();

/**
 * GET /api/dashboard/mp
 * MP Constituency Dashboard
 * Protected: MP role only
 */
router.get('/mp', authenticate, authorize('MP'), async (req, res, next) => {
  try {
    const { user_id, jurisdiction } = req.user;
    const state = jurisdiction?.state || 'Madhya Pradesh';
    const constituency = jurisdiction?.constituency || 'Indore';

    // 1. Fetch MP Allocation from mp_allocation
    let allocation = await MpAllocation.findOne({
      constituency: new RegExp(`^${constituency}$`, 'i'),
      state: new RegExp(`^${state}$`, 'i'),
    }).lean();

    if (!allocation) {
      allocation = await MpAllocation.findOne({ mp_id: user_id }).lean();
    }

    const mpId = allocation?.mp_id || user_id;

    // 2. Aggregate MP's projects
    const mpProjects = await Project.find({
      $or: [{ mp_id: mpId }, { mp_id: user_id }],
    }).lean();

    const counts = {
      total: mpProjects.length,
      recommended: mpProjects.filter((p) => p.status === 'MP_RECOMMENDED').length,
      district_review: mpProjects.filter((p) => p.status === 'DISTRICT_REVIEW').length,
      sanctioned: mpProjects.filter((p) => p.status === 'SANCTIONED').length,
      in_progress: mpProjects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: mpProjects.filter((p) => p.status === 'COMPLETED').length,
      clarification_required: mpProjects.filter((p) => p.status === 'CLARIFICATION_REQUIRED').length,
      held: mpProjects.filter((p) => p.status === 'HELD').length,
    };

    const financial = {
      allocated_amount: allocation?.allocated_amount || 147000000.0,
      annual_entitlement: 50000000.0, // ₹5.00 Crore statutory per year
      total_estimated_cost: mpProjects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0),
      total_sanctioned_cost: mpProjects
        .filter((p) => ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status))
        .reduce((sum, p) => sum + (p.sanctioned_cost || p.estimated_cost || 0), 0),
    };

    // Calculate completion rate
    const completionRate = counts.total > 0
      ? Math.round((counts.completed / counts.total) * 100)
      : 0;

    // 3. Derived mp_attention_scores (rules.md §17: Runtime aggregation, never stored)
    const attentionProjects = mpProjects.filter(
      (p) => p.status === 'CLARIFICATION_REQUIRED' || p.status === 'HELD' || p.is_escalated
    );

    // Look for any high risk scores associated with MP's projects
    const projectIds = mpProjects.map((p) => p.project_id);
    const highRiskScores = await AiRiskScore.find({
      project_id: { $in: projectIds },
      risk_level: { $in: ['HIGH', 'CRITICAL'] },
    }).lean();

    const highRiskProjectIds = new Set(highRiskScores.map((r) => r.project_id));
    const allAttentionItems = mpProjects
      .filter((p) => attentionProjects.some((ap) => ap.project_id === p.project_id) || highRiskProjectIds.has(p.project_id))
      .map((p) => ({
        project_id: p.project_id,
        title: p.title,
        category: p.category,
        status: p.status,
        reason: p.status === 'CLARIFICATION_REQUIRED'
          ? 'District Authority requested technical/cost clarification'
          : p.status === 'HELD'
          ? 'Recommendation currently held by District Collector'
          : highRiskProjectIds.has(p.project_id)
          ? 'AI risk indicator flagged for review'
          : 'Status attention flagged',
      }));

    const derivedAttention = {
      attention_count: allAttentionItems.length,
      items: allAttentionItems,
      high_risk_count: highRiskScores.length,
      clarification_count: counts.clarification_required,
      held_count: counts.held,
    };

    // 4. Latest 5 recommendations
    const recentRecommendations = mpProjects
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return ApiResponse.success(
      res,
      {
        mp_info: {
          mp_id: mpId,
          mp_name: allocation?.mp_name || req.user.full_name,
          constituency,
          state,
          year: allocation?.year || '2024-2025',
          is_real_government_data: allocation?.is_real_government_data || false,
        },
        counts,
        financial,
        completion_rate: completionRate,
        derived_attention: derivedAttention,
        recent_recommendations: recentRecommendations,
      },
      'MP Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/district
 * District Authority Dashboard & Pending Review Queue
 * Protected: DISTRICT_AUTHORITY role only
 */
router.get('/district', authenticate, authorize('DISTRICT_AUTHORITY'), async (req, res, next) => {
  try {
    const { jurisdiction } = req.user;
    const district = jurisdiction?.district || 'Indore';
    const state = jurisdiction?.state || 'Madhya Pradesh';

    const districtFilter = { district: new RegExp(`^${district}$`, 'i') };

    // Fetch all projects in this district
    const projects = await Project.find(districtFilter).lean();

    const counts = {
      total: projects.length,
      pending_review: projects.filter((p) => p.status === 'DISTRICT_REVIEW').length,
      sanctioned: projects.filter((p) => p.status === 'SANCTIONED').length,
      in_progress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      clarification_or_held: projects.filter((p) => ['CLARIFICATION_REQUIRED', 'HELD'].includes(p.status)).length,
    };

    const financial = {
      pending_estimated_cost: projects
        .filter((p) => p.status === 'DISTRICT_REVIEW')
        .reduce((sum, p) => sum + (p.estimated_cost || 0), 0),
      total_sanctioned_cost: projects
        .filter((p) => ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status))
        .reduce((sum, p) => sum + (p.sanctioned_cost || p.estimated_cost || 0), 0),
    };

    // Statutory 10% physical inspection quota (§5.2 guidelines)
    const requiredInspections = Math.max(1, Math.ceil(projects.length * 0.10));
    const completedInspectionsCount = await Inspection.countDocuments({
      ...districtFilter,
      status: 'COMPLETED',
    });

    const inspections = {
      target_10_percent: requiredInspections,
      completed: completedInspectionsCount,
      percentage: requiredInspections > 0
        ? Math.min(100, Math.round((completedInspectionsCount / requiredInspections) * 100))
        : 100,
    };

    // Up to 10 latest pending review projects
    const pendingQueue = projects
      .filter((p) => p.status === 'DISTRICT_REVIEW')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    return ApiResponse.success(
      res,
      {
        district_info: {
          district,
          state,
          officer_name: req.user.full_name,
        },
        counts,
        financial,
        inspections,
        pending_queue: pendingQueue,
      },
      'District Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/state
 * State Nodal Authority Dashboard
 * Protected: STATE_NODAL_AUTHORITY role only
 */
router.get('/state', authenticate, authorize('STATE_NODAL_AUTHORITY'), async (req, res, next) => {
  try {
    const { jurisdiction } = req.user;
    const state = jurisdiction?.state || 'Madhya Pradesh';
    const stateFilter = { state: new RegExp(`^${state}$`, 'i') };

    const projects = await Project.find(stateFilter).lean();

    const counts = {
      total: projects.length,
      sanctioned: projects.filter((p) => p.status === 'SANCTIONED').length,
      in_progress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      under_review: projects.filter((p) => p.status === 'DISTRICT_REVIEW').length,
    };

    const totalSanctionedCost = projects
      .filter((p) => ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status))
      .reduce((sum, p) => sum + (p.sanctioned_cost || p.estimated_cost || 0), 0);

    // Group projects by district for district-wise comparison
    const districtMap = {};
    for (const p of projects) {
      const d = p.district || 'Unknown';
      if (!districtMap[d]) {
        districtMap[d] = { district: d, total: 0, sanctioned: 0, completed: 0, pending: 0 };
      }
      districtMap[d].total++;
      if (p.status === 'SANCTIONED') districtMap[d].sanctioned++;
      if (p.status === 'COMPLETED') districtMap[d].completed++;
      if (p.status === 'DISTRICT_REVIEW') districtMap[d].pending++;
    }

    const districtRollups = Object.values(districtMap).sort((a, b) => b.total - a.total);

    // State 1% physical inspection quota (§5.2 guidelines)
    const target1Percent = Math.max(1, Math.ceil(projects.length * 0.01));
    const completedStateInspections = await Inspection.countDocuments({
      ...stateFilter,
      inspection_type: 'STATE_1_PERCENT',
      status: 'COMPLETED',
    });

    return ApiResponse.success(
      res,
      {
        state_info: { state, nodal_officer: req.user.full_name },
        counts,
        total_sanctioned_cost: totalSanctionedCost,
        district_rollups: districtRollups,
        inspections: {
          target_1_percent: target1Percent,
          completed: completedStateInspections,
          percentage: target1Percent > 0
            ? Math.min(100, Math.round((completedStateInspections / target1Percent) * 100))
            : 100,
        },
      },
      'State Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/ministry
 * Ministry National Supervision Dashboard
 * Protected: MINISTRY role only
 */
router.get('/ministry', authenticate, authorize('MINISTRY'), async (req, res, next) => {
  try {
    const [totalMps, allProjects, totalAllocatedResult] = await Promise.all([
      MpAllocation.countDocuments(),
      Project.find({}).lean(),
      MpAllocation.aggregate([{ $group: { _id: null, total: { $sum: '$allocated_amount' } } }]),
    ]);

    const totalAllocated = totalAllocatedResult[0]?.total || 0;
    const totalSanctionedCost = allProjects
      .filter((p) => ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status))
      .reduce((sum, p) => sum + (p.sanctioned_cost || p.estimated_cost || 0), 0);

    const counts = {
      total_mps: totalMps,
      total_projects: allProjects.length,
      sanctioned: allProjects.filter((p) => p.status === 'SANCTIONED').length,
      in_progress: allProjects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: allProjects.filter((p) => p.status === 'COMPLETED').length,
      under_review: allProjects.filter((p) => p.status === 'DISTRICT_REVIEW').length,
    };

    // State-wise project breakdown
    const stateMap = {};
    for (const p of allProjects) {
      const st = p.state || 'Other';
      if (!stateMap[st]) {
        stateMap[st] = { state: st, total_projects: 0, sanctioned: 0, completed: 0 };
      }
      stateMap[st].total_projects++;
      if (p.status === 'SANCTIONED') stateMap[st].sanctioned++;
      if (p.status === 'COMPLETED') stateMap[st].completed++;
    }

    const stateBreakdown = Object.values(stateMap).sort((a, b) => b.total_projects - a.total_projects);

    return ApiResponse.success(
      res,
      {
        national_scale: {
          total_mps: totalMps,
          total_allocated_funds: totalAllocated,
          total_sanctioned_funds: totalSanctionedCost,
        },
        counts,
        state_breakdown: stateBreakdown,
      },
      'Ministry Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/agency
 * Implementing Agency Dashboard
 * Protected: IMPLEMENTING_AGENCY role only
 */
router.get('/agency', authenticate, authorize('IMPLEMENTING_AGENCY'), async (req, res, next) => {
  try {
    const { jurisdiction, user_id } = req.user;
    const agencyId = jurisdiction?.agency_id;
    const district = jurisdiction?.district || (agencyId?.includes('INDORE') || user_id?.includes('IND') ? 'Indore' : null);
    const agencyIds = [agencyId, user_id, 'PWD-INDORE-01'].filter(Boolean);

    const orConditions = [
      { implementing_agency_id: { $in: agencyIds } },
    ];
    if (district) {
      orConditions.push({
        district: new RegExp(`^${district}$`, 'i'),
        status: { $in: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] },
        $or: [
          { implementing_agency_id: null },
          { implementing_agency_id: { $exists: false } },
          { implementing_agency_id: '' },
          { implementing_agency_id: { $in: agencyIds } },
        ],
      });
    }

    const query = { $or: orConditions };
    const projects = await Project.find(query).sort({ created_at: -1 }).lean();

    const counts = {
      assigned: projects.length,
      in_progress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      sanctioned: projects.filter((p) => p.status === 'SANCTIONED').length,
      pending_uc: 0,
    };

    return ApiResponse.success(
      res,
      {
        agency_info: {
          agency_id: agencyId || 'PWD-INDORE-01',
          agency_name: jurisdiction?.agency_name || 'Public Works Department (Division 1)',
          district: district || 'Indore',
        },
        counts,
        assigned_works: projects.slice(0, 50),
      },
      'Implementing Agency Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/auditor
 * Independent Auditor Dashboard
 * Protected: AUDITOR role only
 */
router.get('/auditor', authenticate, authorize('AUDITOR'), async (req, res, next) => {
  try {
    const [projectCount, decisionCount, auditLogCount, inspectionCount] = await Promise.all([
      Project.countDocuments(),
      OfficerDecision.countDocuments(),
      AuditLog.countDocuments(),
      Inspection.countDocuments(),
    ]);

    const recentDecisions = await OfficerDecision.find({})
      .sort({ decided_at: -1 })
      .limit(5)
      .lean();

    return ApiResponse.success(
      res,
      {
        audit_metrics: {
          total_projects: projectCount,
          total_decisions: decisionCount,
          total_audit_logs: auditLogCount,
          total_inspections: inspectionCount,
        },
        recent_decisions: recentDecisions,
      },
      'Auditor Dashboard data retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/admin
 * Admin Telemetry & User Registry Summary
 * Protected: ADMIN role only
 * Strict Admin Isolation: Zero risk scores, decisions, or audit trail content per design.md §5.32 & rules.md §10
 */
router.get('/admin', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    // 1. System telemetry
    const uptimeSeconds = Math.floor(process.uptime());
    const isDbConnected = mongoose.connection.readyState === 1;

    const telemetry = {
      status: isDbConnected ? 'OPERATIONAL' : 'DEGRADED',
      database_state: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
      server_uptime_seconds: uptimeSeconds,
      node_version: process.version,
      memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    };

    // 2. User statistics
    const [totalUsers, activeUsers, roleAggs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    const usersByRole = {};
    for (const r of roleAggs) {
      usersByRole[r._id] = r.count;
    }

    return ApiResponse.success(
      res,
      {
        telemetry,
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          by_role: usersByRole,
        },
      },
      'Admin telemetry and system summary retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

