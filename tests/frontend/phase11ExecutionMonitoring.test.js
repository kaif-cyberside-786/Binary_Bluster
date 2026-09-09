/**
 * Automated tests for Phase 11 Frontend: Continuous Execution Monitoring
 * Verifies ExecutionMonitoringCard component, ProjectDetailModal integration,
 * physical vs payment discrepancy gap rendering, advisory disclaimer, and Admin isolation.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 11 Frontend: Continuous Execution Monitoring Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('ExecutionMonitoringCard.jsx exists and exports default ExecutionMonitoringCard', () => {
    const filePath = path.join(frontendSrc, 'components/ExecutionMonitoringCard.jsx');
    assert.ok(fs.existsSync(filePath), 'ExecutionMonitoringCard.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export default function ExecutionMonitoringCard'), 'Must export default ExecutionMonitoringCard');
    assert.ok(content.includes('authFetch'), 'Must use authenticated fetch');
  });

  test('ExecutionMonitoringCard.jsx connects to live monitoring API endpoints', () => {
    const filePath = path.join(frontendSrc, 'components/ExecutionMonitoringCard.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('/api/projects/${projectId}/monitoring'), 'Must fetch monitoring telemetry');
    assert.ok(content.includes('/api/projects/${projectId}/monitoring/evaluate'), 'Must support on-demand evaluate');
  });

  test('ExecutionMonitoringCard.jsx renders physical vs financial progress comparison & discrepancy gap', () => {
    const filePath = path.join(frontendSrc, 'components/ExecutionMonitoringCard.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Physical Progress'), 'Must display physical progress label');
    assert.ok(content.includes('Financial Disbursed'), 'Must display financial disbursed label');
    assert.ok(content.includes('Discrepancy Gap'), 'Must display discrepancy gap label');
    assert.ok(content.includes('RiskBadge'), 'Must render RiskBadge for execution risk level');
  });

  test('ExecutionMonitoringCard.jsx strictly enforces advisory disclaimer per rules.md §12', () => {
    const filePath = path.join(frontendSrc, 'components/ExecutionMonitoringCard.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Advisory Only'), 'Must display explicit advisory notice');
    assert.ok(content.includes('Administrative Discretion Required'), 'Must emphasize administrative official discretion');
    assert.ok(!content.includes('auto-close') && !content.includes('autoClose'), 'Must not auto-close works');
  });

  test('ProjectDetailModal.jsx integrates ExecutionMonitoringCard in progress tab', () => {
    const filePath = path.join(frontendSrc, 'components/ProjectDetailModal.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes("import ExecutionMonitoringCard from './ExecutionMonitoringCard'"), 'Must import ExecutionMonitoringCard');
    assert.ok(content.includes('<ExecutionMonitoringCard'), 'Must render ExecutionMonitoringCard in modal');
  });

  test('Admin Isolation: AdminWorkspace.jsx contains NO ExecutionMonitoringCard or execution metrics per rules.md §10', () => {
    const filePath = path.join(frontendSrc, 'workspaces/AdminWorkspace.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(!content.includes('ExecutionMonitoringCard'), 'AdminWorkspace must not import ExecutionMonitoringCard');
    assert.ok(!content.includes('discrepancy_gap'), 'AdminWorkspace must not contain discrepancy gap calculations');
    assert.ok(!content.includes('/api/projects/monitoring/active'), 'AdminWorkspace must not access execution monitoring queues');
  });
});

