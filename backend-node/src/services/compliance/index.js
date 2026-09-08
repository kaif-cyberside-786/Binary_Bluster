/**
 * Compliance Service Index
 * Central export for deterministic compliance rules and evaluation services.
 */
const config = require('./config');
const { evaluateRequiredFields } = require('./rules/requiredFields');
const { evaluateDocCompleteness } = require('./rules/docCompleteness');
const { evaluateUcOverdue } = require('./rules/ucOverdue');
const { evaluatePaymentProgressMismatch } = require('./rules/paymentProgressMismatch');
const { evaluateCostDrift } = require('./rules/costDrift');
const { evaluateStalledProgress } = require('./rules/stalledProgress');
const { evaluateScStMix } = require('./rules/scStMix');
const { evaluateProject } = require('./evaluator');
const { evaluateMpScStStatus } = require('./scStEvaluator');

module.exports = {
  config,
  rules: {
    evaluateRequiredFields,
    evaluateDocCompleteness,
    evaluateUcOverdue,
    evaluatePaymentProgressMismatch,
    evaluateCostDrift,
    evaluateStalledProgress,
    evaluateScStMix,
  },
  evaluateProject,
  evaluateMpScStStatus,
};

