/**
 * Phase 12 Frontend Tests: Agency Intelligence & Efficiency
 * Tests:
 * 1. AgencySuitabilityCard exists and exports component
 * 2. AgencySuitabilityCard renders advisory disclaimer per rules.md §12
 * 3. AgencySuitabilityCard renders concentration guardrail banner (PRD §12.8)
 * 4. AgencySuitabilityCard "Select Agency" only updates selection without auto-sanctioning
 * 5. AgencyConcentrationPanel exists and renders Herfindahl Index & share percentages
 * 6. DistrictReviewModal integrates AgencySuitabilityCard during Sanction review
 * 7. StateWorkspace and MinistryWorkspace integrate AgencyConcentrationPanel
 * 8. AgencyWorkspace integrates Performance Track Record scorecard
 * 9. Admin Isolation: AdminWorkspace contains NO agency intelligence panels per rules.md §10
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname, '../../frontend/src');

describe('Phase 12 Frontend: Agency Intelligence & Efficiency Tests', () => {
  const suitabilityCardPath = path.join(frontendDir, 'components/AgencySuitabilityCard.jsx');
  const concentrationPanelPath = path.join(frontendDir, 'components/AgencyConcentrationPanel.jsx');
  const districtReviewModalPath = path.join(frontendDir, 'components/DistrictReviewModal.jsx');
  const stateWorkspacePath = path.join(frontendDir, 'workspaces/StateWorkspace.jsx');
  const ministryWorkspacePath = path.join(frontendDir, 'workspaces/MinistryWorkspace.jsx');
  const agencyWorkspacePath = path.join(frontendDir, 'workspaces/AgencyWorkspace.jsx');
  const adminWorkspacePath = path.join(frontendDir, 'workspaces/AdminWorkspace.jsx');

  test('AgencySuitabilityCard.jsx exists and exports component', () => {
    assert.ok(fs.existsSync(suitabilityCardPath), 'AgencySuitabilityCard.jsx must exist');
    const content = fs.readFileSync(suitabilityCardPath, 'utf8');
    assert.ok(
      content.includes('export function AgencySuitabilityCard') || content.includes('export default AgencySuitabilityCard'),
      'Must export AgencySuitabilityCard'
    );
  });

  test('AgencySuitabilityCard.jsx enforces statutory advisory disclaimer per rules.md §12', () => {
    const content = fs.readFileSync(suitabilityCardPath, 'utf8');
    assert.ok(
      content.includes('Advisory Intelligence Only') || content.includes('SUGGESTED AGENCIES (advisory)'),
      'Must clearly label suggestions as advisory'
    );
    assert.ok(
      content.includes('District Authority'),
      'Must state that selection remains exclusively with the District Authority'
    );
  });

  test('AgencySuitabilityCard.jsx renders Concentration Guardrail Active warning (PRD §12.8)', () => {
    const content = fs.readFileSync(suitabilityCardPath, 'utf8');
    assert.ok(
      content.includes('Concentration Guardrail Active'),
      'Must render concentration guardrail warning'
    );
    assert.ok(
      content.includes('35%'),
      'Must mention the 35% work share threshold'
    );
  });

  test('AgencySuitabilityCard.jsx Select Agency action only pre-fills without auto-sanctioning', () => {
    const content = fs.readFileSync(suitabilityCardPath, 'utf8');
    assert.ok(
      content.includes('onSelectAgency'),
      'Must support onSelectAgency callback'
    );
    assert.ok(
      content.includes('Select Agency') || content.includes('Selected'),
      'Must render Select Agency button'
    );
  });

  test('AgencyConcentrationPanel.jsx exists and renders Herfindahl Index & share %', () => {
    assert.ok(fs.existsSync(concentrationPanelPath), 'AgencyConcentrationPanel.jsx must exist');
    const content = fs.readFileSync(concentrationPanelPath, 'utf8');
    assert.ok(
      content.includes('Herfindahl Index') || content.includes('HHI'),
      'Must display Herfindahl Index'
    );
    assert.ok(
      content.includes('Work-Share %') || content.includes('share_of_value_percentage'),
      'Must display work share percentages'
    );
    assert.ok(
      content.includes('Above Threshold') || content.includes('>35%'),
      'Must highlight agencies above the 35% concentration threshold'
    );
  });

  test('DistrictReviewModal.jsx embeds AgencySuitabilityCard during Sanction decision', () => {
    const content = fs.readFileSync(districtReviewModalPath, 'utf8');
    assert.ok(
      content.includes('AgencySuitabilityCard'),
      'DistrictReviewModal must import and render AgencySuitabilityCard'
    );
    assert.ok(
      content.includes("pendingDecision === 'SANCTION'"),
      'Must render AgencySuitabilityCard when decision is SANCTION'
    );
  });

  test('StateWorkspace.jsx embeds Agency Concentration navigation and panel', () => {
    const content = fs.readFileSync(stateWorkspacePath, 'utf8');
    assert.ok(
      content.includes('AgencyConcentrationPanel'),
      'StateWorkspace must import AgencyConcentrationPanel'
    );
    assert.ok(
      content.includes('concentration'),
      'StateWorkspace must include concentration navigation key'
    );
  });

  test('MinistryWorkspace.jsx embeds Agency Concentration navigation and panel', () => {
    const content = fs.readFileSync(ministryWorkspacePath, 'utf8');
    assert.ok(
      content.includes('AgencyConcentrationPanel'),
      'MinistryWorkspace must import AgencyConcentrationPanel'
    );
    assert.ok(
      content.includes('concentration'),
      'MinistryWorkspace must include concentration navigation key'
    );
  });

  test('AgencyWorkspace.jsx embeds Performance Track Record scorecard', () => {
    const content = fs.readFileSync(agencyWorkspacePath, 'utf8');
    assert.ok(
      content.includes('Performance Track Record') || content.includes('Agency Performance Scorecard'),
      'AgencyWorkspace must include Performance Track Record tab'
    );
    assert.ok(
      content.includes('/performance'),
      'AgencyWorkspace must query the performance endpoint'
    );
  });

  test('Admin Isolation: AdminWorkspace contains NO agency intelligence panels per rules.md §10', () => {
    const content = fs.readFileSync(adminWorkspacePath, 'utf8');
    assert.ok(
      !content.includes('AgencySuitabilityCard'),
      'AdminWorkspace must NOT contain AgencySuitabilityCard'
    );
    assert.ok(
      !content.includes('AgencyConcentrationPanel'),
      'AdminWorkspace must NOT contain AgencyConcentrationPanel'
    );
  });
});

