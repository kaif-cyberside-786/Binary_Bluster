/**
 * Agency Intelligence & Efficiency Service
 * Implements two distinct analytical products per architecture.md §10.1, design.md §5.33, prd.md §12.7-12.8:
 * 1. Agency Suitability: Per-project advisory ranking of eligible executing agencies with concentration guardrail.
 * 2. Agency Concentration: Systemic work-share and financial-value analytics per district/state/year using Herfindahl-Hirschman Index.
 * Express is the sole authorization boundary. Strict Admin Isolation enforced.
 */
const { ImplementingAgency } = require('../models/ImplementingAgency');
const { AgencyPerformance } = require('../models/AgencyPerformance');
const { AgencyConcentration } = require('../models/AgencyConcentration');
const { Project } = require('../models/Project');
const aiClient = require('./aiClient');
const logger = require('../utils/logger');

const ADVISORY_DISCLAIMER =
  'Suggested agencies are advisory only per rules.md §12. Statutory selection authority remains exclusively with the District Authority.';

/**
 * Category-to-Agency-Type synergy mapping
 */
const CATEGORY_SYNERGY = {
  ROADS: ['PWD', 'OTHER', 'CPWD'], // OTHER includes MP-RDC
  BRIDGES: ['PWD', 'OTHER', 'CPWD'],
  DRINKING_WATER: ['RES', 'MUNICIPAL_CORP', 'OTHER', 'PWD'],
  SANITATION: ['MUNICIPAL_CORP', 'RES', 'ZILA_PANCHAYAT'],
  EDUCATION: ['RES', 'PWD', 'CPWD'],
  HEALTH: ['PWD', 'CPWD', 'RES'],
  COMMUNITY_HALL: ['RES', 'PWD', 'MUNICIPAL_CORP'],
  IRRIGATION: ['IRRIGATION_DEPT', 'RES', 'OTHER'],
  OTHER: ['PWD', 'RES', 'CPWD', 'MUNICIPAL_CORP'],
};

class AgencyIntelligenceService {
  /**
   * List eligible active agencies
   */
  async getAgencies(filter = {}) {
    const query = { is_active: true };
    if (filter.district) {
      query.district = new RegExp(`^${filter.district}$`, 'i');
    }
    if (filter.state) {
      query.state = new RegExp(`^${filter.state}$`, 'i');
    }
    if (filter.type) {
      query.type = filter.type;
    }
    return ImplementingAgency.find(query).sort({ name: 1 }).lean();
  }

  /**
   * Get single agency profile
   */
  async getAgencyProfile(agencyId) {
    if (!agencyId) return null;
    return ImplementingAgency.findOne({
      agency_id: agencyId.trim().toUpperCase(),
    }).lean();
  }

  /**
   * Get performance metrics for an agency
   * Queries agency_performance or falls back to live project aggregation
   */
  async getAgencyPerformance(agencyId, period = '2025-2026') {
    if (!agencyId) return null;
    const cleanId = agencyId.trim().toUpperCase();

    // 1. Try saved performance record
    let perf = await AgencyPerformance.findOne({
      agency_id: cleanId,
      period,
    }).lean();

    if (!perf) {
      perf = await AgencyPerformance.findOne({ agency_id: cleanId })
        .sort({ period: -1 })
        .lean();
    }

    if (perf) {
      return perf;
    }

    // 2. Dynamic aggregation from live projects
    const projects = await Project.find({
      implementing_agency_id: cleanId,
    }).lean();

    const totalAssigned = projects.length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const completionRate =
      totalAssigned > 0
        ? Math.round((completed / totalAssigned) * 10000) / 100
        : 0;

    return {
      agency_id: cleanId,
      period: period || 'CURRENT',
      total_assigned_works: totalAssigned,
      completed_works: completed,
      completion_rate: completionRate,
      avg_delay_days: 0,
      cost_deviation_avg_percentage: 0,
      adverse_inspection_count: 0,
      performance_score: Math.min(100, Math.round(completionRate * 0.9)),
      is_real_government_data: false,
      is_synthetic: true,
    };
  }

  /**
   * PRODUCT 1: Agency Suitability Ranking (District-facing, Per New Project)
   * Advisory ranking of eligible agencies with statutory concentration guardrail
   */
  async calculateSuitability(params) {
    const { category, estimated_cost, district = 'Indore', state = 'Madhya Pradesh' } = params;

    // Retrieve active agencies for district (or state fallback)
    let agencies = await this.getAgencies({ district, state });
    if (!agencies || agencies.length === 0) {
      agencies = await this.getAgencies({ state });
    }
    if (!agencies || agencies.length === 0) {
      agencies = await ImplementingAgency.find({ is_active: true }).lean();
    }

    // Fetch existing concentration records to evaluate monopoly guardrail
    const concentrationRecords = await AgencyConcentration.find({
      district: new RegExp(`^${district}$`, 'i'),
    }).lean();
    const concentrationMap = {};
    for (const c of concentrationRecords) {
      concentrationMap[c.agency_id] = c.share_of_value_percentage;
    }

    // Evaluate each candidate agency
    const candidates = [];
    for (const agency of agencies) {
      const perf = await this.getAgencyPerformance(agency.agency_id);

      // 1. Completion Rate Score (25% weight)
      const compRate = perf?.completion_rate || 75;
      const compScore = Math.min(100, Math.max(0, compRate));

      // 2. Timeliness / Delay Score (20% weight)
      const delayDays = perf?.avg_delay_days ?? 30;
      let delayScore = 80;
      if (delayDays <= 0) delayScore = 100;
      else if (delayDays <= 20) delayScore = 95;
      else if (delayDays <= 35) delayScore = 85;
      else if (delayDays <= 60) delayScore = 70;
      else delayScore = 45;

      // 3. Cost Fidelity / Deviation Score (20% weight)
      const costDev = perf?.cost_deviation_avg_percentage ?? 5.0;
      let costScore = 80;
      if (costDev <= 3.0) costScore = 100;
      else if (costDev <= 5.0) costScore = 90;
      else if (costDev <= 8.0) costScore = 75;
      else if (costDev <= 12.0) costScore = 60;
      else costScore = 40;

      // 4. Inspection Outcome Score (15% weight)
      const adverseCount = perf?.adverse_inspection_count ?? 0;
      let inspectionScore = 100;
      if (adverseCount === 0) inspectionScore = 100;
      else if (adverseCount === 1) inspectionScore = 80;
      else if (adverseCount === 2) inspectionScore = 60;
      else inspectionScore = 35;

      // 5. Category & Experience Synergy (20% weight)
      const preferredTypes = CATEGORY_SYNERGY[category?.toUpperCase()] || CATEGORY_SYNERGY.OTHER;
      let categoryScore = 75;
      if (preferredTypes[0] === agency.type) categoryScore = 98;
      else if (preferredTypes.includes(agency.type)) categoryScore = 90;

      // Calculate raw weighted score
      const rawScore =
        compScore * 0.25 +
        delayScore * 0.2 +
        costScore * 0.2 +
        inspectionScore * 0.15 +
        categoryScore * 0.2;

      // Concentration Guardrail Check (prd.md §12.8)
      // If agency holds > 35% of district work share, apply penalty & flag to avoid reinforcing concentration
      const districtShare = concentrationMap[agency.agency_id] || 0;
      const isConcentrationWarning = districtShare > 35.0;

      let finalScore = Math.round(rawScore);
      let concentrationMessage = null;

      if (isConcentrationWarning) {
        // Cap/penalize score to encourage work distribution among other qualified agencies
        finalScore = Math.max(45, Math.round(rawScore - 16));
        concentrationMessage = `⚠ Concentration Guardrail Active: Agency holds ${districtShare.toFixed(
          1
        )}% district work share (>35% threshold). Recommendation score capped to prevent reinforcing monopoly concentration.`;
      }

      candidates.push({
        agency_id: agency.agency_id,
        name: agency.name,
        type: agency.type,
        suitability_score: finalScore,
        raw_score: Math.round(rawScore),
        district_work_share_percentage: districtShare,
        concentration_warning: isConcentrationWarning,
        concentration_message: concentrationMessage,
        metrics: {
          completion_rate: compRate,
          avg_delay_days: delayDays,
          cost_deviation_percentage: costDev,
          adverse_inspections: adverseCount,
          total_assigned_works: perf?.total_assigned_works || 0,
        },
      });
    }

    // Sort descending by final suitability score
    candidates.sort((a, b) => b.suitability_score - a.suitability_score);

    // Assign rank
    const rankedAgencies = candidates.map((cand, index) => ({
      ...cand,
      rank: index + 1,
    }));

    // Attempt AI Microservice evaluation with robust deterministic fallback
    try {
      const aiPayload = {
        category,
        estimated_cost: Number(estimated_cost) || 0,
        district,
        state,
        candidate_agencies: candidates.map((c) => ({
          agency_id: c.agency_id,
          name: c.name,
          type: c.type,
          completion_rate: c.metrics.completion_rate,
          avg_delay_days: c.metrics.avg_delay_days,
          cost_deviation_percentage: c.metrics.cost_deviation_percentage,
          adverse_inspections: c.metrics.adverse_inspections,
          district_work_share_percentage: c.district_work_share_percentage,
        })),
      };
      const aiResult = await aiClient.checkAgencySuitability(aiPayload);
      if (aiResult?.available && aiResult?.data?.suggested_agencies?.length) {
        return {
          ...aiResult.data,
          advisory_disclaimer: ADVISORY_DISCLAIMER,
          total_eligible_agencies: aiResult.data.suggested_agencies.length,
          evaluated_at: new Date().toISOString(),
          engine: 'AI_MICROSERVICE',
        };
      }
    } catch (err) {
      logger.debug('AI service agency suitability offline, using deterministic Node engine', { error: err.message });
    }

    return {
      product: 'AGENCY_SUITABILITY',
      project_category: category || 'GENERAL',
      estimated_cost: Number(estimated_cost) || 0,
      district,
      state,
      advisory_disclaimer: ADVISORY_DISCLAIMER,
      concentration_guardrail_applied: rankedAgencies.some((a) => a.concentration_warning),
      suggested_agencies: rankedAgencies,
      total_eligible_agencies: rankedAgencies.length,
      evaluated_at: new Date().toISOString(),
      engine: 'DETERMINISTIC_NODE',
    };
  }

  /**
   * PRODUCT 2: Agency Concentration Analytics (State/Ministry-facing, Systemic View)
   * Calculates work-share %, financial-value share %, and Herfindahl-Hirschman Index (HHI)
   */
  async calculateConcentration(params) {
    const { district = 'Indore', state = 'Madhya Pradesh', year = '2026' } = params;

    // 1. Check existing concentration records
    let concentrationRecords = await AgencyConcentration.find({
      district: new RegExp(`^${district}$`, 'i'),
      year: String(year),
    }).lean();

    // 2. If no records exist or refresh requested, compute live from Project collection
    let agenciesData = [];
    let totalValue = 0;
    let totalWorks = 0;

    if (concentrationRecords && concentrationRecords.length > 0) {
      totalValue = concentrationRecords.reduce((sum, c) => sum + (c.total_value || 0), 0);
      totalWorks = concentrationRecords.reduce((sum, c) => sum + (c.work_count || 0), 0);

      // Populate agency metadata
      const agencyIds = concentrationRecords.map((c) => c.agency_id);
      const agencyDocs = await ImplementingAgency.find({
        agency_id: { $in: agencyIds },
      }).lean();
      const agencyNameMap = {};
      const agencyTypeMap = {};
      for (const a of agencyDocs) {
        agencyNameMap[a.agency_id] = a.name;
        agencyTypeMap[a.agency_id] = a.type;
      }

      agenciesData = concentrationRecords.map((c) => ({
        agency_id: c.agency_id,
        name: agencyNameMap[c.agency_id] || c.agency_id,
        type: agencyTypeMap[c.agency_id] || 'OTHER',
        work_count: c.work_count,
        total_value: c.total_value,
        share_of_value_percentage: c.share_of_value_percentage,
        is_concentration_flagged: c.is_concentration_flagged,
        herfindahl_index_contribution: c.herfindahl_index_contribution,
      }));
    } else {
      // Compute from live projects in district
      const projects = await Project.find({
        district: new RegExp(`^${district}$`, 'i'),
        status: { $in: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] },
      }).lean();

      totalWorks = projects.length;
      totalValue = projects.reduce(
        (sum, p) => sum + (p.sanctioned_cost || p.estimated_cost || 0),
        0
      );

      const agencyMap = {};
      for (const p of projects) {
        const agId = p.implementing_agency_id || 'UNASSIGNED';
        if (!agencyMap[agId]) {
          agencyMap[agId] = { work_count: 0, total_value: 0 };
        }
        agencyMap[agId].work_count++;
        agencyMap[agId].total_value += p.sanctioned_cost || p.estimated_cost || 0;
      }

      for (const [agId, data] of Object.entries(agencyMap)) {
        const share = totalValue > 0 ? (data.total_value / totalValue) * 100 : 0;
        const roundedShare = Math.round(share * 10) / 10;
        const hhiContrib = Math.round(roundedShare * roundedShare);
        const flagged = roundedShare > 35.0;

        agenciesData.push({
          agency_id: agId,
          name: agId,
          type: 'OTHER',
          work_count: data.work_count,
          total_value: data.total_value,
          share_of_value_percentage: roundedShare,
          is_concentration_flagged: flagged,
          herfindahl_index_contribution: hhiContrib,
        });
      }
    }

    // Compute Herfindahl-Hirschman Index (HHI) = sum of squared market shares (0-10,000)
    const herfindahlIndex = agenciesData.reduce(
      (sum, a) => sum + (a.herfindahl_index_contribution || 0),
      0
    );

    // Concentration level categorization per standard antitrust & economic guidelines
    let concentrationLevel = 'COMPETITIVE';
    let concentrationSummary = 'Work distribution is diversified across multiple executing agencies.';
    if (herfindahlIndex > 2500) {
      concentrationLevel = 'HIGH';
      concentrationSummary =
        'High market concentration detected. One or few agencies hold a dominant share of public works outlay.';
    } else if (herfindahlIndex >= 1500) {
      concentrationLevel = 'MODERATE';
      concentrationSummary = 'Moderate concentration observed across public executing agencies.';
    }

    // Sort agencies by share of value descending
    agenciesData.sort((a, b) => b.share_of_value_percentage - a.share_of_value_percentage);

    // Attempt AI Microservice evaluation with robust deterministic fallback
    try {
      const aiPayload = {
        district,
        state,
        year: String(year),
        agency_shares: agenciesData.map((a) => ({
          agency_id: a.agency_id,
          name: a.name,
          work_count: a.work_count,
          total_value: a.total_value,
          share_of_value_percentage: a.share_of_value_percentage,
          is_concentration_flagged: a.is_concentration_flagged,
          herfindahl_index_contribution: a.herfindahl_index_contribution,
        })),
      };
      const aiResult = await aiClient.checkAgencyConcentration(aiPayload);
      if (aiResult?.available && aiResult?.data?.herfindahl_index !== undefined) {
        return {
          ...aiResult.data,
          total_district_outlay: totalValue,
          total_active_works: totalWorks,
          flagged_agencies_count: aiResult.data.agencies.filter((a) => a.is_concentration_flagged).length,
          computed_at: new Date().toISOString(),
          engine: 'AI_MICROSERVICE',
        };
      }
    } catch (err) {
      logger.debug('AI service agency concentration offline, using deterministic Node engine', { error: err.message });
    }

    return {
      product: 'AGENCY_CONCENTRATION',
      district,
      state,
      year: String(year),
      total_district_outlay: totalValue,
      total_active_works: totalWorks,
      herfindahl_index: herfindahlIndex,
      concentration_level: concentrationLevel,
      concentration_summary: concentrationSummary,
      concentration_threshold_percentage: 35.0,
      flagged_agencies_count: agenciesData.filter((a) => a.is_concentration_flagged).length,
      agencies: agenciesData,
      computed_at: new Date().toISOString(),
      engine: 'DETERMINISTIC_NODE',
    };
  }
}

module.exports = new AgencyIntelligenceService();
