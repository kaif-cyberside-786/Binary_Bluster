/**
 * AI Orchestration Service (Phase 8 & Phase 9)
 * Assembles project data, queries in-jurisdiction peer works,
 * dispatches analysis requests to the Python AI service, executes the explainable
 * Risk Engine aggregation, obtains natural language explanation via AI Gateway,
 * and persists append-only findings in ai_risk_flags, current combined risk in
 * ai_risk_scores, and timeline snapshots in ai_analysis_history.
 * Complies with architecture.md §4, §10.1, §13, §15.5 and rules.md §4, §10, §12.
 */
const crypto = require('crypto');
const aiClient = require('./aiClient');
const riskEngine = require('./riskEngine');
const aiGateway = require('./aiGateway');
const logger = require('../utils/logger');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  ComplianceFinding,
  AiRiskFlag,
  AiRiskScore,
  AiAnalysisHistory,
} = require('../models');

class AiOrchestrator {
  /**
   * Run comprehensive Phase 9 risk and historical intelligence analysis on a project
   */
  async analyzeProject(projectId, user) {
    const pId = projectId.trim().toUpperCase();
    const project = await Project.findOne({ project_id: pId }).lean();
    if (!project) {
      throw new Error(`Project '${pId}' not found`);
    }

    // 1. Gather project context and related domain collections
    const [recommendation, engineeringReports, progressHistory, payments, complianceFindings] = await Promise.all([
      ProjectRecommendation.findOne({ project_id: pId }).lean(),
      EngineeringReport.find({ project_id: pId }).sort({ version: -1 }).lean(),
      ProjectProgress.find({ project_id: pId }).sort({ reported_at: -1 }).lean(),
      ProjectPayment.find({ project_id: pId, status: { $in: ['APPROVED', 'DISBURSED'] } }).lean(),
      ComplianceFinding.find({ project_id: pId }).lean(),
    ]);

    const latestDpr = engineeringReports.length > 0 ? engineeringReports[0] : null;
    const latestProgress = progressHistory.length > 0 ? progressHistory[0] : null;

    // 2. Query in-jurisdiction peer works for cost benchmark (AI-01)
    const peerDistrict = (project.district || '').trim();
    const peerQuery = {
      project_id: { $ne: pId },
      category: project.category,
      state: project.state,
    };
    if (peerDistrict) {
      peerQuery.district = { $regex: new RegExp(`^${peerDistrict}$`, 'i') };
    }

    const peerProjects = await Project.find(peerQuery)
      .select('estimated_cost sanctioned_cost status')
      .limit(50)
      .lean();

    const peerCosts = peerProjects
      .map((p) => p.sanctioned_cost || p.estimated_cost)
      .filter((c) => typeof c === 'number' && c > 0);

    // 3. Query candidate projects for duplicate detection (AI-02)
    // Corpus MUST include other projects in the same district/jurisdiction across all lifecycle stages:
    // DISTRICT_REVIEW, CLARIFICATION_REQUIRED, HELD, SANCTIONED, IN_PROGRESS, COMPLETED
    const candidateDistrict = (project.district || '').trim();
    const candidateQuery = {
      project_id: { $ne: pId },
    };

    if (candidateDistrict) {
      candidateQuery.district = { $regex: new RegExp(`^${candidateDistrict}$`, 'i') };
    } else if (project.state && project.state.trim()) {
      candidateQuery.state = { $regex: new RegExp(`^${project.state.trim()}$`, 'i') };
    }

    // Include pre-sanction and active/completed projects; exclude only self
    candidateQuery.status = {
      $in: [
        'SUBMITTED',
        'DISTRICT_REVIEW',
        'CLARIFICATION_REQUIRED',
        'CLARIFICATION_REQUESTED',
        'HELD',
        'SANCTIONED',
        'TECHNICAL_SANCTION_PENDING',
        'INSPECTION_REQUESTED',
        'IN_PROGRESS',
        'COMPLETED',
      ],
    };

    const candidateProjects = await Project.find(candidateQuery)
      .select('project_id title description category district location ward block status sanctioned_cost estimated_cost')
      .sort({ updated_at: -1, created_at: -1 })
      .limit(100)
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

    const targetLocation = typeof project.location === 'string' ? project.location : '';
    const targetWard = project.ward || recommendation?.location?.village_ward || '';
    const targetBlock = project.block || recommendation?.location?.block || '';

    const duplicatePayload = {
      target_project: {
        project_id: project.project_id,
        title: project.title,
        description: project.description || recommendation?.description || '',
        category: project.category || recommendation?.work_category || '',
        district: project.district || '',
        location: targetLocation || targetWard || '',
        ward: targetWard || '',
        block: targetBlock || '',
        status: project.status,
        sanctioned_cost: project.sanctioned_cost || project.estimated_cost || recommendation?.estimated_cost || null,
      },
      candidate_projects: candidateProjects.map((c) => ({
        project_id: c.project_id,
        title: c.title,
        description: c.description || '',
        category: c.category || '',
        district: c.district || '',
        location: (typeof c.location === 'string' ? c.location : '') || c.ward || '',
        ward: c.ward || '',
        block: c.block || '',
        status: c.status || '',
        sanctioned_cost: c.sanctioned_cost || c.estimated_cost || null,
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
        overall_score: null,
        risk_level: null,
      };
    }

    // 8. Process raw signals from Python service
    const rawSignals = [
      costRes.data,
      dupRes.data,
      specRes.data,
      delayRes.data,
      paymentRes.data,
    ].filter(Boolean);

    // 9. Execute Explainable Risk Engine Aggregation (Phase 9)
    const riskAssessment = riskEngine.aggregateRisk(project, rawSignals, complianceFindings);

    // 10. Request Natural Language Explanation via AI Gateway (with de-identified evidence)
    const explanationResult = await aiGateway.generateExplanation({
      overallScore: riskAssessment.overall_score,
      riskLevel: riskAssessment.risk_level,
      category: project.category,
      topContributors: riskAssessment.top_contributors,
      evidence: riskAssessment.evidence,
    });

    const analysisId = `ANALYSIS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // 11. Persist individual findings in ai_risk_flags (append-only)
    const storedFlags = [];
    for (const sig of rawSignals) {
      const flagId = `FLAG-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const flagDoc = {
        flag_id: flagId,
        analysis_id: analysisId,
        project_id: pId,
        flag_type: sig.signal_type,
        risk_score: sig.score,
        severity: sig.severity,
        explanation: sig.message,
        model_or_rule: sig.model_or_rule,
        signals: sig.evidence || {},
        evidence: sig.evidence || {},
        source: 'PYTHON_AI_SERVICE',
        status: 'ACTIVE',
        is_real_government_data: Boolean(project.is_real_government_data),
        is_synthetic: Boolean(project.is_synthetic),
      };

      await AiRiskFlag.create(flagDoc);
      storedFlags.push(flagDoc);
    }

    // 12. Upsert current combined risk in ai_risk_scores
    await AiRiskScore.findOneAndUpdate(
      { project_id: pId },
      {
        project_id: pId,
        overall_score: riskAssessment.overall_score,
        risk_level: riskAssessment.risk_level,
        component_scores: riskAssessment.component_scores,
        signals: riskAssessment.signals,
        top_contributors: riskAssessment.top_contributors,
        contributing_signals: riskAssessment.evaluated_signals.map((s) => ({
          signal_name: s.type,
          weight: s.weight,
          score: s.score,
          explanation: s.reason,
        })),
        explanation: explanationResult.explanation,
        ai_status: explanationResult.status,
        analysis_id: analysisId,
        computed_at: new Date(),
        is_real_government_data: Boolean(project.is_real_government_data),
        is_synthetic: Boolean(project.is_synthetic),
      },
      { upsert: true, new: true }
    );

    // 13. Persist historical timeline snapshot in ai_analysis_history (append-only)
    const historyId = `HIST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await AiAnalysisHistory.create({
      history_id: historyId,
      analysis_id: analysisId,
      project_id: pId,
      overall_score: riskAssessment.overall_score,
      risk_level: riskAssessment.risk_level,
      component_scores: riskAssessment.component_scores,
      signals: riskAssessment.signals,
      top_contributors: riskAssessment.top_contributors,
      explanation: explanationResult.explanation,
      status: explanationResult.status === 'AI_ANALYSIS_COMPLETE' ? 'COMPLETED' : 'DEGRADED',
      version: '1.0.0',
      triggered_by: user?.user_id || 'SYSTEM_TRIGGER',
      computed_at: new Date(),
      is_real_government_data: Boolean(project.is_real_government_data),
      is_synthetic: Boolean(project.is_synthetic),
    });

    logger.info(`Phase 9 Risk assessment evaluated for ${pId}`, {
      analysisId,
      overallScore: riskAssessment.overall_score,
      riskLevel: riskAssessment.risk_level,
      aiStatus: explanationResult.status,
      flagsCount: storedFlags.length,
    });

    return {
      available: true,
      status: 'OK',
      analysis_id: analysisId,
      overall_score: riskAssessment.overall_score,
      risk_level: riskAssessment.risk_level,
      provisional_level: riskAssessment.risk_level, // Phase 8 test backward compatibility
      component_scores: riskAssessment.component_scores,
      signals: riskAssessment.signals,
      top_contributors: riskAssessment.top_contributors,
      explanation: explanationResult.explanation,
      ai_status: explanationResult.status,
      flags: storedFlags,
      evaluated_at: new Date(),
    };
  }

  /**
   * Retrieve current combined risk score for a project
   */
  async getProjectRisk(projectId) {
    const pId = projectId.trim().toUpperCase();
    const riskScore = await AiRiskScore.findOne({ project_id: pId }).lean();
    return riskScore;
  }

  /**
   * Retrieve historical risk evaluations for a project (chronological)
   */
  async getProjectRiskHistory(projectId) {
    const pId = projectId.trim().toUpperCase();
    const history = await AiAnalysisHistory.find({ project_id: pId })
      .sort({ computed_at: -1 })
      .lean();
    return history;
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
