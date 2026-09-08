/**
 * Automated tests for Phase 5 Frontend Components & Project 360 Modal
 * Verifies architecture.md §10.1, §14, design.md §5, and rules.md §4, §10
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Phase 5 Frontend Components & Workspaces Tests', () => {
  const frontendSrc = path.resolve(__dirname, '../../frontend/src');

  test('ProjectDetailModal.jsx exists and exports component', () => {
    const filePath = path.join(frontendSrc, 'components/ProjectDetailModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ProjectDetailModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export function ProjectDetailModal'), 'ProjectDetailModal must be exported');
    assert.ok(content.includes('StatusBadge'), 'Must use StatusBadge');
    assert.ok(content.includes('authFetch'), 'Must use authenticated fetch');
  });

  test('ProjectDetailModal.jsx provides 6 Project 360 tabs', () => {
    const content = fs.readFileSync(path.join(frontendSrc, 'components/ProjectDetailModal.jsx'), 'utf8');
    assert.ok(content.includes("'overview'"), 'Must have Overview tab');
    assert.ok(content.includes("'engineering'"), 'Must have Engineering DPR tab');
    assert.ok(content.includes("'progress'"), 'Must have Physical Progress tab');
    assert.ok(content.includes("'payments'"), 'Must have Disbursements tab');
    assert.ok(content.includes("'documents'"), 'Must have UCs & Docs tab');
    assert.ok(content.includes("'decisions'"), 'Must have Audit Trail tab');
  });

  test('ProjectDetailModal.jsx connects to all Phase 5 backend endpoints', () => {
    const content = fs.readFileSync(path.join(frontendSrc, 'components/ProjectDetailModal.jsx'), 'utf8');
    assert.ok(content.includes('/api/projects/${projectId}'), 'Must fetch Project 360');
    assert.ok(content.includes('/engineering-reports'), 'Must submit engineering reports');
    assert.ok(content.includes('/progress'), 'Must submit progress updates');
    assert.ok(content.includes('/payments'), 'Must submit and manage payments');
    assert.ok(content.includes('/utilization-certificates'), 'Must submit UCs');
    assert.ok(content.includes('/documents'), 'Must upload documents');
    assert.ok(content.includes('/api/documents/${doc.document_id}/download'), 'Must stream downloads securely');
  });

  test('AgencyWorkspace.jsx integrates ProjectDetailModal for assigned works management', () => {
    const content = fs.readFileSync(path.join(frontendSrc, 'workspaces/AgencyWorkspace.jsx'), 'utf8');
    assert.ok(content.includes('ProjectDetailModal'), 'AgencyWorkspace must import ProjectDetailModal');
    assert.ok(content.includes('Manage 360°'), 'AgencyWorkspace must have action button for Project 360');
    assert.ok(content.includes('selectedProjectId'), 'AgencyWorkspace must track selected project');
  });

  test('DistrictWorkspace.jsx integrates ProjectDetailModal for 360 review and payments', () => {
    const content = fs.readFileSync(path.join(frontendSrc, 'workspaces/DistrictWorkspace.jsx'), 'utf8');
    assert.ok(content.includes('ProjectDetailModal'), 'DistrictWorkspace must import ProjectDetailModal');
    assert.ok(content.includes('View 360°'), 'DistrictWorkspace must provide View 360 button');
    assert.ok(content.includes('selected360ProjectId'), 'DistrictWorkspace must track 360 project state');
  });

  test('MPWorkspace.jsx integrates ProjectDetailModal for constituency project tracking', () => {
    const content = fs.readFileSync(path.join(frontendSrc, 'workspaces/MPWorkspace.jsx'), 'utf8');
    assert.ok(content.includes('ProjectDetailModal'), 'MPWorkspace must import ProjectDetailModal');
    assert.ok(content.includes('selectedProject'), 'MPWorkspace must track selected project');
  });
});

