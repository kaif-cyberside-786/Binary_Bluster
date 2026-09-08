/**
 * Rule: DOC_COMPLETENESS
 * Deterministic check for required technical documentation (DPR & Sanction Orders)
 * Category: DOCUMENTATION
 */
function evaluateDocCompleteness(project, engineeringReports = [], documents = []) {
  const status = project.status;
  const executionStatuses = ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'];

  // Early lifecycle stages do not strictly require DPR yet
  if (!executionStatuses.includes(status)) {
    return {
      rule_id: 'DOC_COMPLETENESS',
      rule_category: 'DOCUMENTATION',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'Documentation & DPR Completeness',
      message: `Project is in preliminary stage '${status}'; technical DPR submission is pending administrative sanction.`,
      evidence: {
        current_status: status,
        engineering_reports_count: engineeringReports.length,
        documents_count: documents.length,
      },
    };
  }

  const hasDprReport = engineeringReports.length > 0;
  const hasUploadedDocs = documents.length > 0;

  if (!hasDprReport) {
    return {
      rule_id: 'DOC_COMPLETENESS',
      rule_category: 'DOCUMENTATION',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Documentation & DPR Completeness',
      message: `Project is sanctioned in '${status}' status but has no registered Detailed Project Report (DPR) or technical estimate.`,
      evidence: {
        current_status: status,
        engineering_reports_count: 0,
        documents_count: documents.length,
        missing: ['Engineering DPR'],
      },
    };
  }

  return {
    rule_id: 'DOC_COMPLETENESS',
    rule_category: 'DOCUMENTATION',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Documentation & DPR Completeness',
    message: `Mandatory technical estimates and DPR documentation complete (${engineeringReports.length} report version(s), ${documents.length} document(s)).`,
    evidence: {
      current_status: status,
      engineering_reports_count: engineeringReports.length,
      latest_version: engineeringReports[0]?.version || 'v1',
      documents_count: documents.length,
    },
  };
}

module.exports = {
  evaluateDocCompleteness,
};

