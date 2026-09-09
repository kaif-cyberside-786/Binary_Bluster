/**
 * Explainable Risk Engine (Phase 9)
 * Normalizes individual signals, applies deterministic weights,
 * computes overall project-level risk (0-100, LOW/MEDIUM/HIGH),
 * and extracts ranked contributors and de-identified evidence for the AI Gateway.
 * Adheres to architecture.md §13, §15.5 and rules.md §10, §12.
 */
const { RISK_WEIGHTS, getRiskLevel } = require('../config/riskWeights');

class RiskEngine {
  /**
   * Normalizes and aggregates raw signals into an explainable risk assessment
   * @param {Object} project - Project document
   * @param {Array} rawSignals - Array of signal results from Phase 8 AI checks
   * @param {Array} complianceFindings - Array of compliance findings from Phase 6
   * @returns {Object} Full risk assessment
   */
  aggregateRisk(project, rawSignals = [], complianceFindings = []) {
    // 1. Map raw signals into canonical keys
    const signalMap = {};
    for (const sig of rawSignals) {
      if (!sig) continue;
      const type = (sig.signal_type || sig.flag_type || '').toUpperCase();
      if (type === 'COST_ANOMALY') {
        signalMap.COST_ANOMALY = sig;
      } else if (type === 'DUPLICATE_RISK' || type === 'DUPLICATE_OVERLAP') {
        signalMap.DUPLICATE_RISK = sig;
      } else if (type === 'SPECIFICATION_DEVIATION' || type === 'SPEC_DEVIATION') {
        signalMap.SPECIFICATION_DEVIATION = sig;
      } else if (type === 'PAYMENT_PROGRESS_ANOMALY' || type === 'PAYMENT_PROGRESS_MISMATCH') {
        signalMap.PAYMENT_PROGRESS_ANOMALY = sig;
      } else if (type === 'DELAY_RISK' || type === 'DELAY_STALENESS') {
        signalMap.DELAY_RISK = sig;
      } else if (type === 'HISTORICAL_PATTERN') {
        signalMap.HISTORICAL_PATTERN = sig;
      }
    }

    // 2. Evaluate Phase 6 statutory compliance signal
    let complianceScore = 0;
    let complianceSeverity = 'LOW';
    let complianceReason = 'Statutory SC/ST and timeline guidelines compliant';
    const nonCompliantFindings = complianceFindings.filter((f) => f.status === 'NON_COMPLIANT');
    const reviewRequiredFindings = complianceFindings.filter((f) => f.status === 'REVIEW_REQUIRED');

    if (nonCompliantFindings.length > 0) {
      complianceScore = 100;
      complianceSeverity = 'HIGH';
      complianceReason = `Non-compliance detected in ${nonCompliantFindings.length} statutory rule(s)`;
    } else if (reviewRequiredFindings.length > 0) {
      complianceScore = 50;
      complianceSeverity = 'MEDIUM';
      complianceReason = `Review required for ${reviewRequiredFindings.length} compliance item(s)`;
    }

    // 3. Normalize each signal and compute weighted contributions
    const evaluatedSignals = [];
    const componentScores = {
      cost_anomaly: 0,
      duplicate: 0,
      specification: 0,
      payment_mismatch: 0,
      delay: 0,
      compliance: complianceScore,
      historical_pattern: 0,
      // Backward compatibility aliases
      payment_progress: 0,
      timeline_delay: 0,
      statutory_compliance: complianceScore,
    };

    // Helper to evaluate and record a canonical signal
    const recordSignal = (type, sigObj, defaultReason) => {
      const weight = RISK_WEIGHTS[type] || 0;
      let rawScore = 0;
      let severity = 'LOW';
      let reason = defaultReason;
      let evidence = {};

      if (sigObj) {
        rawScore = Math.max(0, Math.min(100, Math.round(Number(sigObj.score || sigObj.risk_score) || 0)));
        severity = sigObj.severity || (rawScore >= 75 ? 'HIGH' : rawScore >= 40 ? 'MEDIUM' : 'LOW');
        reason = sigObj.message || sigObj.explanation || defaultReason;
        evidence = sigObj.evidence || sigObj.signals || {};
      }

      const weightedContribution = Math.round(rawScore * weight);

      evaluatedSignals.push({
        type,
        score: rawScore,
        normalized_score: rawScore,
        weight,
        weighted_contribution: weightedContribution,
        severity,
        reason,
        evidence,
      });

      return rawScore;
    };

    componentScores.cost_anomaly = recordSignal(
      'COST_ANOMALY',
      signalMap.COST_ANOMALY,
      'Cost within acceptable peer benchmark'
    );

    componentScores.duplicate = recordSignal(
      'DUPLICATE_RISK',
      signalMap.DUPLICATE_RISK,
      'No duplicate or overlapping works detected'
    );

    componentScores.specification = recordSignal(
      'SPECIFICATION_DEVIATION',
      signalMap.SPECIFICATION_DEVIATION,
      'Technical DPR specifications consistent with recommendation'
    );

    componentScores.payment_mismatch = recordSignal(
      'PAYMENT_PROGRESS_ANOMALY',
      signalMap.PAYMENT_PROGRESS_ANOMALY,
      'Financial disbursements commensurate with verified physical progress'
    );
    componentScores.payment_progress = componentScores.payment_mismatch;

    componentScores.delay = recordSignal(
      'DELAY_RISK',
      signalMap.DELAY_RISK,
      'Project execution pace meets expected SLA milestones'
    );
    componentScores.timeline_delay = componentScores.delay;

    // Record statutory compliance
    const complianceWeight = RISK_WEIGHTS.COMPLIANCE || 0.10;
    const complianceContribution = Math.round(complianceScore * complianceWeight);
    evaluatedSignals.push({
      type: 'COMPLIANCE',
      score: complianceScore,
      normalized_score: complianceScore,
      weight: complianceWeight,
      weighted_contribution: complianceContribution,
      severity: complianceSeverity,
      reason: complianceReason,
      evidence: { non_compliant_count: nonCompliantFindings.length, review_count: reviewRequiredFindings.length },
    });

    // Record historical pattern (default 0 for MVP)
    componentScores.historical_pattern = recordSignal(
      'HISTORICAL_PATTERN',
      signalMap.HISTORICAL_PATTERN,
      'Standard historical execution pattern'
    );

    // 4. Calculate overall score (0–100) and canonical risk level
    const overallScore = Math.min(
      100,
      Math.max(
        0,
        evaluatedSignals.reduce((sum, s) => sum + s.weighted_contribution, 0)
      )
    );
    const riskLevel = getRiskLevel(overallScore);

    // 5. Rank top contributors (signals with score > 0, sorted by weighted contribution / score descending)
    const topContributors = evaluatedSignals
      .filter((s) => s.score > 0)
      .sort((a, b) => b.weighted_contribution - a.weighted_contribution || b.score - a.score);

    // 6. Build strictly de-identified evidence payload for AI Gateway (data minimization)
    const deIdentifiedEvidence = this.extractDeIdentifiedEvidence(project, evaluatedSignals);

    return {
      overall_score: overallScore,
      risk_level: riskLevel,
      component_scores: componentScores,
      signals: componentScores,
      evaluated_signals: evaluatedSignals,
      top_contributors: topContributors,
      evidence: deIdentifiedEvidence,
    };
  }

  /**
   * Data Minimization: Extracts only numerical and categorical metrics for LLM explanation.
   * Strictly removes PII, user credentials, applicant names, and raw document dumps per architecture.md §15.5.
   */
  extractDeIdentifiedEvidence(project, evaluatedSignals) {
    const evidence = {
      project_category: project?.category || 'General',
      estimated_cost: project?.estimated_cost || 0,
      sanctioned_cost: project?.sanctioned_cost || null,
      status: project?.status || 'MP_RECOMMENDED',
    };

    for (const sig of evaluatedSignals) {
      if (!sig.evidence) continue;
      const key = sig.type.toLowerCase();
      if (key === 'cost_anomaly') {
        if (sig.evidence.peer_median !== undefined) evidence.peer_median_cost = sig.evidence.peer_median;
        if (sig.evidence.deviation_percent !== undefined) evidence.cost_deviation_percent = sig.evidence.deviation_percent;
        if (sig.evidence.peer_count !== undefined) evidence.peer_comparable_count = sig.evidence.peer_count;
      } else if (key === 'duplicate_risk') {
        const topMatches = sig.evidence.top_matches || [];
        if (topMatches.length > 0) {
          evidence.duplicate_similarity = topMatches[0].similarity_score;
          evidence.matched_candidate_count = topMatches.length;
        }
      } else if (key === 'specification_deviation') {
        if (sig.evidence.cost_drift_percent !== undefined) evidence.specification_deviation_percent = sig.evidence.cost_drift_percent;
      } else if (key === 'payment_progress_anomaly') {
        if (sig.evidence.discrepancy_gap_percent !== undefined) evidence.payment_progress_gap = sig.evidence.discrepancy_gap_percent;
      } else if (key === 'delay_risk') {
        if (sig.evidence.days_since_last_progress !== undefined) evidence.days_since_last_progress = sig.evidence.days_since_last_progress;
        if (sig.evidence.percent_complete !== undefined) evidence.physical_percent_complete = sig.evidence.percent_complete;
      }
    }

    return evidence;
  }
}

module.exports = new RiskEngine();

