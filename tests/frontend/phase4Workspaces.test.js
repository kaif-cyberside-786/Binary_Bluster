/**
 * Automated tests for Phase 4 Frontend Workspaces & Preferences
 * Verifies design.md §5.32, §5.39, rules.md §10, and memory.md
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 4 Frontend Workspaces & Preferences Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('PreferencesContext.jsx exists and defines PreferencesProvider and usePreferences', () => {
    const filePath = path.join(frontendSrc, 'context/PreferencesContext.jsx');
    assert.ok(fs.existsSync(filePath), 'PreferencesContext.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export function PreferencesProvider'), 'PreferencesProvider must be exported');
    assert.ok(content.includes('export function usePreferences'), 'usePreferences must be exported');
    assert.ok(content.includes('sidebar_collapsed'), 'sidebar_collapsed preference must be managed');
    assert.ok(content.includes('table_page_size'), 'table_page_size preference must be managed');
  });

  test('WorkspaceLayout.jsx connects to usePreferences for persistent sidebar state', () => {
    const filePath = path.join(frontendSrc, 'workspaces/WorkspaceLayout.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('usePreferences'), 'WorkspaceLayout must import usePreferences');
    assert.ok(content.includes('toggleSidebar'), 'WorkspaceLayout must use toggleSidebar');
  });

  test('MPWorkspace.jsx includes live recommendation form and real allocation card', () => {
    const filePath = path.join(frontendSrc, 'workspaces/MPWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('+ Recommend New Work'), 'Must have Recommend New Work action');
    assert.ok(content.includes('Constituency Allocation'), 'Must display Constituency Allocation card');
    assert.ok(content.includes('/api/dashboard/mp'), 'Must call /api/dashboard/mp endpoint');
    assert.ok(content.includes('/api/projects/recommendation'), 'Must submit to /api/projects/recommendation');
    assert.ok(content.includes('StatusBadge'), 'Must render canonical StatusBadge');
  });

  test('DistrictWorkspace.jsx includes review queue and decision action modal', () => {
    const filePath = path.join(frontendSrc, 'workspaces/DistrictWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Pending Recommendations Queue'), 'Must display Pending Recommendations Queue');
    assert.ok(content.includes('Review & Decide'), 'Must have Review & Decide action');
    assert.ok(content.includes('/api/dashboard/district'), 'Must call /api/dashboard/district');
    assert.ok(content.includes('/api/projects/'), 'Must interact with /api/projects');
    assert.ok(content.includes('SANCTION'), 'Must support SANCTION decision');
    assert.ok(content.includes('HOLD'), 'Must support HOLD decision');
    assert.ok(content.includes('REQUEST_CLARIFICATION'), 'Must support REQUEST_CLARIFICATION decision');
  });

  test('AdminWorkspace.jsx displays system telemetry and preserves Admin Isolation banner', () => {
    const filePath = path.join(frontendSrc, 'workspaces/AdminWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Admin Isolation Active'), 'Must display Admin Isolation banner');
    assert.ok(content.includes('/api/dashboard/admin'), 'Must call /api/dashboard/admin');
    assert.ok(content.includes('System Telemetry'), 'Must display System Telemetry');
    assert.ok(content.includes('AdminUserManagement'), 'Must render AdminUserManagement component');
  });

  test('State, Ministry, Agency, and Auditor workspaces connect to live dashboard APIs', () => {
    const stateContent = fs.readFileSync(path.join(frontendSrc, 'workspaces/StateWorkspace.jsx'), 'utf8');
    assert.ok(stateContent.includes('/api/dashboard/state'), 'StateWorkspace must call /api/dashboard/state');

    const minContent = fs.readFileSync(path.join(frontendSrc, 'workspaces/MinistryWorkspace.jsx'), 'utf8');
    assert.ok(minContent.includes('/api/dashboard/ministry'), 'MinistryWorkspace must call /api/dashboard/ministry');

    const agencyContent = fs.readFileSync(path.join(frontendSrc, 'workspaces/AgencyWorkspace.jsx'), 'utf8');
    assert.ok(agencyContent.includes('/api/dashboard/agency'), 'AgencyWorkspace must call /api/dashboard/agency');

    const audContent = fs.readFileSync(path.join(frontendSrc, 'workspaces/AuditorWorkspace.jsx'), 'utf8');
    assert.ok(audContent.includes('/api/dashboard/auditor'), 'AuditorWorkspace must call /api/dashboard/auditor');
  });
});

