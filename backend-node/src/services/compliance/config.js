/**
 * Deterministic Compliance Engine Configuration
 * Scheme norms, statutory quotas, and analytical thresholds per MPLADS guidelines
 * Zero AI / Non-Model parameters.
 */
module.exports = {
  // Utilization Certificate (UC) Norms (CAG compliance)
  ucOverdueDays: 90, // Days after payment disbursement before UC is flagged overdue
  ucPendingGraceDays: 30, // Days after disbursement before warning starts

  // Payment vs Progress Mismatch (Execution Consistency)
  // If disbursed percentage exceeds physical progress percentage by these deltas:
  paymentProgressMismatchWarnPct: 20, // Disbursed% - Progress% >= 20% -> REVIEW_REQUIRED
  paymentProgressMismatchErrorPct: 40, // Disbursed% - Progress% >= 40% -> NON_COMPLIANT

  // Engineering Cost Drift (DPR vs Sanction/Recommendation)
  costDriftWarnPct: 10, // DPR estimate exceeds sanctioned cost by > 10% -> REVIEW_REQUIRED
  costDriftErrorPct: 25, // DPR estimate exceeds sanctioned cost by > 25% -> NON_COMPLIANT

  // Timeline / Stalled Progress Norms
  stalledProgressWarnDays: 90, // Active project with no progress update for > 90 days -> REVIEW_REQUIRED
  stalledProgressErrorDays: 180, // Active project with no progress update for > 180 days -> NON_COMPLIANT

  // Statutory SC/ST Earmarking Quotas per MPLADS Guidelines
  scQuotaTargetPct: 15.0, // Minimum 15% of annual allocation for SC areas
  scQuotaWarnPct: 10.0, // Below 10% when significant funds recommended -> REVIEW_REQUIRED
  stQuotaTargetPct: 7.5, // Minimum 7.5% of annual allocation for ST areas
  stQuotaWarnPct: 5.0, // Below 5% when significant funds recommended -> REVIEW_REQUIRED
  minAllocationBaselineForStrictQuota: 10000000, // ₹1.00 Crore before strict non-compliance triggers
};

