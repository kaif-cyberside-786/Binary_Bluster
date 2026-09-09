/**
 * Automated tests for Phase 9 Frontend: Risk Engine, AI Gateway & Explainable AI
 * Verifies architecture.md §10.1, §13, design.md §5.19, §5.39, and rules.md §4, §10, §12
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 9 Frontend Risk Panel & Explainability Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('AiReviewPanel.jsx exists and exports AiReviewPanel and RiskBreakdown', () => {
    const filePath = path.join(frontendSrc, 'components/AiReviewPanel.jsx');
    assert.ok(fs.existsSync(filePath), 'AiReviewPanel.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export function AiReviewPanel'), 'AiReviewPanel must be exported');
    assert.ok(content.includes('export function RiskBreakdown'), 'RiskBreakdown must be exported');
    assert.ok(content.includes('authFetch'), 'Must use authenticated fetch');
    assert.ok(content.includes('handleRunAnalysis'), 'Must provide risk re-evaluation trigger');
  });

  test('AiReviewPanel.jsx strictly uses RiskBadge and NOT ComplianceBadge per design.md §5.19 & §5.39', () => {
    const filePath = path.join(frontendSrc, 'components/AiReviewPanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('RiskBadge'), 'Must use RiskBadge for AI-derived risk findings');
    assert.ok(!content.includes('ComplianceBadge'), 'Must NOT use ComplianceBadge for AI findings');
  });

  test('AiReviewPanel.jsx supports explicit AI status labels per Phase 9 Section 19', () => {
    const filePath = path.join(frontendSrc, 'components/AiReviewPanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AI ANALYSIS COMPLETE'), 'Must support AI ANALYSIS COMPLETE status label');
    assert.ok(content.includes('AI ANALYSIS UNAVAILABLE'), 'Must support AI ANALYSIS UNAVAILABLE status label');
    assert.ok(content.includes('AI ANALYSIS PENDING'), 'Must support AI ANALYSIS PENDING status label');
  });

  test('AiReviewPanel.jsx enforces advisory language and human-in-the-loop governance per rules.md §12', () => {
    const filePath = path.join(frontendSrc, 'components/AiReviewPanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('final administrative decision belongs strictly to the authorized'), 'Must emphasize human official authority');
    // Ensure no accusatory language
    assert.ok(!content.includes('Fraud confirmed'), 'Must never declare fraud confirmed');
    assert.ok(!content.includes('Corruption detected'), 'Must never declare corruption');
    assert.ok(!content.includes('Project is fake'), 'Must never declare project is fake');
  });

  test('AiReviewPanel.jsx includes accessible structured evidence drawer with aria-expanded', () => {
    const filePath = path.join(frontendSrc, 'components/AiReviewPanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('aria-expanded'), 'Must have aria-expanded for accessible evidence drawer toggle');
    assert.ok(content.includes('showEvidence'), 'Must manage evidence toggle state');
  });

  test('ProjectDetailModal.jsx integrates AiReviewPanel in AI Intelligence tab', () => {
    const filePath = path.join(frontendSrc, 'components/ProjectDetailModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AiReviewPanel'), 'ProjectDetailModal must import AiReviewPanel');
    assert.ok(content.includes('<AiReviewPanel'), 'Must render AiReviewPanel in ProjectDetailModal');
  });

  test('DistrictWorkspace.jsx integrates AiReviewPanel in Review & Sanction modal', () => {
    const filePath = path.join(frontendSrc, 'workspaces/DistrictWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AiReviewPanel'), 'DistrictWorkspace must import AiReviewPanel');
    assert.ok(content.includes('<AiReviewPanel'), 'Must render AiReviewPanel in Review & Sanction modal');
  });

  test('Admin Isolation: AdminWorkspace.jsx contains NO AiReviewPanel or risk calculation components', () => {
    const filePath = path.join(frontendSrc, 'workspaces/AdminWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(!content.includes('AiReviewPanel'), 'Admin must not import AiReviewPanel');
    assert.ok(!content.includes('RiskBreakdown'), 'Admin must not import RiskBreakdown');
    assert.ok(!content.includes('overall_score'), 'Admin must not query overall risk score');
  });
});

