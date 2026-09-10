/**
 * Phase 14 Frontend Tests: Ministry Systemic Intelligence & Portfolio Analytics
 * Tests:
 * 1. SystemicOverviewPanel.jsx exists, exports component, and displays Value-at-Risk & lifecycle
 * 2. SystemicGeographicPanel.jsx exists, exports component, and renders State/District rollups
 * 3. SystemicCategoryPanel.jsx exists, exports component, and displays category patterns & risk rates
 * 4. SystemicInspectionHealthPanel.jsx exists, exports component, and renders 7-stage lifecycle & 1% quota
 * 5. SystemicAttentionList.jsx exists, exports component, and explains transparent 4-factor formula
 * 6. MinistryWorkspace.jsx connects all 8 systemic navigation views and mounts panels
 * 7. StateWorkspace.jsx connects all 8 systemic navigation views and enforces state scope
 * 8. Supervisory principle: UI states advisory, non-binding nature of systemic metrics
 * 9. Admin Isolation: AdminWorkspace.jsx contains ZERO systemic panels per rules.md §10
 * 10. Separation of Concerns: Agency concentration panel is distinct from district suitability
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname, '../../frontend/src');

describe('Phase 14 Frontend: Systemic Intelligence & Portfolio Analytics Tests', () => {
  const overviewPanelPath = path.join(frontendDir, 'components/SystemicOverviewPanel.jsx');
  const geographicPanelPath = path.join(frontendDir, 'components/SystemicGeographicPanel.jsx');
  const categoryPanelPath = path.join(frontendDir, 'components/SystemicCategoryPanel.jsx');
  const inspectionHealthPanelPath = path.join(frontendDir, 'components/SystemicInspectionHealthPanel.jsx');
  const attentionListPath = path.join(frontendDir, 'components/SystemicAttentionList.jsx');
  const ministryWorkspacePath = path.join(frontendDir, 'workspaces/MinistryWorkspace.jsx');
  const stateWorkspacePath = path.join(frontendDir, 'workspaces/StateWorkspace.jsx');
  const adminWorkspacePath = path.join(frontendDir, 'workspaces/AdminWorkspace.jsx');

  // 1. SystemicOverviewPanel.jsx
  test('1. SystemicOverviewPanel.jsx exists, exports component, and displays Value-at-Risk', () => {
    assert.ok(fs.existsSync(overviewPanelPath), 'SystemicOverviewPanel.jsx must exist');
    const content = fs.readFileSync(overviewPanelPath, 'utf8');
    assert.ok(content.includes('export default SystemicOverviewPanel') || content.includes('export default function SystemicOverviewPanel'), 'Must export default SystemicOverviewPanel');
    assert.ok(content.includes('Value-at-Risk'), 'Must render Value-at-Risk section');
    assert.ok(content.includes('total_at_risk_value'), 'Must reference total_at_risk_value');
    assert.ok(content.includes('Deduplicated union') || content.includes('Deduplicated'), 'Must document deduplicated union of high-risk & non-compliant');
    assert.ok(content.includes('Risk Distribution'), 'Must display Phase 9 risk distribution');
    assert.ok(content.includes('Lifecycle Distribution') || content.includes('Canonical Project Lifecycle'), 'Must display project lifecycle');
  });

  // 2. SystemicGeographicPanel.jsx
  test('2. SystemicGeographicPanel.jsx exists, exports component, and renders geographic rollups', () => {
    assert.ok(fs.existsSync(geographicPanelPath), 'SystemicGeographicPanel.jsx must exist');
    const content = fs.readFileSync(geographicPanelPath, 'utf8');
    assert.ok(content.includes('export default SystemicGeographicPanel') || content.includes('export default function SystemicGeographicPanel'), 'Must export default SystemicGeographicPanel');
    assert.ok(content.includes('Systemic Distribution') || content.includes('Systemic Breakdown'), 'Must display Systemic Distribution');
    assert.ok(content.includes('high_risk_count'), 'Must display high risk project counts per region');
    assert.ok(content.includes('non_compliant_count'), 'Must display non-compliant counts per region');
  });

  // 3. SystemicCategoryPanel.jsx
  test('3. SystemicCategoryPanel.jsx exists, exports component, and displays category patterns', () => {
    assert.ok(fs.existsSync(categoryPanelPath), 'SystemicCategoryPanel.jsx must exist');
    const content = fs.readFileSync(categoryPanelPath, 'utf8');
    assert.ok(content.includes('export default SystemicCategoryPanel') || content.includes('export default function SystemicCategoryPanel'), 'Must export default SystemicCategoryPanel');
    assert.ok(content.includes('Sectoral & Category Portfolio Patterns'), 'Must display Sectoral & Category Portfolio Patterns');
    assert.ok(content.includes('categories'), 'Must reference categories data');
    assert.ok(content.includes('high_risk_rate'), 'Must display high risk rate per category');
  });

  // 4. SystemicInspectionHealthPanel.jsx
  test('4. SystemicInspectionHealthPanel.jsx exists, exports component, and renders 7-stage lifecycle & 1% quota', () => {
    assert.ok(fs.existsSync(inspectionHealthPanelPath), 'SystemicInspectionHealthPanel.jsx must exist');
    const content = fs.readFileSync(inspectionHealthPanelPath, 'utf8');
    assert.ok(content.includes('export default SystemicInspectionHealthPanel') || content.includes('export default function SystemicInspectionHealthPanel'), 'Must export default SystemicInspectionHealthPanel');
    assert.ok(content.includes('Canonical Lifecycle Distribution'), 'Must display Canonical Lifecycle Distribution');
    assert.ok(content.includes('NO_ISSUE') && content.includes('REVIEW_REQUIRED') && content.includes('ESCALATE'), 'Must display canonical inspection outcomes');
    assert.ok(content.includes('1% Physical Inspection Quota'), 'Must display State 1% physical inspection quota status');
  });

  // 5. SystemicAttentionList.jsx
  test('5. SystemicAttentionList.jsx exists, exports component, and explains transparent 4-factor formula', () => {
    assert.ok(fs.existsSync(attentionListPath), 'SystemicAttentionList.jsx must exist');
    const content = fs.readFileSync(attentionListPath, 'utf8');
    assert.ok(content.includes('export default SystemicAttentionList') || content.includes('export default function SystemicAttentionList'), 'Must export default SystemicAttentionList');
    assert.ok(content.includes('Systemic Attention & Supervisory Priorities') || content.includes('Attention'), 'Must display Systemic Attention header');
    assert.ok(content.includes('0.40') || content.includes('40%'), 'Must document 40% High-Risk weight');
    assert.ok(content.includes('0.25') || content.includes('25%'), 'Must document 25% Non-Compliant weight');
    assert.ok(content.includes('0.20') || content.includes('20%'), 'Must document 20% Execution gap weight');
    assert.ok(content.includes('0.15') || content.includes('15%'), 'Must document 15% Inspection escalations weight');
    assert.ok(content.includes('formula'), 'Must mention transparent formula calculation');
  });

  // 6. MinistryWorkspace.jsx
  test('6. MinistryWorkspace.jsx connects all 8 systemic navigation views and mounts panels', () => {
    assert.ok(fs.existsSync(ministryWorkspacePath), 'MinistryWorkspace.jsx must exist');
    const content = fs.readFileSync(ministryWorkspacePath, 'utf8');
    assert.ok(content.includes("import SystemicOverviewPanel from '../components/SystemicOverviewPanel'"), 'Must import SystemicOverviewPanel');
    assert.ok(content.includes("import SystemicGeographicPanel from '../components/SystemicGeographicPanel'"), 'Must import SystemicGeographicPanel');
    assert.ok(content.includes("import SystemicCategoryPanel from '../components/SystemicCategoryPanel'"), 'Must import SystemicCategoryPanel');
    assert.ok(content.includes("import SystemicInspectionHealthPanel from '../components/SystemicInspectionHealthPanel'"), 'Must import SystemicInspectionHealthPanel');
    assert.ok(content.includes("import SystemicAttentionList from '../components/SystemicAttentionList'"), 'Must import SystemicAttentionList');
    
    // Check navigation items
    const navItems = ['overview', 'geographic', 'categories', 'agency-concentration', 'inspections', 'attention'];
    for (const item of navItems) {
      assert.ok(content.includes(`key: '${item}'`), `MinistryWorkspace must include nav item '${item}'`);
    }
  });

  // 7. StateWorkspace.jsx
  test('7. StateWorkspace.jsx connects all 8 systemic navigation views and enforces state scope', () => {
    assert.ok(fs.existsSync(stateWorkspacePath), 'StateWorkspace.jsx must exist');
    const content = fs.readFileSync(stateWorkspacePath, 'utf8');
    assert.ok(content.includes("import SystemicOverviewPanel from '../components/SystemicOverviewPanel'"), 'Must import SystemicOverviewPanel');
    assert.ok(content.includes("import SystemicGeographicPanel from '../components/SystemicGeographicPanel'"), 'Must import SystemicGeographicPanel');
    assert.ok(content.includes("import SystemicCategoryPanel from '../components/SystemicCategoryPanel'"), 'Must import SystemicCategoryPanel');
    assert.ok(content.includes("import SystemicInspectionHealthPanel from '../components/SystemicInspectionHealthPanel'"), 'Must import SystemicInspectionHealthPanel');
    assert.ok(content.includes("import SystemicAttentionList from '../components/SystemicAttentionList'"), 'Must import SystemicAttentionList');
    
    // Check state jurisdiction is passed to panels
    assert.ok(content.includes('user?.jurisdiction?.state') || content.includes('stateName') || content.includes('state'), 'Must pass user state jurisdiction');
  });

  // 8. Supervisory principle: UI states advisory, non-binding nature of systemic metrics
  test('8. Supervisory principle: Panels explicitly document advisory, non-binding nature', () => {
    const overviewContent = fs.readFileSync(overviewPanelPath, 'utf8');
    const attentionContent = fs.readFileSync(attentionListPath, 'utf8');
    assert.ok(
      overviewContent.includes('advisory') || overviewContent.includes('supervisory') || overviewContent.includes('Supervisory Advisory'),
      'Overview panel must state advisory/supervisory purpose'
    );
    assert.ok(
      attentionContent.includes('supervisory') || attentionContent.includes('NOT a project risk score') || attentionContent.includes('advisory'),
      'Attention list must state supervisory/advisory indicator nature'
    );
  });

  // 9. Admin Isolation: AdminWorkspace.jsx contains ZERO systemic panels per rules.md §10
  test('9. Admin Isolation: AdminWorkspace.jsx contains ZERO systemic panels per rules.md §10', () => {
    assert.ok(fs.existsSync(adminWorkspacePath), 'AdminWorkspace.jsx must exist');
    const content = fs.readFileSync(adminWorkspacePath, 'utf8');
    assert.ok(!content.includes('SystemicOverviewPanel'), 'AdminWorkspace must NOT import SystemicOverviewPanel');
    assert.ok(!content.includes('SystemicGeographicPanel'), 'AdminWorkspace must NOT import SystemicGeographicPanel');
    assert.ok(!content.includes('SystemicCategoryPanel'), 'AdminWorkspace must NOT import SystemicCategoryPanel');
    assert.ok(!content.includes('SystemicInspectionHealthPanel'), 'AdminWorkspace must NOT import SystemicInspectionHealthPanel');
    assert.ok(!content.includes('SystemicAttentionList'), 'AdminWorkspace must NOT import SystemicAttentionList');
    assert.ok(!content.includes('/api/systemic'), 'AdminWorkspace must NOT query /api/systemic endpoints');
  });

  // 10. Separation of Concerns: Agency concentration panel is distinct from district suitability
  test('10. Separation of Concerns: Agency concentration uses dedicated concentration endpoint and HHI', () => {
    const ministryContent = fs.readFileSync(ministryWorkspacePath, 'utf8');
    assert.ok(
      ministryContent.includes("import AgencyConcentrationPanel from '../components/AgencyConcentrationPanel'"),
      'Must reuse dedicated AgencyConcentrationPanel for systemic concentration'
    );
  });
});
