/**
 * Rule: PAYMENT_PROGRESS_MISMATCH
 * Deterministic check for financial disbursements vs physical progress alignment
 * Category: FINANCIAL
 */
const config = require('../config');

function evaluatePaymentProgressMismatch(project, payments = [], progressHistory = []) {
  const costBasis = Number(project.sanctioned_cost || project.estimated_cost) || 0;

  if (costBasis <= 0) {
    return {
      rule_id: 'PAYMENT_PROGRESS_MISMATCH',
      rule_category: 'FINANCIAL',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Payment vs Physical Progress Alignment',
      message: 'Project has zero or missing sanctioned cost baseline.',
      evidence: { cost_basis: costBasis },
    };
  }

  const disbursedPayments = payments.filter(
    (p) => p.status === 'APPROVED' || p.status === 'DISBURSED'
  );
  const totalDisbursed = disbursedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const disbursedPct = (totalDisbursed / costBasis) * 100;

  // Latest physical progress percentage
  const latestProgress = progressHistory.length > 0 ? progressHistory[0] : null;
  const physicalPct = Number(latestProgress?.percent_complete) || 0;

  const gapPct = disbursedPct - physicalPct;

  if (gapPct >= config.paymentProgressMismatchErrorPct) {
    return {
      rule_id: 'PAYMENT_PROGRESS_MISMATCH',
      rule_category: 'FINANCIAL',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'Payment vs Physical Progress Alignment',
      message: `Severe disbursement mismatch: ${disbursedPct.toFixed(1)}% disbursed while physical progress is only ${physicalPct.toFixed(1)}% (gap: +${gapPct.toFixed(1)}%).`,
      evidence: {
        total_disbursed: totalDisbursed,
        cost_basis: costBasis,
        disbursed_percent: Number(disbursedPct.toFixed(1)),
        physical_percent: Number(physicalPct.toFixed(1)),
        gap_percent: Number(gapPct.toFixed(1)),
        error_threshold: config.paymentProgressMismatchErrorPct,
      },
    };
  }

  if (gapPct >= config.paymentProgressMismatchWarnPct) {
    return {
      rule_id: 'PAYMENT_PROGRESS_MISMATCH',
      rule_category: 'FINANCIAL',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Payment vs Physical Progress Alignment',
      message: `Disbursement leads physical milestones: ${disbursedPct.toFixed(1)}% disbursed vs ${physicalPct.toFixed(1)}% physical progress (gap: +${gapPct.toFixed(1)}%).`,
      evidence: {
        total_disbursed: totalDisbursed,
        cost_basis: costBasis,
        disbursed_percent: Number(disbursedPct.toFixed(1)),
        physical_percent: Number(physicalPct.toFixed(1)),
        gap_percent: Number(gapPct.toFixed(1)),
        warn_threshold: config.paymentProgressMismatchWarnPct,
      },
    };
  }

  return {
    rule_id: 'PAYMENT_PROGRESS_MISMATCH',
    rule_category: 'FINANCIAL',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Payment vs Physical Progress Alignment',
    message: `Disbursements and physical progress are consistent (${disbursedPct.toFixed(1)}% disbursed, ${physicalPct.toFixed(1)}% physical progress).`,
    evidence: {
      total_disbursed: totalDisbursed,
      cost_basis: costBasis,
      disbursed_percent: Number(disbursedPct.toFixed(1)),
      physical_percent: Number(physicalPct.toFixed(1)),
      gap_percent: Number(gapPct.toFixed(1)),
    },
  };
}

module.exports = {
  evaluatePaymentProgressMismatch,
};

