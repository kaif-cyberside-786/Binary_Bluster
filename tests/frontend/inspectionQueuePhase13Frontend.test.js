/**
 * Phase 13 Frontend Tests: Field Verification & Inspection Queue
 * Tests:
 * 1. InspectionQueueCard.jsx exists and exports component
 * 2. InspectionQueueCard.jsx renders PriorityBadge separate from RiskBadge (Section 2 distinction)
 * 3. InspectionQueueCard.jsx renders canonical 7-stage lifecycle display
 * 4. InspectionQueueCard.jsx provides canonical result recording options (NO_ISSUE, REVIEW_REQUIRED, ESCALATE)
 * 5. InspectionQueueCard.jsx provides empty state
 * 6. DistrictWorkspace.jsx integrates InspectionQueueCard in 10% inspection quota section
 * 7. StateWorkspace.jsx integrates 1% physical inspection quota metrics and InspectionQueueCard
 * 8. ProjectDetailModal.jsx includes Field Inspections tab and canonical empty state
 * 9. DistrictReviewModal.jsx connects ORDER_INSPECTION with inspection confirmation
 * 10. Admin Isolation: AdminWorkspace.jsx contains NO InspectionQueueCard per rules.md §10
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname, '../../frontend/src');

describe('Phase 13 Frontend: Field Verification & Inspection Queue Tests', () => {
  const queueCardPath = path.join(frontendDir, 'components/InspectionQueueCard.jsx');
  const districtWorkspacePath = path.join(frontendDir, 'workspaces/DistrictWorkspace.jsx');
  const stateWorkspacePath = path.join(frontendDir, 'workspaces/StateWorkspace.jsx');
  const projectDetailModalPath = path.join(frontendDir, 'components/ProjectDetailModal.jsx');
  const districtReviewModalPath = path.join(frontendDir, 'components/DistrictReviewModal.jsx');
  const adminWorkspacePath = path.join(frontendDir, 'workspaces/AdminWorkspace.jsx');

  test('1. InspectionQueueCard.jsx exists and exports default and badges', () => {
    assert.ok(fs.existsSync(queueCardPath), 'InspectionQueueCard.jsx must exist');
    const content = fs.readFileSync(queueCardPath, 'utf8');
    assert.ok(content.includes('export default function InspectionQueueCard'), 'Must export default InspectionQueueCard');
    assert.ok(content.includes('export function PriorityBadge'), 'Must export PriorityBadge');
    assert.ok(content.includes('export function InspectionStatusBadge'), 'Must export InspectionStatusBadge');
  });

  test('2. InspectionQueueCard.jsx renders PriorityBadge separate from RiskBadge per Section 2', () => {
    const content = fs.readFileSync(queueCardPath, 'utf8');
    assert.ok(content.includes('PriorityBadge'), 'Must render PriorityBadge');
    assert.ok(content.includes('RiskBadge'), 'Must render RiskBadge');
    assert.ok(content.includes('ComplianceBadge'), 'Must render ComplianceBadge');
    assert.ok(content.includes('Inspection Priority'), 'Must label as Inspection Priority, not AI Risk');
  });

  test('3. InspectionQueueCard.jsx implements the canonical 7-stage lifecycle display', () => {
    const content = fs.readFileSync(queueCardPath, 'utf8');
    const statuses = [
      'RECOMMENDED',
      'PENDING_DECISION',
      'ASSIGNED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'RESULT_RECORDED',
    ];
    for (const st of statuses) {
      assert.ok(content.includes(st), `InspectionQueueCard must handle lifecycle status '${st}'`);
    }
  });

  test('4. InspectionQueueCard.jsx provides canonical result recording options', () => {
    const content = fs.readFileSync(queueCardPath, 'utf8');
    assert.ok(content.includes('NO_ISSUE'), 'Must provide NO_ISSUE result option');
    assert.ok(content.includes('REVIEW_REQUIRED'), 'Must provide REVIEW_REQUIRED result option');
    assert.ok(content.includes('ESCALATE'), 'Must provide ESCALATE result option');
    assert.ok(content.includes('Record Official Field Inspection Result'), 'Must include result recording modal header');
  });

  test('5. InspectionQueueCard.jsx handles honest empty state', () => {
    const content = fs.readFileSync(queueCardPath, 'utf8');
    assert.ok(
      content.includes('No inspection recommendations currently require action'),
      'Must render honest empty state message'
    );
  });

  test('6. DistrictWorkspace.jsx mounts InspectionQueueCard under 10% inspection quota', () => {
    const content = fs.readFileSync(districtWorkspacePath, 'utf8');
    assert.ok(content.includes("import InspectionQueueCard from '../components/InspectionQueueCard'"), 'Must import InspectionQueueCard');
    assert.ok(content.includes('<InspectionQueueCard'), 'Must mount InspectionQueueCard component');
    assert.ok(content.includes('District Field Inspection Queue'), 'Must set title to District Field Inspection Queue');
  });

  test('7. StateWorkspace.jsx integrates 1% physical inspection quota metrics and InspectionQueueCard', () => {
    const content = fs.readFileSync(stateWorkspacePath, 'utf8');
    assert.ok(content.includes("import InspectionQueueCard from '../components/InspectionQueueCard'"), 'Must import InspectionQueueCard');
    assert.ok(content.includes('/api/inspections/quota?level=STATE'), 'Must query live state 1% quota API');
    assert.ok(content.includes('ELIGIBLE WORKS (STATEWIDE)'), 'Must render eligible works metric');
    assert.ok(content.includes('1% STATUTORY TARGET'), 'Must render 1% statutory target');
    assert.ok(content.includes('Statewide Prioritized Field Inspection Queue'), 'Must render statewide queue');
  });

  test('8. ProjectDetailModal.jsx includes Field Inspections tab and canonical empty state', () => {
    const content = fs.readFileSync(projectDetailModalPath, 'utf8');
    assert.ok(content.includes("key: 'inspections'"), 'Must include inspections tab key');
    assert.ok(content.includes('Field Inspections'), 'Must label tab Field Inspections');
    assert.ok(
      content.includes('No inspection has been recommended for this project.'),
      'Must contain exact canonical empty state per Section 18'
    );
    assert.ok(content.includes('InspectionStatusBadge'), 'Must use InspectionStatusBadge in tab');
  });

  test('9. DistrictReviewModal.jsx connects ORDER_INSPECTION with inspection recommendation note', () => {
    const content = fs.readFileSync(districtReviewModalPath, 'utf8');
    assert.ok(content.includes('ORDER_INSPECTION'), 'Must support ORDER_INSPECTION decision');
    assert.ok(content.includes('Inspection recommendation created.'), 'Must provide confirmation note');
  });

  test('10. Admin Isolation: AdminWorkspace.jsx contains NO InspectionQueueCard per rules.md §10', () => {
    const content = fs.readFileSync(adminWorkspacePath, 'utf8');
    assert.ok(!content.includes('InspectionQueueCard'), 'Admin workspace must not import or render InspectionQueueCard');
    assert.ok(!content.includes('InspectionPriority'), 'Admin workspace must not contain inspection priority');
    assert.ok(!content.includes('/api/inspections'), 'Admin workspace must not query inspection API routes');
  });
});

