/**
 * Rule: REQUIRED_FIELDS
 * Deterministic check for project data integrity and mandatory scheme fields
 * Category: ELIGIBILITY
 */
const { PROJECT_CATEGORIES } = require('../../../models/Project');

function evaluateRequiredFields(project, recommendation) {
  const missing = [];

  if (!project.title || typeof project.title !== 'string' || project.title.trim().length < 5) {
    missing.push('title (minimum 5 characters)');
  }

  if (!project.category || !PROJECT_CATEGORIES.includes(project.category)) {
    missing.push(`category (must be one of: ${PROJECT_CATEGORIES.slice(0, 4).join(', ')}...)`);
  }

  const cost = Number(project.estimated_cost);
  if (isNaN(cost) || cost <= 0) {
    missing.push('estimated_cost (must be greater than 0)');
  }

  if (!project.district || typeof project.district !== 'string' || !project.district.trim()) {
    missing.push('district');
  }

  if (!project.state || typeof project.state !== 'string' || !project.state.trim()) {
    missing.push('state');
  }

  const description = recommendation?.description || project.description;
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    missing.push('description (minimum 10 characters detailing proposed work)');
  }

  if (missing.length > 0) {
    return {
      rule_id: 'REQUIRED_FIELDS',
      rule_category: 'ELIGIBILITY',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'Mandatory Scheme Fields & Eligibility',
      message: `Missing or invalid mandatory fields: ${missing.join(', ')}.`,
      evidence: {
        missing_fields: missing,
        estimated_cost: cost,
        category: project.category,
        district: project.district,
        state: project.state,
      },
    };
  }

  return {
    rule_id: 'REQUIRED_FIELDS',
    rule_category: 'ELIGIBILITY',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Mandatory Scheme Fields & Eligibility',
    message: 'All mandatory project fields, category classification, and cost estimates are valid.',
    evidence: {
      category: project.category,
      estimated_cost: cost,
      district: project.district,
      state: project.state,
    },
  };
}

module.exports = {
  evaluateRequiredFields,
};

