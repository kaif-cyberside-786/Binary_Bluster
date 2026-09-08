/**
 * Project Compliance Evaluator
 * Deterministic orchestrator running scheme rules and persisting findings to compliance_findings.
 * Zero AI / Non-Model pipeline.
 */
const crypto = require('crypto');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  UtilizationCertificate,
  Document,
  ComplianceFinding,
} = require('../../models');
const { evaluateRequiredFields } = require('./rules/requiredFields');
const { evaluateDocCompleteness } = require('./rules/docCompleteness');
const { evaluateUcOverdue } = require('./rules/ucOverdue');
const { evaluatePaymentProgressMismatch } = require('./rules/paymentProgressMismatch');
const { evaluateCostDrift } = require('./rules/costDrift');
const { evaluateStalledProgress } = require('./rules/stalledProgress');
const logger = require('../../utils/logger');

async function evaluateProject(projectId, user = null) {
  const normalizedId = (projectId || '').trim().toUpperCase();

  const [
    project,
    recommendation,
    engineeringReports,
    progressHistory,
    payments,
    utilizationCertificates,
    documents,
  ] = await Promise.all([
    Project.findOne({ project_id: normalizedId }).lean(),
    ProjectRecommendation.findOne({ project_id: normalizedId }).lean(),
    EngineeringReport.find({ project_id: normalizedId }).sort({ version: -1, created_at: -1 }).lean(),
    ProjectProgress.find({ project_id: normalizedId }).sort({ created_at: -1 }).lean(),
    ProjectPayment.find({ project_id: normalizedId }).sort({ created_at: -1 }).lean(),
    UtilizationCertificate.find({ project_id: normalizedId }).sort({ created_at: -1 }).lean(),
    Document.find({ project_id: normalizedId }).sort({ uploaded_at: -1 }).lean(),
  ]);

  if (!project) {
    throw new Error(`Project '${normalizedId}' not found`);
  }

  // Evaluate pure rules
  const ruleResults = [
    evaluateRequiredFields(project, recommendation),
    evaluateDocCompleteness(project, engineeringReports, documents),
    evaluateUcOverdue(project, payments, utilizationCertificates),
    evaluatePaymentProgressMismatch(project, payments, progressHistory),
    evaluateCostDrift(project, engineeringReports),
    evaluateStalledProgress(project, progressHistory),
  ];

  // Determine overall status
  let overallStatus = 'COMPLIANT';
  let nonCompliantCount = 0;
  let reviewRequiredCount = 0;
  let compliantCount = 0;

  for (const r of ruleResults) {
    if (r.status === 'NON_COMPLIANT') {
      overallStatus = 'NON_COMPLIANT';
      nonCompliantCount++;
    } else if (r.status === 'REVIEW_REQUIRED') {
      if (overallStatus !== 'NON_COMPLIANT') {
        overallStatus = 'REVIEW_REQUIRED';
      }
      reviewRequiredCount++;
    } else {
      compliantCount++;
    }
  }

  const evaluatedAt = new Date();
  const evaluatedBy = user?.user_id || 'SYSTEM';

  // Persist findings to compliance_findings collection (upsert per project + rule)
  const persistedFindings = [];
  for (const r of ruleResults) {
    const findingId = `CMP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const filter = { project_id: normalizedId, rule_id: r.rule_id };
    const updateDoc = {
      $set: {
        mp_id: project.mp_id,
        district: project.district,
        state: project.state,
        rule_category: r.rule_category,
        status: r.status,
        severity: r.severity,
        title: r.title,
        message: r.message,
        evidence: r.evidence,
        evaluated_at: evaluatedAt,
        evaluated_by: evaluatedBy,
      },
      $setOnInsert: {
        finding_id: findingId,
      },
    };

    const updated = await ComplianceFinding.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();

    persistedFindings.push(updated);
  }

  logger.info(
    `Evaluated compliance for ${normalizedId}: ${overallStatus} (${compliantCount} compliant, ${reviewRequiredCount} review req, ${nonCompliantCount} non-compliant)`
  );

  return {
    project_id: normalizedId,
    overall_status: overallStatus,
    summary: {
      compliant_count: compliantCount,
      review_required_count: reviewRequiredCount,
      non_compliant_count: nonCompliantCount,
      total_rules: ruleResults.length,
    },
    findings: persistedFindings,
    evaluated_at: evaluatedAt,
    evaluated_by: evaluatedBy,
  };
}

module.exports = {
  evaluateProject,
};

