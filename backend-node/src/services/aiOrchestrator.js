/**
 * AI Orchestration Service
 * Assembles project data, queries in-jurisdiction peer works,
 * dispatches analysis requests to the Python AI service, and persists
 * append-only findings in ai_risk_flags and ai_analysis_history.
 * Complies with architecture.md §4, §13, and rules.md §4, §10, §12.
 */
const crypto = require('crypto');
const aiClient = require('./aiClient');
const logger = require('../utils/logger');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  AiRiskFlag,
  AiAnalysisHistory,
} = require('../models');

class AiOrchestrator {
  /**
   * Run Phase 8 historical intelligence analysis on a single project
   */
  async analyzeProject(projectId, user) {
    const pId = projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: pId }).lean();
    if (!project) {
      throw new Error(`Project '${pId}' not found`);
    }

    // 1. Gather project context from related collections
    const [recommendation, engineeringReports, progressHistory, payments] = await Promise.all([
      ProjectRecommendation.findOne({ project_id: pId }).lean(),
      EngineeringReport.find({ project_id: pId }).sort({ version: -1 }).lean(),
      ProjectProgress.find({ project_id: pId }).sort({ reported_at: -1 }).lean(),
      ProjectPayment.find({ project_id: pId, status: { $in: ['APPROVED', 'DISBURSED'] } }).lean(),
    ]);

    const latestDpr = engineeringReports.length > 0 ? engineeringReports[0] : null;
    const latestProgress = progressHistory.length > 0 ? progressHistory[0] : null;

    // 2. Query in-jurisdiction peer works for cost benchmark (AI-01)
    // Filter peers by category and district/state
    const peerQuery = {
      project_id: { $ne: pId },
      category: project.category,
      state: project.state,
    };
    if (project.district) {
      peerQuery.district = project.district;
    }

    const peerProjects = await Project.find(peerQuery)
      .select('estimated_cost sanctioned_cost status')
      .limit(50)
      .lean();

    const peerCosts = peerProjects
      .map((p) => p.sanctioned_cost || p.estimated_cost)
      .filter((c) => typeof c === 'number' && c > 0);

    // 3. Query candidate projects for duplicate detection (AI-02)
    // Same district or constituency works, active or completed
    const candidateProjects = await Project.find({
      project_id: { $ne: pId },
      district: project.district,
    })
      .select('project_id title description category district location ward block status sanctioned_cost')
      .limit(30)
      .lean();

    // 4. Compute temporal features for delay check (AI-04)
    const now = Date.now();
    let daysSinceLastProgress = null;
    if (latestProgress && latestProgress.reported_at) {
      daysSinceLastProgress = Math.max(0, Math.floor((now - new Date(latestProgress.reported_at).getTime()) / (1000 * 60 * 60 * 24)));
    } else if (project.sanctioned_date) {
      daysSinceLastProgress = Math.max(0, Math.floor((now - new Date(project.sanctioned_date).getTime()) / (1000 * 60 * 60 * 24)));
    }

    let daysSinceSanction = null;
    if (project.sanctioned_date) {
      daysSinceSanction = Math.max(0, Math.floor((now - new Date(project.sanctioned_date).getTime()) / (1000 * 60 * 60 * 24)));
    } else if (project.created_at) {
      daysSinceSanction = Math.max(0, Math.floor((now - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    }

    // 5. Total disbursed for payment check (AI-05)
    const totalDisbursed = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 6. Build payloads for Python microservice
    const costPayload = {
      proposed_cost: project.estimated_cost || recommendation?.estimated_cost || 0,
      peer_costs: peerCosts,
      category: project.category,
      district: project.district,
      state: project.state,
    };

    const duplicatePayload = {
      target_project: {
        project_id: project.project_id,
        title: project.title,
        description: project.description || recommendation?.description || '',
        category: project.category || '',
        district: project.district || '',
        location: project.location || '',
        ward: project.ward || '',
        block: project.block || '',
        status: project.status,
      },
      candidate_projects: candidateProjects.map((c) => ({
        project_id: c.project_id,
        title: c.title,
        description: c.description || '',
        category: c.category || '',
        district: c.district || '',
        location: c.location || '',
        ward: c.ward || '',
        block: c.block || '',
        status: c.status || '',
        sanctioned_cost: c.sanctioned_cost || null,
      })),
      similarity_threshold: 0.30,
    };

    const specPayload = {
      estimated_cost: recommendation?.estimated_cost || project.estimated_cost || 0,
      detailed_estimate: latestDpr ? latestDpr.detailed_estimate : (project.estimated_cost || 0),
      recommendation_description: recommendation?.description || project.description || '',
      engineering_remarks: latestDpr ? (latestDpr.remarks || latestDpr.scope_remarks || '') : '',
      prior_estimates: engineeringReports.slice(1).map((r) => r.detailed_estimate),
    };

    const delayPayload = {
      project_status: project.status,
      days_since_last_progress: daysSinceLastProgress,
      days_since_sanction: daysSinceSanction,
      percent_complete: latestProgress ? latestProgress.percent_complete : 0,
      expected_duration_days: 180,
    };

    const paymentPayload = {
      sanctioned_cost: project.sanctioned_cost || project.estimated_cost || 0,
      total_disbursed: totalDisbursed,
      percent_complete: latestProgress ? latestProgress.percent_complete : 0,
    };

    // 7. Dispatch requests concurrently to Python AI Service
    const [costRes, dupRes, specRes, delayRes, paymentRes] = await Promise.all([
      aiClient.checkCostAnomaly(costPayload),
      aiClient.checkDuplicates(duplicatePayload),
      latestDpr ? aiClient.checkSpecComparison(specPayload) : Promise.resolve({ available: true, data: null }),
      aiClient.checkDelay(delayPayload),
      aiClient.checkPaymentProgress(paymentPayload),
    ]);

    // Check if AI service was offline or failed
    const checks = [costRes, dupRes, delayRes, paymentRes];
    if (latestDpr) checks.push(specRes);

    const anyUnavailable = checks.some((c) => !c.available);
    if (anyUnavailable) {
      logger.warn(`AI Analysis for project ${pId} degraded: AI service offline or timed out`);
      return {
        available: false,
        status: 'AI_ANALYSIS_UNAVAILABLE',
        message: 'AI analysis service is temporarily unavailable. Structured project information is still shown.',
        flags: [],
      };
    }

    // 8. Process valid signals and prepare append-only records
    const rawSignals = [
      costRes.data,
      dupRes.data,
      specRes.data,
      delayRes.data,
      paymentRes.data,
    ].filter(Boolean);

    const storedFlags = [];
    const componentScores = {};

    for (const sig of rawSignals) {
      const flagId = `FLAG-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const flagDoc = {
        flag_id: flagId,
        project_id: pId,
        flag_type: sig.signal_type,
        risk_score: sig.score,
        severity: sig.severity,
        explanation: sig.message,
        model_or_rule: sig.model_or_rule,
        signals: sig.evidence || {},
        is_real_government_data: Boolean(project.is_real_government_data),
        is_synthetic: Boolean(project.is_synthetic),
      };

      await AiRiskFlag.create(flagDoc);
      storedFlags.push(flagDoc);

      const componentKey = sig.signal_type.toLowerCase();
      componentScores[componentKey] = sig.score;
    }

    // Determine highest provisional severity and mean score
    const scores = rawSignals.map((s) => s.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    let maxSeverity = 'LOW';
    if (rawSignals.some((s) => s.severity === 'HIGH')) {
      maxSeverity = 'HIGH';
    } else if (rawSignals.some((s) => s.severity === 'MEDIUM')) {
      maxSeverity = 'MEDIUM';
    }

    // 9. Save historical evaluation record
    const historyId = `HIST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await AiAnalysisHistory.create({
      history_id: historyId,
      project_id: pId,
      overall_score: avgScore, // Provisional signal-level average (Phase 9 implements weighted risk engine)
      risk_level: maxSeverity,
      component_scores: componentScores,
      triggered_by: user?.user_id || 'SYSTEM_TRIGGER',
      computed_at: new Date(),
      is_real_government_data: Boolean(project.is_real_government_data),
      is_synthetic: Boolean(project.is_synthetic),
    });

    logger.info(`AI Historical Intelligence analysis completed for ${pId}`, {
      flagsGenerated: storedFlags.length,
      maxSeverity,
    });

    return {
      available: true,
      status: 'OK',
      provisional_level: maxSeverity,
      flags: storedFlags,
      evaluated_at: new Date(),
    };
  }

  /**
   * Retrieve stored AI risk flags for a project
   */
  async getProjectFlags(projectId) {
    const pId = projectId.trim().toUpperCase();
    const flags = await AiRiskFlag.find({ project_id: pId })
      .sort({ created_at: -1 })
      .lean();

    return flags;
  }
}

module.exports = new AiOrchestrator();

