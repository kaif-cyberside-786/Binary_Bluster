/**
 * Rule: COST_DRIFT
 * Deterministic check for detailed engineering estimate drift vs sanctioned outlay
 * Category: FINANCIAL
 */
const config = require('../config');

function evaluateCostDrift(project, engineeringReports = []) {
  const baseline = Number(project.sanctioned_cost || project.estimated_cost) || 0;

  if (baseline <= 0 || engineeringReports.length === 0) {
    return {
      rule_id: 'COST_DRIFT',
      rule_category: 'FINANCIAL',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'Engineering DPR Cost Drift',
      message: 'No engineering DPR estimate recorded yet; baseline sanction stands.',
      evidence: {
        baseline_cost: baseline,
        engineering_reports_count: engineeringReports.length,
      },
    };
  }

  const latestDpr = engineeringReports[0];
  const latestEstimate = Number(latestDpr.detailed_estimate) || 0;

  if (latestEstimate <= 0) {
    return {
      rule_id: 'COST_DRIFT',
      rule_category: 'FINANCIAL',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'Engineering DPR Cost Drift',
      message: 'Latest engineering estimate has no positive estimate value.',
      evidence: { baseline_cost: baseline, latest_estimate: latestEstimate },
    };
  }

  const costGrowthPct = ((latestEstimate - baseline) / baseline) * 100;

  if (costGrowthPct > config.costDriftErrorPct) {
    return {
      rule_id: 'COST_DRIFT',
      rule_category: 'FINANCIAL',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'Engineering DPR Cost Drift',
      message: `Major cost overrun: DPR estimate of ₹${(latestEstimate / 100000).toFixed(2)} Lakh exceeds baseline by +${costGrowthPct.toFixed(1)}% (tolerance: ${config.costDriftErrorPct}%).`,
      evidence: {
        baseline_cost: baseline,
        latest_estimate: latestEstimate,
        growth_percent: Number(costGrowthPct.toFixed(1)),
        tolerance_percent: config.costDriftErrorPct,
        dpr_version: latestDpr.version || 'v1',
      },
    };
  }

  if (costGrowthPct > config.costDriftWarnPct) {
    return {
      rule_id: 'COST_DRIFT',
      rule_category: 'FINANCIAL',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Engineering DPR Cost Drift',
      message: `Cost drift observed: DPR estimate of ₹${(latestEstimate / 100000).toFixed(2)} Lakh exceeds baseline by +${costGrowthPct.toFixed(1)}% (tolerance: ${config.costDriftWarnPct}%).`,
      evidence: {
        baseline_cost: baseline,
        latest_estimate: latestEstimate,
        growth_percent: Number(costGrowthPct.toFixed(1)),
        tolerance_percent: config.costDriftWarnPct,
        dpr_version: latestDpr.version || 'v1',
      },
    };
  }

  return {
    rule_id: 'COST_DRIFT',
    rule_category: 'FINANCIAL',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Engineering DPR Cost Drift',
    message: `Engineering DPR estimate (₹${(latestEstimate / 100000).toFixed(2)} Lakh) is within approved outlay limits (${costGrowthPct > 0 ? `+${costGrowthPct.toFixed(1)}%` : `${costGrowthPct.toFixed(1)}%`}).`,
    evidence: {
      baseline_cost: baseline,
      latest_estimate: latestEstimate,
      growth_percent: Number(costGrowthPct.toFixed(1)),
      dpr_version: latestDpr.version || 'v1',
    },
  };
}

module.exports = {
  evaluateCostDrift,
};

