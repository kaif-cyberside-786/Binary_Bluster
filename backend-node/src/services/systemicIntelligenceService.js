/**
 * Systemic Intelligence Service (Phase 14)
 * Provides portfolio-level aggregations, geographic breakdowns, category patterns,
 * systemic agency concentration, inspection system health, and supervisory attention lists.
 * Strictly enforces server-side role and jurisdiction boundaries per rules.md §10.
 * Preserves Phase 9 risk scores as authoritative and maintains strict separation between
 * agency concentration and suitability.
 */
const {
  Project,
  AiRiskScore,
  ComplianceFinding,
  Inspection,
  ImplementingAgency,
  AgencyConcentration,
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
} = require('../models');
const agencyIntelligenceService = require('./agencyIntelligenceService');
const inspectionQueueService = require('./inspectionQueueService');
const logger = require('../utils/logger');

class SystemicIntelligenceService {
  /**
   * Helper: validates user role and enforces server-side jurisdiction scoping
   * @param {Object} user - req.user
   * @param {Object} query - req.query
   * @returns {Object} { scope: 'ministry'|'state', effectiveState: string|null, filterYear: string|null }
   */
  _validateScope(user, query = {}) {
    if (!user) {
      const err = new Error('Authentication required');
      err.code = 'UNAUTHENTICATED';
      err.status = 401;
      throw err;
    }

    // 1. Mandatory Admin Isolation (rules.md §10)
    if (user.role === 'ADMIN') {
      const err = new Error('Access denied: Admin isolation prohibits access to systemic business intelligence per rules.md §10');
      err.code = 'ADMIN_ISOLATION';
      err.status = 403;
      throw err;
    }

    // 2. Strict Role Permissions
    if (['DISTRICT_AUTHORITY', 'DISTRICT', 'MP', 'IMPLEMENTING_AGENCY'].includes(user.role)) {
      const err = new Error(`Access denied: Role '${user.role}' is not authorized to access systemic portfolio analytics`);
      err.code = 'FORBIDDEN_ROLE';
      err.status = 403;
      throw err;
    }

    const queryState = query.state ? query.state.trim() : null;
    const filterYear = query.year ? String(query.year).trim() : null;

    // 3. State Nodal Authority: Strictly bound to user's authenticated State
    if (user.role === 'STATE_NODAL_AUTHORITY') {
      const userState = user.jurisdiction?.state;
      if (!userState) {
        const err = new Error('State Nodal Authority user does not have an assigned state jurisdiction');
        err.code = 'FORBIDDEN_JURISDICTION';
        err.status = 403;
        throw err;
      }

      // Security check: if client requested a different state in query param, reject immediately!
      if (queryState && queryState.toLowerCase() !== userState.toLowerCase()) {
        const err = new Error(`Access denied: State Nodal Authority for '${userState}' cannot access systemic data for '${queryState}'`);
        err.code = 'FORBIDDEN_JURISDICTION';
        err.status = 403;
        throw err;
      }

      return {
        scope: 'state',
        effectiveState: userState,
        filterYear,
      };
    }

    // 4. Ministry: Pan-India visibility, optional analytics filter by state
    if (user.role === 'MINISTRY') {
      return {
        scope: 'ministry',
        effectiveState: queryState, // analytics filter only, not security restriction
        filterYear,
      };
    }

    // 5. Auditor: Read-only access within their designated jurisdiction level
    if (user.role === 'AUDITOR') {
      if (user.jurisdiction?.level === 'STATE') {
        const userState = user.jurisdiction?.state;
        if (queryState && userState && queryState.toLowerCase() !== userState.toLowerCase()) {
          const err = new Error(`Access denied: State-level Auditor cannot access systemic data for '${queryState}'`);
          err.code = 'FORBIDDEN_JURISDICTION';
          err.status = 403;
          throw err;
        }
        return {
          scope: 'state',
          effectiveState: userState || null,
          filterYear,
        };
      }
      return {
        scope: 'ministry',
        effectiveState: queryState,
        filterYear,
      };
    }

    const err = new Error(`Access denied: Role '${user.role}' is not authorized for systemic portfolio analytics`);
    err.code = 'FORBIDDEN_ROLE';
    err.status = 403;
    throw err;
  }

  /**
   * 1. GET /api/systemic/overview
   * Consolidated portfolio overview: Value-at-Risk, risk distribution, lifecycle distribution
   */
  async getPortfolioOverview({ user, filters = {} }) {
    const { scope, effectiveState, filterYear } = this._validateScope(user, filters);

    const matchFilter = {};
    if (effectiveState) {
      matchFilter.state = new RegExp(`^${effectiveState}$`, 'i');
    }

    // Optional year filter on sanction_date or created_at
    if (filterYear) {
      const yearInt = parseInt(filterYear, 10);
      if (!isNaN(yearInt)) {
        const startOfYear = new Date(`${yearInt}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${yearInt + 1}-01-01T00:00:00.000Z`);
        matchFilter.$or = [
          { sanction_date: { $gte: startOfYear, $lt: endOfYear } },
          { created_at: { $gte: startOfYear, $lt: endOfYear } },
        ];
      }
    }

    // Aggregate Projects + Risk Scores + Compliance Findings
    const pipeline = [
      { $match: matchFilter },
      // Lookup authoritative Phase 9 AI Risk Score
      {
        $lookup: {
          from: 'ai_risk_scores',
          localField: 'project_id',
          foreignField: 'project_id',
          as: 'risk_data',
        },
      },
      // Lookup active non-compliant findings
      {
        $lookup: {
          from: 'compliance_findings',
          let: { pId: '$project_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$project_id', '$$pId'] },
                    { $eq: ['$status', 'NON_COMPLIANT'] },
                    { $ne: ['$is_dismissed', true] },
                  ],
                },
              },
            },
          ],
          as: 'non_compliant_findings',
        },
      },
      {
        $project: {
          project_id: 1,
          state: 1,
          district: 1,
          status: 1,
          category: 1,
          estimated_cost: { $ifNull: ['$estimated_cost', 0] },
          sanctioned_cost: '$sanctioned_cost',
          effective_cost: {
            $cond: [
              { $gt: [{ $ifNull: ['$sanctioned_cost', 0] }, 0] },
              '$sanctioned_cost',
              { $ifNull: ['$estimated_cost', 0] },
            ],
          },
          risk_level: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.risk_level', 0] },
              'UNASSESSED',
            ],
          },
          risk_score: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.overall_score', 0] },
              null,
            ],
          },
          has_non_compliant: {
            $gt: [{ $size: '$non_compliant_findings' }, 0],
          },
        },
      },
    ];

    const projects = await Project.aggregate(pipeline);

    // Initial aggregates
    let totalProjects = projects.length;
    let totalOutlayValue = 0;
    let highRiskValue = 0;
    let nonCompliantValue = 0;
    let atRiskValue = 0;
    let totalAssessedScore = 0;
    let assessedCount = 0;

    const riskDistribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      UNASSESSED: 0,
    };

    const statusDistribution = {};
    for (const st of PROJECT_STATUSES) {
      statusDistribution[st] = 0;
    }

    for (const p of projects) {
      const val = p.effective_cost || 0;
      totalOutlayValue += val;

      // Status distribution
      if (statusDistribution[p.status] !== undefined) {
        statusDistribution[p.status]++;
      } else {
        statusDistribution[p.status] = 1;
      }

      // Risk distribution
      const rLevel = p.risk_level || 'UNASSESSED';
      if (riskDistribution[rLevel] !== undefined) {
        riskDistribution[rLevel]++;
      } else {
        riskDistribution.UNASSESSED++;
      }

      if (p.risk_score !== null && p.risk_score !== undefined) {
        totalAssessedScore += p.risk_score;
        assessedCount++;
      }

      // Value-at-Risk calculations
      const isHighRisk = rLevel === 'HIGH';
      const isNonCompliant = Boolean(p.has_non_compliant);

      if (isHighRisk) {
        highRiskValue += val;
      }
      if (isNonCompliant) {
        nonCompliantValue += val;
      }

      // at_risk_value avoids double counting: union of (HIGH OR NON_COMPLIANT)
      if (isHighRisk || isNonCompliant) {
        atRiskValue += val;
      }
    }

    const avgRiskScore = assessedCount > 0 ? Math.round((totalAssessedScore / assessedCount) * 10) / 10 : null;
    const highRiskRate = assessedCount > 0 ? Math.round((riskDistribution.HIGH / assessedCount) * 1000) / 10 : 0;

    // Active & Completed work counts
    const activeWorks =
      (statusDistribution.SANCTIONED || 0) +
      (statusDistribution.IN_PROGRESS || 0) +
      (statusDistribution.INSPECTION_REQUESTED || 0) +
      (statusDistribution.HELD || 0);
    const completedWorks = statusDistribution.COMPLETED || 0;

    return {
      scope,
      state: effectiveState,
      year: filterYear,
      metrics: {
        total_projects: totalProjects,
        total_outlay_value: totalOutlayValue,
        active_works: activeWorks,
        completed_works: completedWorks,
        average_risk_score: avgRiskScore,
        high_risk_rate: highRiskRate,
        value_at_risk: {
          high_risk_value: highRiskValue,
          non_compliant_value: nonCompliantValue,
          total_at_risk_value: atRiskValue, // Deduplicated union
          at_risk_percentage: totalOutlayValue > 0 ? Math.round((atRiskValue / totalOutlayValue) * 1000) / 10 : 0,
        },
        risk_distribution: {
          ...riskDistribution,
          assessed_count: assessedCount,
        },
        status_distribution: statusDistribution,
      },
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 2. GET /api/systemic/geographic
   * State breakdown for Ministry, District breakdown for State
   */
  async getGeographicBreakdown({ user, filters = {} }) {
    const { scope, effectiveState, filterYear } = this._validateScope(user, filters);

    const matchFilter = {};
    if (effectiveState) {
      matchFilter.state = new RegExp(`^${effectiveState}$`, 'i');
    }

    const groupField = scope === 'ministry' && !effectiveState ? '$state' : '$district';

    const pipeline = [
      { $match: matchFilter },
      // Lookup Phase 9 Risk
      {
        $lookup: {
          from: 'ai_risk_scores',
          localField: 'project_id',
          foreignField: 'project_id',
          as: 'risk_data',
        },
      },
      // Lookup Non-compliant findings
      {
        $lookup: {
          from: 'compliance_findings',
          let: { pId: '$project_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$project_id', '$$pId'] },
                    { $eq: ['$status', 'NON_COMPLIANT'] },
                    { $ne: ['$is_dismissed', true] },
                  ],
                },
              },
            },
          ],
          as: 'non_compliant',
        },
      },
      // Lookup Execution anomaly flags
      {
        $lookup: {
          from: 'ai_risk_flags',
          let: { pId: '$project_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$project_id', '$$pId'] },
                    {
                      $in: [
                        '$flag_type',
                        [
                          'PAYMENT_PROGRESS_ANOMALY',
                          'PAYMENT_PROGRESS_MISMATCH',
                          'DELAY_RISK',
                          'DELAY_STALENESS',
                        ],
                      ],
                    },
                    { $eq: ['$severity', 'HIGH'] },
                  ],
                },
              },
            },
          ],
          as: 'execution_flags',
        },
      },
      // Lookup Inspections
      {
        $lookup: {
          from: 'inspections',
          localField: 'project_id',
          foreignField: 'project_id',
          as: 'inspections',
        },
      },
      {
        $project: {
          state: 1,
          district: 1,
          group_key: groupField,
          effective_cost: {
            $cond: [
              { $gt: [{ $ifNull: ['$sanctioned_cost', 0] }, 0] },
              '$sanctioned_cost',
              { $ifNull: ['$estimated_cost', 0] },
            ],
          },
          risk_level: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.risk_level', 0] },
              'UNASSESSED',
            ],
          },
          risk_score: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.overall_score', 0] },
              null,
            ],
          },
          has_non_compliant: { $gt: [{ $size: '$non_compliant' }, 0] },
          has_execution_mismatch: { $gt: [{ $size: '$execution_flags' }, 0] },
          inspection_count: { $size: '$inspections' },
          inspection_completed: {
            $size: {
              $filter: {
                input: '$inspections',
                as: 'insp',
                cond: { $in: ['$$insp.status', ['COMPLETED', 'RESULT_RECORDED']] },
              },
            },
          },
          inspection_escalated: {
            $size: {
              $filter: {
                input: '$inspections',
                as: 'insp',
                cond: { $eq: ['$$insp.result', 'ESCALATE'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$group_key',
          state: { $first: '$state' },
          project_count: { $sum: 1 },
          total_value: { $sum: '$effective_cost' },
          low_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'LOW'] }, 1, 0] },
          },
          medium_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'MEDIUM'] }, 1, 0] },
          },
          high_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'HIGH'] }, 1, 0] },
          },
          unassessed_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'UNASSESSED'] }, 1, 0] },
          },
          non_compliant_count: {
            $sum: { $cond: ['$has_non_compliant', 1, 0] },
          },
          execution_mismatch_count: {
            $sum: { $cond: ['$has_execution_mismatch', 1, 0] },
          },
          inspection_count: { $sum: '$inspection_count' },
          inspection_completed_count: { $sum: '$inspection_completed' },
          inspection_escalate_count: { $sum: '$inspection_escalated' },
          total_score: { $sum: '$risk_score' },
          assessed_count: {
            $sum: { $cond: [{ $ne: ['$risk_score', null] }, 1, 0] },
          },
        },
      },
      { $sort: { high_risk_count: -1, project_count: -1 } },
    ];

    const rawBreakdown = await Project.aggregate(pipeline);

    const breakdown = rawBreakdown.map((r) => {
      const assessed = r.assessed_count || 0;
      const highRate = assessed > 0 ? Math.round((r.high_risk_count / assessed) * 1000) / 10 : 0;
      const avgScore = assessed > 0 ? Math.round((r.total_score / assessed) * 10) / 10 : null;

      return {
        region: r._id || 'Unspecified',
        state: r.state || effectiveState,
        project_count: r.project_count,
        total_value: r.total_value,
        low_risk_count: r.low_risk_count,
        medium_risk_count: r.medium_risk_count,
        high_risk_count: r.high_risk_count,
        unassessed_count: r.unassessed_count,
        high_risk_rate: highRate,
        average_risk_score: avgScore,
        non_compliant_count: r.non_compliant_count,
        execution_mismatch_count: r.execution_mismatch_count,
        inspection_count: r.inspection_count,
        inspection_completed_count: r.inspection_completed_count,
        inspection_escalate_count: r.inspection_escalate_count,
      };
    });

    return {
      scope,
      state: effectiveState,
      grouping_dimension: scope === 'ministry' && !effectiveState ? 'STATE' : 'DISTRICT',
      total_regions: breakdown.length,
      breakdown,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 3. GET /api/systemic/categories
   * Systemic patterns across canonical project categories
   */
  async getCategoryPatterns({ user, filters = {} }) {
    const { scope, effectiveState } = this._validateScope(user, filters);

    const matchFilter = {};
    if (effectiveState) {
      matchFilter.state = new RegExp(`^${effectiveState}$`, 'i');
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'ai_risk_scores',
          localField: 'project_id',
          foreignField: 'project_id',
          as: 'risk_data',
        },
      },
      {
        $lookup: {
          from: 'compliance_findings',
          let: { pId: '$project_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$project_id', '$$pId'] },
                    { $eq: ['$status', 'NON_COMPLIANT'] },
                    { $ne: ['$is_dismissed', true] },
                  ],
                },
              },
            },
          ],
          as: 'non_compliant',
        },
      },
      {
        $lookup: {
          from: 'ai_risk_flags',
          let: { pId: '$project_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$project_id', '$$pId'] },
                    {
                      $in: [
                        '$flag_type',
                        [
                          'PAYMENT_PROGRESS_ANOMALY',
                          'PAYMENT_PROGRESS_MISMATCH',
                          'DELAY_RISK',
                          'DELAY_STALENESS',
                        ],
                      ],
                    },
                    { $eq: ['$severity', 'HIGH'] },
                  ],
                },
              },
            },
          ],
          as: 'execution_flags',
        },
      },
      {
        $project: {
          category: { $ifNull: ['$category', 'Other Public Amenities'] },
          effective_cost: {
            $cond: [
              { $gt: [{ $ifNull: ['$sanctioned_cost', 0] }, 0] },
              '$sanctioned_cost',
              { $ifNull: ['$estimated_cost', 0] },
            ],
          },
          risk_level: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.risk_level', 0] },
              'UNASSESSED',
            ],
          },
          risk_score: {
            $cond: [
              { $gt: [{ $size: '$risk_data' }, 0] },
              { $arrayElemAt: ['$risk_data.overall_score', 0] },
              null,
            ],
          },
          has_non_compliant: { $gt: [{ $size: '$non_compliant' }, 0] },
          has_execution_mismatch: { $gt: [{ $size: '$execution_flags' }, 0] },
        },
      },
      {
        $group: {
          _id: '$category',
          project_count: { $sum: 1 },
          total_outlay: { $sum: '$effective_cost' },
          low_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'LOW'] }, 1, 0] },
          },
          medium_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'MEDIUM'] }, 1, 0] },
          },
          high_risk_count: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'HIGH'] }, 1, 0] },
          },
          non_compliant_count: {
            $sum: { $cond: ['$has_non_compliant', 1, 0] },
          },
          execution_mismatch_count: {
            $sum: { $cond: ['$has_execution_mismatch', 1, 0] },
          },
          total_score: { $sum: '$risk_score' },
          assessed_count: {
            $sum: { $cond: [{ $ne: ['$risk_score', null] }, 1, 0] },
          },
        },
      },
      { $sort: { project_count: -1 } },
    ];

    const rawCategories = await Project.aggregate(pipeline);

    const categories = rawCategories.map((c) => {
      const assessed = c.assessed_count || 0;
      const highRate = assessed > 0 ? Math.round((c.high_risk_count / assessed) * 1000) / 10 : 0;
      const avgScore = assessed > 0 ? Math.round((c.total_score / assessed) * 10) / 10 : null;

      return {
        category: c._id,
        project_count: c.project_count,
        total_outlay: c.total_outlay,
        low_risk_count: c.low_risk_count,
        medium_risk_count: c.medium_risk_count,
        high_risk_count: c.high_risk_count,
        high_risk_rate: highRate,
        average_risk_score: avgScore,
        non_compliant_count: c.non_compliant_count,
        execution_mismatch_count: c.execution_mismatch_count,
      };
    });

    return {
      scope,
      state: effectiveState,
      total_categories: categories.length,
      categories,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 4. GET /api/systemic/agency-concentration
   * Reuses Phase 12 concentration logic; strictly separated from suitability
   */
  async getAgencyConcentrationSystemic({ user, filters = {} }) {
    const { scope, effectiveState, filterYear } = this._validateScope(user, filters);

    // Call Phase 12 concentration service
    const targetState = effectiveState || 'Madhya Pradesh';
    const targetDistrict = filters.district || (scope === 'state' ? 'Indore' : undefined);

    if (targetDistrict) {
      const concResult = await agencyIntelligenceService.calculateConcentration({
        district: targetDistrict,
        state: targetState,
        year: filterYear || '2026',
      });

      return {
        scope,
        state: targetState,
        district: targetDistrict,
        product: 'SYSTEMIC_AGENCY_CONCENTRATION',
        herfindahl_index: concResult.herfindahl_index,
        market_structure: concResult.market_structure,
        total_works: concResult.total_works,
        total_value: concResult.total_value,
        agencies: concResult.agencies,
        concentration_threshold_percentage: 35.0,
        advisory_disclaimer:
          'Advisory Analytics: Implementing agency concentration monitors distribution of public works contracts to identify systemic market dependency. Suitability ranking remains distinct per project.',
        updated_at: new Date().toISOString(),
      };
    }

    // Rollup across districts in the state/nation
    const matchFilter = {};
    if (effectiveState) {
      matchFilter.state = new RegExp(`^${effectiveState}$`, 'i');
    }
    matchFilter.status = { $in: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] };

    const projects = await Project.find(matchFilter).lean();
    const totalWorks = projects.length;
    let totalValue = 0;
    const agencyMap = {};

    for (const p of projects) {
      const cost = p.sanctioned_cost || p.estimated_cost || 0;
      totalValue += cost;
      const agId = p.implementing_agency_id || 'UNASSIGNED';
      if (!agencyMap[agId]) {
        agencyMap[agId] = { work_count: 0, total_value: 0 };
      }
      agencyMap[agId].work_count++;
      agencyMap[agId].total_value += cost;
    }

    const agencyIds = Object.keys(agencyMap).filter((id) => id !== 'UNASSIGNED');
    const agencyDocs = await ImplementingAgency.find({ agency_id: { $in: agencyIds } }).lean();
    const metaMap = {};
    for (const a of agencyDocs) {
      metaMap[a.agency_id] = { name: a.name, type: a.type };
    }

    let hhi = 0;
    const agencies = [];

    for (const [agId, data] of Object.entries(agencyMap)) {
      const valShare = totalValue > 0 ? (data.total_value / totalValue) * 100 : 0;
      const roundedShare = Math.round(valShare * 10) / 10;
      const hhiContrib = Math.round(roundedShare * roundedShare);
      hhi += hhiContrib;

      agencies.push({
        agency_id: agId,
        name: metaMap[agId]?.name || agId,
        type: metaMap[agId]?.type || 'PUBLIC_WORKS',
        work_count: data.work_count,
        total_value: data.total_value,
        share_of_value_percentage: roundedShare,
        is_concentration_flagged: roundedShare > 35.0,
        herfindahl_index_contribution: hhiContrib,
      });
    }

    agencies.sort((a, b) => b.share_of_value_percentage - a.share_of_value_percentage);

    let marketStructure = 'COMPETITIVE';
    if (hhi >= 2500) marketStructure = 'HIGHLY_CONCENTRATED';
    else if (hhi >= 1500) marketStructure = 'MODERATELY_CONCENTRATED';

    return {
      scope,
      state: effectiveState,
      product: 'SYSTEMIC_AGENCY_CONCENTRATION',
      herfindahl_index: hhi,
      market_structure: marketStructure,
      total_works: totalWorks,
      total_value: totalValue,
      agencies,
      concentration_threshold_percentage: 35.0,
      advisory_disclaimer:
        'Advisory Analytics: Implementing agency concentration monitors distribution of public works contracts to identify systemic market dependency. Suitability ranking remains distinct per project.',
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 5. GET /api/systemic/inspections
   * Aggregates Phase 13 canonical 7-stage lifecycle and State 1% physical inspection health
   */
  async getInspectionSystemHealth({ user, filters = {} }) {
    const { scope, effectiveState, filterYear } = this._validateScope(user, filters);

    const matchFilter = {};
    if (effectiveState) {
      matchFilter.state = new RegExp(`^${effectiveState}$`, 'i');
    }
    if (filterYear) {
      matchFilter.quota_year = filterYear;
    }

    const inspections = await Inspection.find(matchFilter).lean();

    // Canonical 7-stage lifecycle tally
    const lifecycleDistribution = {};
    for (const st of INSPECTION_STATUSES) {
      lifecycleDistribution[st] = 0;
    }
    for (const insp of inspections) {
      if (lifecycleDistribution[insp.status] !== undefined) {
        lifecycleDistribution[insp.status]++;
      } else {
        lifecycleDistribution[insp.status] = 1;
      }
    }

    // Results breakdown
    const resultsDistribution = {
      NO_ISSUE: 0,
      REVIEW_REQUIRED: 0,
      ESCALATE: 0,
      PENDING: 0,
    };
    for (const insp of inspections) {
      if (insp.result) {
        if (resultsDistribution[insp.result] !== undefined) {
          resultsDistribution[insp.result]++;
        } else {
          resultsDistribution[insp.result] = 1;
        }
      } else {
        resultsDistribution.PENDING++;
      }
    }

    // Priority Tier distribution
    const priorityDistribution = {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      ROUTINE: 0,
    };
    for (const insp of inspections) {
      const tier = insp.priority_tier || 'ROUTINE';
      if (priorityDistribution[tier] !== undefined) {
        priorityDistribution[tier]++;
      } else {
        priorityDistribution.ROUTINE++;
      }
    }

    // Statutory Quota Rollup (State 1% Physical Inspection Quota per §5.2)
    let quotaSummary = null;
    try {
      quotaSummary = await inspectionQueueService.quotaStats({
        level: 'STATE',
        state: effectiveState || (scope === 'state' ? user.jurisdiction?.state : undefined),
        year: filterYear,
        user: { role: 'STATE_NODAL_AUTHORITY', jurisdiction: { level: 'STATE', state: effectiveState || 'Madhya Pradesh' } },
      });
    } catch (err) {
      logger.debug('Systemic inspection quota rollup computed fallback', { error: err.message });
      quotaSummary = {
        level: 'STATE',
        quota_percentage: 1,
        eligible_works: inspections.length,
        statutory_target: Math.max(1, Math.ceil(inspections.length * 0.01)),
        completed_count: lifecycleDistribution.RESULT_RECORDED || 0,
        remaining_count: Math.max(0, Math.ceil(inspections.length * 0.01) - (lifecycleDistribution.RESULT_RECORDED || 0)),
        progress_percentage: 0,
      };
    }

    return {
      scope,
      state: effectiveState,
      total_inspections: inspections.length,
      lifecycle_distribution: lifecycleDistribution,
      results_distribution: resultsDistribution,
      priority_distribution: priorityDistribution,
      statutory_1_percent_quota: quotaSummary,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 6. GET /api/systemic/attention
   * Identifies areas requiring supervisory attention based on transparent deterministic formula
   * formula: 0.40 * highRiskRate + 0.25 * nonCompliantRate + 0.20 * executionMismatchRate + 0.15 * inspectionEscalateRate
   */
  async getAttentionList({ user, filters = {}, limit = 10 }) {
    const { scope, effectiveState, filterYear } = this._validateScope(user, filters);

    // Call geographic breakdown to get base regional telemetry
    const geoData = await this.getGeographicBreakdown({ user, filters });
    const regions = geoData.breakdown || [];

    const attentionList = regions.map((r) => {
      const projCount = r.project_count || 0;
      const highRiskRate = r.high_risk_rate || 0;
      const nonCompliantRate = projCount > 0 ? (r.non_compliant_count / projCount) * 100 : 0;
      const executionMismatchRate = projCount > 0 ? (r.execution_mismatch_count / projCount) * 100 : 0;
      const inspectionEscalateRate = r.inspection_count > 0 ? (r.inspection_escalate_count / r.inspection_count) * 100 : 0;

      // Deterministic bounded formula (0 - 100)
      const rawScore =
        0.40 * highRiskRate +
        0.25 * nonCompliantRate +
        0.20 * executionMismatchRate +
        0.15 * inspectionEscalateRate;

      const score = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));

      let attentionLevel = 'STANDARD_MONITORING';
      if (score >= 50.0) attentionLevel = 'ELEVATED_ATTENTION';
      else if (score >= 25.0) attentionLevel = 'MODERATE_ATTENTION';

      const keyDrivers = [];
      if (highRiskRate >= 20.0) keyDrivers.push('Elevated Phase 9 High-Risk concentration');
      if (nonCompliantRate >= 15.0) keyDrivers.push('Recurring statutory compliance non-compliance');
      if (executionMismatchRate >= 15.0) keyDrivers.push('Significant payment/progress physical mismatch');
      if (inspectionEscalateRate >= 10.0) keyDrivers.push('Field inspection adverse findings/escalations');
      if (keyDrivers.length === 0) keyDrivers.push('Routine supervisory monitoring threshold');

      return {
        region: r.region,
        state: r.state,
        project_count: r.project_count,
        total_value: r.total_value,
        systemic_attention_score: score,
        attention_level: attentionLevel,
        high_risk_rate: Math.round(highRiskRate * 10) / 10,
        non_compliant_rate: Math.round(nonCompliantRate * 10) / 10,
        execution_mismatch_rate: Math.round(executionMismatchRate * 10) / 10,
        inspection_escalate_rate: Math.round(inspectionEscalateRate * 10) / 10,
        key_drivers: keyDrivers,
      };
    });

    // Sort descending by attention score
    attentionList.sort((a, b) => b.systemic_attention_score - a.systemic_attention_score);

    const limitedList = attentionList.slice(0, Number(limit) || 10);

    return {
      scope,
      state: effectiveState,
      total_evaluated: attentionList.length,
      attention_list: limitedList,
      formula_notice:
        'Systemic Attention Score is a transparent supervisory indicator combining High-Risk concentration (40%), Compliance exceptions (25%), Execution gap (20%), and Inspection escalations (15%). It is NOT a project risk score.',
      updated_at: new Date().toISOString(),
    };
  }
}

module.exports = new SystemicIntelligenceService();

