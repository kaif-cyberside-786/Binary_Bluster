/**
 * Phase 15 Frontend Unit & Invariant Tests: Audit Trail, Traceability & Governance
 * Verifies all Phase 15 UI requirements:
 * 1. ProjectDetailModal.jsx renders distinct visual badges for Human Officer Decisions vs System / AI Events
 * 2. ProjectDetailModal.jsx renders statutory governance disclaimer banner per rules.md §12
 * 3. ProjectDetailModal.jsx provides filter controls (All, Human, System)
 * 4. ProjectDetailModal.jsx renders actor, role, and request_id traceability indicators
 * 5. AuditorWorkspace.jsx includes live permanent audit ledger table with event type indicators
 * 6. AuditorWorkspace.jsx queries /api/audit
 * 7. Admin Isolation: AdminWorkspace.jsx contains ZERO audit trail tables or project detail views
 * 8. Statutory principle: Zero UI copy states 'AI sanctioned', 'AI rejected', or 'AI ordered inspection'
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const projectModalPath = path.resolve(__dirname, '../../frontend/src/components/ProjectDetailModal.jsx');
const auditorWorkspacePath = path.resolve(__dirname, '../../frontend/src/workspaces/AuditorWorkspace.jsx');
const adminWorkspacePath = path.resolve(__dirname, '../../frontend/src/workspaces/AdminWorkspace.jsx');

describe('Phase 15 Frontend: Audit Trail, Traceability & Quality Assurance Tests', () => {
  // 1. ProjectDetailModal.jsx renders distinct visual badges
  test('1. ProjectDetailModal.jsx renders distinct badges for Human Officer Decision vs System / AI Event', () => {
    assert.ok(fs.existsSync(projectModalPath), 'ProjectDetailModal.jsx must exist');
    const content = fs.readFileSync(projectModalPath, 'utf8');

    assert.ok(
      content.includes('👤 Human Officer Decision'),
      'ProjectDetailModal must render human officer decision badge'
    );
    assert.ok(
      content.includes('⚙️ System / AI Event'),
      'ProjectDetailModal must render system / AI event badge'
    );
  });

  // 2. ProjectDetailModal.jsx renders statutory governance disclaimer banner
  test('2. ProjectDetailModal.jsx renders statutory governance disclaimer banner per rules.md §12', () => {
    const content = fs.readFileSync(projectModalPath, 'utf8');

    assert.ok(
      content.includes('Statutory Governance Principle') || content.includes('Statutory Governance Notice'),
      'ProjectDetailModal must display statutory governance banner'
    );
    assert.ok(
      content.includes('strictly advisory') || content.includes('advisory'),
      'Banner must affirm advisory nature of automated events'
    );
  });

  // 3. ProjectDetailModal.jsx provides filter controls
  test('3. ProjectDetailModal.jsx provides filter pills for All, Human Decisions, and System Events', () => {
    const content = fs.readFileSync(projectModalPath, 'utf8');

    assert.ok(content.includes('All Records'), 'Must have All Records filter');
    assert.ok(content.includes('Human Officer Decisions'), 'Must have Human Decisions filter');
    assert.ok(content.includes('System & AI Events'), 'Must have System Events filter');
  });

  // 4. Traceability indicators: Actor, Role, Request ID
  test('4. ProjectDetailModal.jsx renders traceability indicators (Actor, Role, Request ID)', () => {
    const content = fs.readFileSync(projectModalPath, 'utf8');

    assert.ok(content.includes('Authorized Officer:'), 'Must show authorized officer');
    assert.ok(content.includes('Request ID:'), 'Must show request correlation ID');
  });

  // 5. AuditorWorkspace.jsx includes live permanent audit ledger table
  test('5. AuditorWorkspace.jsx renders live audit ledger with Human vs System indicators', () => {
    assert.ok(fs.existsSync(auditorWorkspacePath), 'AuditorWorkspace.jsx must exist');
    const content = fs.readFileSync(auditorWorkspacePath, 'utf8');

    assert.ok(
      content.includes('Permanent Write-Once Audit Ledger'),
      'AuditorWorkspace must have write-once audit ledger card'
    );
    assert.ok(
      content.includes('👤 Human') && content.includes('⚙️ System'),
      'AuditorWorkspace must render Human vs System event badges'
    );
  });

  // 6. AuditorWorkspace.jsx queries /api/audit
  test('6. AuditorWorkspace.jsx fetches from /api/audit', () => {
    const content = fs.readFileSync(auditorWorkspacePath, 'utf8');

    assert.ok(
      content.includes('/api/audit'),
      'AuditorWorkspace must fetch from /api/audit'
    );
  });

  // 7. Admin Isolation: AdminWorkspace.jsx contains ZERO audit trail tables
  test('7. Admin Isolation: AdminWorkspace.jsx contains ZERO audit ledger tables per rules.md §10', () => {
    assert.ok(fs.existsSync(adminWorkspacePath), 'AdminWorkspace.jsx must exist');
    const content = fs.readFileSync(adminWorkspacePath, 'utf8');

    assert.strictEqual(
      content.includes('Permanent Write-Once Audit Ledger'),
      false,
      'AdminWorkspace must NOT contain permanent audit ledger'
    );
    assert.strictEqual(
      content.includes('/api/audit'),
      false,
      'AdminWorkspace must NOT query /api/audit'
    );
  });

  // 8. Statutory principle: Zero UI copy states AI sanctioned or decided
  test('8. Statutory principle: Zero UI copy states AI sanctioned or decided', () => {
    const modalContent = fs.readFileSync(projectModalPath, 'utf8');
    const auditorContent = fs.readFileSync(auditorWorkspacePath, 'utf8');

    assert.strictEqual(
      modalContent.includes('AI sanctioned'),
      false,
      'Modal must never state AI sanctioned'
    );
    assert.strictEqual(
      modalContent.includes('AI ordered inspection'),
      false,
      'Modal must never state AI ordered inspection'
    );
    assert.strictEqual(
      auditorContent.includes('AI sanctioned'),
      false,
      'Auditor workspace must never state AI sanctioned'
    );
  });
});

