/**
 * Centralized Signal Weights and Risk Level Thresholds Configuration (Phase 9)
 * Strict, deterministic governance parameters per architecture.md §13 and rules.md §12.
 * Never allow arbitrary frontend or client-side manipulation of weights.
 */

const RISK_WEIGHTS = Object.freeze({
  COST_ANOMALY: 0.25,
  DUPLICATE_RISK: 0.25,
  SPECIFICATION_DEVIATION: 0.15,
  PAYMENT_PROGRESS_ANOMALY: 0.15,
  DELAY_RISK: 0.10,
  COMPLIANCE: 0.10,
  HISTORICAL_PATTERN: 0.00, // Extensible for future predictive models
});

const RISK_THRESHOLDS = Object.freeze({
  LOW_MAX: 39,
  MEDIUM_MAX: 74,
  HIGH_MIN: 75,
});

/**
 * Categorize a 0-100 overall risk score into canonical levels
 * LOW: 0–39 | MEDIUM: 40–74 | HIGH: 75–100
 */
function getRiskLevel(score) {
  const s = Math.round(Number(score) || 0);
  if (s >= RISK_THRESHOLDS.HIGH_MIN) {
    return 'HIGH';
  }
  if (s >= RISK_THRESHOLDS.LOW_MAX + 1) {
    return 'MEDIUM';
  }
  return 'LOW';
}

module.exports = {
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  getRiskLevel,
};

