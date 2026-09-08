/**
 * Rule: SC_ST_MIX
 * Continuous statutory earmarking quota compliance calculation per MPLADS guidelines
 * Minimum 15.0% for SC areas, Minimum 7.5% for ST areas
 * Category: QUOTA
 */
const config = require('../config');

function evaluateScStMix(recommendations = [], scStReferences = [], annualAllocation = 50000000) {
  let totalRecommended = 0;
  let scAmount = 0;
  let stAmount = 0;

  // Build reference lookup table
  const refMap = new Map();
  for (const ref of scStReferences) {
    const key = `${(ref.state || '').toLowerCase()}:${(ref.constituency || ref.district || '').toLowerCase()}`;
    refMap.set(key, ref);
  }

  for (const rec of recommendations) {
    const cost = Number(rec.estimated_cost || rec.sanctioned_cost) || 0;
    totalRecommended += cost;

    // Check classification
    const stateKey = (rec.state || '').toLowerCase();
    const locKey = (rec.constituency || rec.district || '').toLowerCase();
    const ref = refMap.get(`${stateKey}:${locKey}`);

    const isScExplicit =
      rec.location_area_type === 'SC_MAJORITY' ||
      ref?.classification === 'SC_MAJORITY' ||
      (ref?.sc_population_percentage || 0) >= 25.0;

    const isStExplicit =
      rec.location_area_type === 'ST_MAJORITY' ||
      ref?.classification === 'ST_MAJORITY' ||
      (ref?.st_population_percentage || 0) >= 25.0;

    if (isScExplicit) {
      scAmount += cost;
    }
    if (isStExplicit) {
      stAmount += cost;
    }
  }

  const scPct = totalRecommended > 0 ? (scAmount / totalRecommended) * 100 : 0;
  const stPct = totalRecommended > 0 ? (stAmount / totalRecommended) * 100 : 0;

  const scMet = scPct >= config.scQuotaTargetPct;
  const stMet = stPct >= config.stQuotaTargetPct;

  if (scMet && stMet) {
    return {
      rule_id: 'SC_ST_MIX',
      rule_category: 'QUOTA',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'SC/ST Statutory Quota Earmarking',
      message: `SC/ST statutory earmarking compliant: SC ${scPct.toFixed(1)}% (target ≥ 15%), ST ${stPct.toFixed(1)}% (target ≥ 7.5%).`,
      evidence: {
        total_recommended: totalRecommended,
        sc_amount: scAmount,
        st_amount: stAmount,
        sc_percent: Number(scPct.toFixed(1)),
        st_percent: Number(stPct.toFixed(1)),
        sc_target_percent: config.scQuotaTargetPct,
        st_target_percent: config.stQuotaTargetPct,
      },
    };
  }

  if (totalRecommended < config.minAllocationBaselineForStrictQuota) {
    return {
      rule_id: 'SC_ST_MIX',
      rule_category: 'QUOTA',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'SC/ST Statutory Quota Earmarking',
      message: `SC/ST quota in progress: SC ${scPct.toFixed(1)}% of 15% target; ST ${stPct.toFixed(1)}% of 7.5% target (annual cycle ongoing).`,
      evidence: {
        total_recommended: totalRecommended,
        sc_amount: scAmount,
        st_amount: stAmount,
        sc_percent: Number(scPct.toFixed(1)),
        st_percent: Number(stPct.toFixed(1)),
        sc_target_percent: config.scQuotaTargetPct,
        st_target_percent: config.stQuotaTargetPct,
      },
    };
  }

  if (scPct < config.scQuotaWarnPct || stPct < config.stQuotaWarnPct) {
    return {
      rule_id: 'SC_ST_MIX',
      rule_category: 'QUOTA',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'SC/ST Statutory Quota Earmarking',
      message: `SC/ST quota shortfall: SC ${scPct.toFixed(1)}% (short of 15% statutory target), ST ${stPct.toFixed(1)}% (short of 7.5% target).`,
      evidence: {
        total_recommended: totalRecommended,
        sc_amount: scAmount,
        st_amount: stAmount,
        sc_percent: Number(scPct.toFixed(1)),
        st_percent: Number(stPct.toFixed(1)),
        sc_target_percent: config.scQuotaTargetPct,
        st_target_percent: config.stQuotaTargetPct,
      },
    };
  }

  return {
    rule_id: 'SC_ST_MIX',
    rule_category: 'QUOTA',
    status: 'REVIEW_REQUIRED',
    severity: 'MEDIUM',
    title: 'SC/ST Statutory Quota Earmarking',
    message: `SC/ST quota approaching target: SC ${scPct.toFixed(1)}% of 15% target, ST ${stPct.toFixed(1)}% of 7.5% target.`,
    evidence: {
      total_recommended: totalRecommended,
      sc_amount: scAmount,
      st_amount: stAmount,
      sc_percent: Number(scPct.toFixed(1)),
      st_percent: Number(stPct.toFixed(1)),
      sc_target_percent: config.scQuotaTargetPct,
      st_target_percent: config.stQuotaTargetPct,
    },
  };
}

module.exports = {
  evaluateScStMix,
};

