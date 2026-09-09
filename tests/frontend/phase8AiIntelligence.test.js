/**
 * Automated tests for Phase 8 Frontend AI Historical Intelligence
 * Verifies architecture.md §10.1, §13, design.md §5.19, §5.39, and rules.md §4, §10, §12
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 8 Frontend AI Historical Intelligence Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('AiHistoricalIntelligencePanel.jsx exists and exports component', () => {
    const filePath = path.join(frontendSrc, 'components/AiHistoricalIntelligencePanel.jsx');
    assert.ok(fs.existsSync(filePath), 'AiHistoricalIntelligencePanel.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export function AiHistoricalIntelligencePanel'), 'Component must be exported');
    assert.ok(content.includes('authFetch'), 'Must use authenticated fetch');
    assert.ok(content.includes('handleRunAnalysis'), 'Must provide analysis re-run trigger');
  });

  test('AiHistoricalIntelligencePanel.jsx uses RiskBadge and NOT ComplianceBadge per design.md §5.19 & §5.39', () => {
    const filePath = path.join(frontendSrc, 'components/AiHistoricalIntelligencePanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('RiskBadge'), 'Must use RiskBadge for AI findings');
    assert.ok(!content.includes('ComplianceBadge'), 'Must NOT use ComplianceBadge for AI findings (reserved for Phase 6 deterministic rules)');
  });

  test('AiHistoricalIntelligencePanel.jsx enforces advisory language per rules.md §12', () => {
    const filePath = path.join(frontendSrc, 'components/AiHistoricalIntelligencePanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('ADVISORY ONLY'), 'Must include prominent ADVISORY ONLY tag');
    assert.ok(content.includes('sole decision authority'), 'Must emphasize official sole authority');
    // Ensure no improper fraud or enforcement claims
    assert.ok(!content.includes('Fraud confirmed'), 'Must never claim fraud confirmed');
    assert.ok(!content.includes('Raid required'), 'Must never demand raids');
  });

  test('AiHistoricalIntelligencePanel.jsx handles AI_ANALYSIS_UNAVAILABLE without faking LOW risk', () => {
    const filePath = path.join(frontendSrc, 'components/AiHistoricalIntelligencePanel.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AI_ANALYSIS_UNAVAILABLE'), 'Must handle AI_ANALYSIS_UNAVAILABLE state');
    assert.ok(content.includes('AI Analysis Service Unavailable'), 'Must display honest unavailable banner');
  });

  test('ProjectDetailModal.jsx integrates AI Intelligence tab and preview card', () => {
    const filePath = path.join(frontendSrc, 'components/ProjectDetailModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AiHistoricalIntelligencePanel'), 'Must import AiHistoricalIntelligencePanel');
    assert.ok(content.includes('ai_intelligence'), 'Must define ai_intelligence tab');
    assert.ok(content.includes('AI Intelligence'), 'Must have AI Intelligence tab title');
  });

  test('DistrictWorkspace.jsx integrates AI panel in Review & Sanction modal', () => {
    const filePath = path.join(frontendSrc, 'workspaces/DistrictWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('AiHistoricalIntelligencePanel'), 'DistrictWorkspace must import AiHistoricalIntelligencePanel');
    assert.ok(content.includes('<AiHistoricalIntelligencePanel'), 'Must render AiHistoricalIntelligencePanel in modal');
  });

  test('Admin Isolation: AdminWorkspace.jsx contains NO AI risk findings or panels per rules.md §10', () => {
    const filePath = path.join(frontendSrc, 'workspaces/AdminWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(!content.includes('AiHistoricalIntelligencePanel'), 'Admin must not import AI panel');
    assert.ok(!content.includes('ai_findings'), 'Admin must not query AI findings');
    assert.ok(!content.includes('RiskBadge'), 'Admin must not display AI risk badges');
  });
});

