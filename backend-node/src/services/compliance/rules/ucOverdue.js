/**
 * Rule: UC_OVERDUE
 * Deterministic check for Utilization Certificate submission per CAG audit findings
 * Category: FINANCIAL
 */
const config = require('../config');

function evaluateUcOverdue(project, payments = [], utilizationCertificates = []) {
  const now = Date.now();
  const disbursedPayments = payments.filter(
    (p) => p.status === 'APPROVED' || p.status === 'DISBURSED'
  );

  const totalDisbursed = disbursedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const filedUcs = utilizationCertificates.filter((uc) => uc.is_filed !== false);
  const totalUcCertified = filedUcs.reduce((sum, uc) => sum + (Number(uc.amount_certified) || 0), 0);

  // If no funds disbursed yet, UC is not due
  if (totalDisbursed === 0) {
    return {
      rule_id: 'UC_OVERDUE',
      rule_category: 'FINANCIAL',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'Utilization Certificate (UC) Compliance',
      message: 'No project disbursements recorded yet; Utilization Certificate is not due.',
      evidence: {
        total_disbursed: 0,
        total_uc_certified: totalUcCertified,
        uncovered_amount: 0,
        disbursed_installments_count: 0,
      },
    };
  }

  const uncoveredAmount = Math.max(0, totalDisbursed - totalUcCertified);

  // Check age of uncovered payments
  let maxOverdueDays = 0;
  let hasPendingWithinGrace = false;

  for (const p of disbursedPayments) {
    const paymentDate = p.payment_date || p.created_at || new Date();
    const daysElapsed = Math.floor((now - new Date(paymentDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysElapsed > config.ucOverdueDays) {
      const overdueDelta = daysElapsed - config.ucOverdueDays;
      if (overdueDelta > maxOverdueDays) {
        maxOverdueDays = overdueDelta;
      }
    } else {
      hasPendingWithinGrace = true;
    }
  }

  // If uncovered amount exists and exceeds 90-day threshold
  if (uncoveredAmount > 0 && maxOverdueDays > 0) {
    return {
      rule_id: 'UC_OVERDUE',
      rule_category: 'FINANCIAL',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'Utilization Certificate (UC) Compliance',
      message: `Utilization Certificate overdue by ${maxOverdueDays} days for ₹${(uncoveredAmount / 100000).toFixed(2)} Lakh disbursed funds.`,
      evidence: {
        total_disbursed: totalDisbursed,
        total_uc_certified: totalUcCertified,
        uncovered_amount: uncoveredAmount,
        days_overdue: maxOverdueDays,
        threshold_days: config.ucOverdueDays,
      },
    };
  }

  // If uncovered amount exists but within 90-day grace period
  if (uncoveredAmount > 0) {
    return {
      rule_id: 'UC_OVERDUE',
      rule_category: 'FINANCIAL',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Utilization Certificate (UC) Compliance',
      message: `Utilization Certificate pending for ₹${(uncoveredAmount / 100000).toFixed(2)} Lakh disbursed funds within the 90-day statutory grace period.`,
      evidence: {
        total_disbursed: totalDisbursed,
        total_uc_certified: totalUcCertified,
        uncovered_amount: uncoveredAmount,
        grace_period_days: config.ucOverdueDays,
      },
    };
  }

  return {
    rule_id: 'UC_OVERDUE',
    rule_category: 'FINANCIAL',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Utilization Certificate (UC) Compliance',
    message: `All disbursed funds (₹${(totalDisbursed / 100000).toFixed(2)} Lakh) fully covered by filed Utilization Certificates.`,
    evidence: {
      total_disbursed: totalDisbursed,
      total_uc_certified: totalUcCertified,
      uncovered_amount: 0,
      filed_uc_count: filedUcs.length,
    },
  };
}

module.exports = {
  evaluateUcOverdue,
};

