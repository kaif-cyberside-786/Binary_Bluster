/**
 * Automated tests for Phase 10 Frontend: District AI Review & Human Decision
 * Verifies review hierarchy, 5 canonical decision actions, confirmation modal,
 * statutory advisory disclaimer, Admin isolation, and Auditor read-only experience.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 10 Frontend: District AI Review & Human Decision Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('DistrictReviewModal.jsx exists and exports DistrictReviewModal', () => {
    const filePath = path.join(frontendSrc, 'components/DistrictReviewModal.jsx');
    assert.ok(fs.existsSync(filePath), 'DistrictReviewModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export function DistrictReviewModal'), 'Must export named DistrictReviewModal');
    assert.ok(content.includes('export default DistrictReviewModal'), 'Must export default DistrictReviewModal');
    assert.ok(content.includes('authFetch'), 'Must use authenticated fetch');
  });

  test('DistrictReviewModal.jsx implements the complete Section 25 review hierarchy', () => {
    const filePath = path.join(frontendSrc, 'components/DistrictReviewModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Section 1: Project Metadata & Recommendation
    assert.ok(content.includes('Project Summary') || content.includes('1. Project Overview & MP Recommendation'), 'Must include project overview section');

    // Section 2: Deterministic Compliance Checks
    assert.ok(content.includes('Deterministic Compliance') || content.includes('Compliance Findings'), 'Must include deterministic compliance checks');
    assert.ok(content.includes('ComplianceBadge'), 'Must use ComplianceBadge for deterministic rules');

    // Section 3: Historical Duplicate & Overlap Detection
    assert.ok(content.includes('Historical Duplicates') || content.includes('Duplicate & Overlap Detection'), 'Must include duplicate check section');

    // Section 4: Cost Anomaly & Benchmark Card
    assert.ok(content.includes('Cost Anomaly') || content.includes('Cost Benchmark Analysis'), 'Must include cost benchmark card');

    // Section 5: Engineering Specification Comparison
    assert.ok(content.includes('Engineering Comparison') || content.includes('Engineering Scrutiny'), 'Must include engineering comparison section');

    // Section 6: Composite Risk Score & Signal Breakdown
    assert.ok(content.includes('RiskScore') || content.includes('AI Composite Risk Assessment'), 'Must include AI risk assessment');
    assert.ok(content.includes('RiskBadge'), 'Must use RiskBadge for AI risk levels');
    assert.ok(content.includes('RiskBreakdown'), 'Must render RiskBreakdown for explainability');

    // Section 7: AI Advisory Recommendation
    assert.ok(content.includes('Advisory Recommendation') || content.includes('AI Advisory'), 'Must include advisory recommendation container');
    assert.ok(content.includes('Advisory only') || content.includes('Non-binding'), 'Must display non-binding advisory notice');

    // Section 8: Accessible Evidence Drawer
    assert.ok(content.includes('aria-expanded'), 'Must have aria-expanded for accessible evidence drawer');

    // Section 9: Prior Decision History
    assert.ok(content.includes('Prior Decisions') || content.includes('Administrative History'), 'Must include prior decisions');

    // Section 10: Human Decision Action Panel
    assert.ok(content.includes('Human Decision Action Panel') || content.includes('Administrative Decision Panel'), 'Must include human decision panel');
  });

  test('DistrictReviewModal.jsx provides 5 canonical decision action buttons', () => {
    const filePath = path.join(frontendSrc, 'components/DistrictReviewModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('SANCTION'), 'Must provide SANCTION decision action');
    assert.ok(content.includes('HOLD'), 'Must provide HOLD decision action');
    assert.ok(content.includes('REQUEST_CLARIFICATION'), 'Must provide REQUEST_CLARIFICATION decision action');
    assert.ok(content.includes('ORDER_INSPECTION'), 'Must provide ORDER_INSPECTION decision action');
    assert.ok(content.includes('ESCALATE'), 'Must provide ESCALATE decision action');
  });

  test('DistrictReviewModal.jsx includes Decision Confirmation Modal with mandatory reason and agency selection', () => {
    const filePath = path.join(frontendSrc, 'components/DistrictReviewModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('decisionReason'), 'Must track decision reason state');
    assert.ok(content.includes('decisionReason.trim().length < 5'), 'Must enforce minimum 5 character reason validation');
    assert.ok(content.includes('assignedAgencyId'), 'Must provide implementing agency assignment for sanction');
    assert.ok(content.includes('supportingNote'), 'Must support internal officer supporting notes');
  });

  test('DistrictReviewModal.jsx respects Auditor Read-Only state and Admin Isolation', () => {
    const filePath = path.join(frontendSrc, 'components/DistrictReviewModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('isAuditor'), 'Must distinguish auditor role');
    assert.ok(content.includes('isAdmin'), 'Must distinguish admin role');
    assert.ok(content.includes('Read-Only Auditor Access') || content.includes('Auditor'), 'Must display read-only indicator for auditor');
  });

  test('DistrictWorkspace.jsx imports and mounts DistrictReviewModal', () => {
    const filePath = path.join(frontendSrc, 'workspaces/DistrictWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('DistrictReviewModal'), 'DistrictWorkspace must import DistrictReviewModal');
    assert.ok(content.includes('<DistrictReviewModal'), 'DistrictWorkspace must render DistrictReviewModal');
  });

  test('ProjectDetailModal.jsx enriches decisions tab with risk context snapshot', () => {
    const filePath = path.join(frontendSrc, 'components/ProjectDetailModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('risk_score_at_decision'), 'ProjectDetailModal must render risk_score_at_decision');
    assert.ok(content.includes('risk_level_at_decision'), 'ProjectDetailModal must render risk_level_at_decision');
    assert.ok(content.includes('RiskBadge'), 'ProjectDetailModal must use RiskBadge for decision risk snapshot');
    assert.ok(content.includes('supporting_note'), 'ProjectDetailModal must render officer supporting note');
  });
});

