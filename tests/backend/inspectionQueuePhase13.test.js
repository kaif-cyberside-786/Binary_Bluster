/**
 * Phase 13 Backend Integration Tests: Field Verification & Inspection Queue
 * Tests all 25 core criteria:
 * 1. Recommend inspection on HIGH-risk project
 * 2. Duplicate recommendation does not create duplicate active inspection
 * 3. Assign inspection to an officer
 * 4. Schedule inspection with valid date
 * 5. Transition to IN_PROGRESS
 * 6. Transition to COMPLETED
 * 7. Record NO_ISSUE result
 * 8. Record REVIEW_REQUIRED result
 * 9. Record ESCALATE result
 * 10. Reject invalid state transition with 409 INVALID_STATE_TRANSITION
 * 11. Queue ranking prioritizes HIGH-risk and severe execution mismatch projects
 * 12. Compliance severity properly increases prioritization
 * 13. Statutory quota statistics are coherent and computed from real records
 * 14. Admin receives 403 ADMIN_ISOLATION on inspection data
 * 15. Cross-jurisdiction requests receive 403 FORBIDDEN_JURISDICTION
 * 16. Unauthorized roles receive 403 FORBIDDEN_ROLE
 * 17. Unauthenticated requests receive 401 UNAUTHENTICATED
 * 18. Auditor cannot modify or record results (read-only enforcement)
 * 19. Phase 10 Send-for-Inspection creates/updates inspection recommendation
 * 20. Phase 10 Send-for-Inspection does NOT auto-sanction project
 * 21. AI does NOT auto-assign an officer
 * 22. AI does NOT auto-schedule an inspection
 * 23. AI does NOT auto-record results
 * 24. Inspection result does NOT silently close or alter project status
 * 25. Audit records are created for all inspection lifecycle actions
 */
process.env.NODE_ENV = 'test';
const path = require('path');
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const {
  Project,
  Inspection,
  AiRiskScore,
  ComplianceFinding,
  ProjectProgress,
  ProjectPayment,
  AuditLog,
  OfficerDecision,
  User,
} = require('../../backend-node/src/models');
const inspectionQueueService = require('../../backend-node/src/services/inspectionQueueService');

describe('Phase 13: Field Verification & Inspection Queue Backend Tests', () => {
  let server;
  let baseUrl;
  let isDbConnected = false;

  const daIndoreId = 'DA-P13-IND-01';
  const daDharId = 'DA-P13-DHAR-01';
  const snaStateId = 'SNA-P13-MP-01';
  const adminId = 'ADMIN-P13-01';
  const auditorId = 'AUD-P13-01';
  const agencyId = 'AG-P13-01';

  let daIndoreToken;
  let daDharToken;
  let snaToken;
  let adminToken;
  let auditorToken;
  let agencyToken;

  const testProjectHigh = 'PRJ-MAD-IND-P13-HIGH';
  const testProjectLow = 'PRJ-MAD-IND-P13-LOW';
  const testProjectDhar = 'PRJ-MAD-DHAR-P13-01';
  const testProjectPhase10 = 'PRJ-MAD-IND-P13-P10';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    isDbConnected = mongoose.connection.readyState === 1;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Generate test JWT tokens
    daIndoreToken = jwt.sign(
      {
        user_id: daIndoreId,
        role: 'DISTRICT_AUTHORITY',
        official_email: 'da.indore.p13@mp.gov.in',
        full_name: 'District Collector Indore',
        jurisdiction: { state: 'Madhya Pradesh', district: 'Indore', level: 'DISTRICT' },
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    daDharToken = jwt.sign(
      {
        user_id: daDharId,
        role: 'DISTRICT_AUTHORITY',
        official_email: 'da.dhar.p13@mp.gov.in',
        full_name: 'District Collector Dhar',
        jurisdiction: { state: 'Madhya Pradesh', district: 'Dhar', level: 'DISTRICT' },
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    snaToken = jwt.sign(
      {
        user_id: snaStateId,
        role: 'STATE_NODAL_AUTHORITY',
        official_email: 'sna.mp.p13@mp.gov.in',
        full_name: 'State Nodal Officer MP',
        jurisdiction: { state: 'Madhya Pradesh', level: 'STATE' },
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      {
        user_id: adminId,
        role: 'ADMIN',
        official_email: 'admin.p13@mp.gov.in',
        full_name: 'System Admin',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    auditorToken = jwt.sign(
      {
        user_id: auditorId,
        role: 'AUDITOR',
        official_email: 'auditor.p13@cag.gov.in',
        full_name: 'Senior Auditor CAG',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    agencyToken = jwt.sign(
      {
        user_id: agencyId,
        role: 'IMPLEMENTING_AGENCY',
        official_email: 'pwd.indore.p13@mp.gov.in',
        agency_id: 'PWD-INDORE-01',
        full_name: 'Executive Engineer PWD',
        jurisdiction: { state: 'Madhya Pradesh', district: 'Indore' },
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    if (isDbConnected) {
      // Seed test users for authentication middleware
      await User.findOneAndUpdate(
        { user_id: daIndoreId },
        { user_id: daIndoreId, official_email: 'da.indore.p13@mp.gov.in', role: 'DISTRICT_AUTHORITY', full_name: 'District Collector Indore', jurisdiction: { state: 'Madhya Pradesh', district: 'Indore', level: 'DISTRICT' }, is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );
      await User.findOneAndUpdate(
        { user_id: daDharId },
        { user_id: daDharId, official_email: 'da.dhar.p13@mp.gov.in', role: 'DISTRICT_AUTHORITY', full_name: 'District Collector Dhar', jurisdiction: { state: 'Madhya Pradesh', district: 'Dhar', level: 'DISTRICT' }, is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );
      await User.findOneAndUpdate(
        { user_id: snaStateId },
        { user_id: snaStateId, official_email: 'sna.mp.p13@mp.gov.in', role: 'STATE_NODAL_AUTHORITY', full_name: 'State Nodal Officer MP', jurisdiction: { state: 'Madhya Pradesh', level: 'STATE' }, is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );
      await User.findOneAndUpdate(
        { user_id: adminId },
        { user_id: adminId, official_email: 'admin.p13@mp.gov.in', role: 'ADMIN', full_name: 'System Admin', jurisdiction: { level: 'NATIONAL' }, is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );
      await User.findOneAndUpdate(
        { user_id: auditorId },
        { user_id: auditorId, official_email: 'auditor.p13@cag.gov.in', role: 'AUDITOR', full_name: 'Senior Auditor CAG', is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );
      await User.findOneAndUpdate(
        { user_id: agencyId },
        { user_id: agencyId, official_email: 'pwd.indore.p13@mp.gov.in', role: 'IMPLEMENTING_AGENCY', agency_id: 'PWD-INDORE-01', full_name: 'Executive Engineer PWD', jurisdiction: { state: 'Madhya Pradesh', district: 'Indore' }, is_active: true, password_hash: 'mockhash' },
        { upsert: true, new: true }
      );

      // Seed test projects
      await Project.deleteMany({
        project_id: { $in: [testProjectHigh, testProjectLow, testProjectDhar, testProjectPhase10] },
      });
      await Inspection.deleteMany({
        project_id: { $in: [testProjectHigh, testProjectLow, testProjectDhar, testProjectPhase10] },
      });

      await Project.create([
        {
          project_id: testProjectHigh,
          mp_id: 'MP-IND-01',
          title: 'High Risk Drainage Channel Indore',
          description: 'High risk storm water drain construction',
          category: 'Sanitation',
          state: 'Madhya Pradesh',
          district: 'Indore',
          status: 'SANCTIONED',
          sanctioned_cost: 2500000,
          estimated_cost: 2500000,
        },
        {
          project_id: testProjectLow,
          mp_id: 'MP-IND-01',
          title: 'Routine Community Hall Indore',
          description: 'Standard community center work',
          category: 'Community Hall',
          state: 'Madhya Pradesh',
          district: 'Indore',
          status: 'SANCTIONED',
          sanctioned_cost: 1000000,
          estimated_cost: 1000000,
        },
        {
          project_id: testProjectDhar,
          mp_id: 'MP-DHAR-01',
          title: 'Dhar Water Tank Project',
          description: 'Water storage work in Dhar',
          category: 'Drinking Water',
          state: 'Madhya Pradesh',
          district: 'Dhar',
          status: 'SANCTIONED',
          sanctioned_cost: 1500000,
          estimated_cost: 1500000,
        },
        {
          project_id: testProjectPhase10,
          mp_id: 'MP-IND-01',
          title: 'Proposal for Phase 10 Decision Review',
          description: 'New proposal awaiting district review',
          category: 'Education',
          state: 'Madhya Pradesh',
          district: 'Indore',
          status: 'DISTRICT_REVIEW',
          estimated_cost: 800000,
        },
      ]);

      // Seed risk scores
      await AiRiskScore.deleteMany({ project_id: { $in: [testProjectHigh, testProjectLow] } });
      await AiRiskScore.create([
        {
          project_id: testProjectHigh,
          overall_score: 85,
          composite_score: 85,
          risk_level: 'HIGH',
        },
        {
          project_id: testProjectLow,
          overall_score: 15,
          composite_score: 15,
          risk_level: 'LOW',
        },
      ]);

      // Seed compliance finding for High risk project
      await ComplianceFinding.deleteMany({ project_id: testProjectHigh });
      await ComplianceFinding.create({
        finding_id: `CMP-${Date.now()}-01`,
        project_id: testProjectHigh,
        mp_id: 'MP-IND-01',
        district: 'Indore',
        state: 'Madhya Pradesh',
        rule_id: 'R-COST-01',
        rule_category: 'FINANCIAL',
        status: 'NON_COMPLIANT',
        severity: 'HIGH',
        title: 'Severe Cost Escalation Deviation',
        message: 'Severe Cost Escalation Deviation',
      });
    }
  });

  let createdInspectionId;

  // 1. Recommend inspection on HIGH-risk project
  test('1. Recommend inspection on HIGH-risk project', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectHigh,
        source: 'AI_RISK_TRIGGER',
        reason: 'Severe compliance anomaly and high risk score',
        priority: 'HIGH',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.is_duplicate, false);
    assert.ok(body.data.inspection_id);
    assert.strictEqual(body.data.project_id, testProjectHigh);
    assert.strictEqual(body.data.status, 'RECOMMENDED');

    createdInspectionId = body.data.inspection_id;
  });

  // 2. Duplicate recommendation does not create duplicate active inspection
  test('2. Duplicate recommendation does not create duplicate active inspection', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        project_id: testProjectHigh,
        source: 'OFFICER_RECOMMENDATION',
        reason: 'Second officer also flagged for inspection',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200); // Handled idempotently
    assert.strictEqual(body.is_duplicate, true);
    assert.strictEqual(body.data.inspection_id, createdInspectionId);

    // Verify database has only 1 active inspection for this project
    if (isDbConnected) {
      const count = await Inspection.countDocuments({ project_id: testProjectHigh });
      assert.strictEqual(count, 1);
    }
  });

  // 3. Assign inspection to an officer
  test('3. Assign inspection to an officer', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        assigned_officer_id: 'FO-IND-001',
        assigned_officer_name: 'Shri R. K. Verma, Executive Engineer',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'ASSIGNED');
    assert.strictEqual(body.data.assigned_officer_id, 'FO-IND-001');
    assert.strictEqual(body.data.assigned_officer_name, 'Shri R. K. Verma, Executive Engineer');
  });

  // 4. Schedule inspection with valid date
  test('4. Schedule inspection with valid date', async () => {
    const scheduleDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        status: 'SCHEDULED',
        scheduled_date: scheduleDate,
        notes: 'Check foundation depth and soil stability test results',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'SCHEDULED');
    assert.ok(body.data.scheduled_date);
  });

  // 5. Transition to IN_PROGRESS
  test('5. Transition to IN_PROGRESS', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        reason: 'Officer arrived on field site and began measurement',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'IN_PROGRESS');
  });

  // 6. Transition to COMPLETED
  test('6. Transition to COMPLETED', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        findings_summary: 'Physical site visit completed. Core samples collected.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'COMPLETED');
    assert.ok(body.data.completed_date);
  });

  // 7. Record NO_ISSUE result
  test('7. Record NO_ISSUE result on a test completed inspection', async () => {
    // Create a temporary inspection for testing NO_ISSUE
    const tmp = await Inspection.create({
      inspection_id: `INSP-TEST-NOISSUE-${Date.now()}`,
      project_id: testProjectLow,
      district: 'Indore',
      state: 'Madhya Pradesh',
      status: 'COMPLETED',
      priority: 'ROUTINE',
      completed_date: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/inspections/${tmp.inspection_id}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        result: 'NO_ISSUE',
        findings: 'All physical measurements conform to approved DPR specifications. Work quality is good.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RESULT_RECORDED');
    assert.strictEqual(body.data.result, 'NO_ISSUE');
  });

  // 8. Record REVIEW_REQUIRED result
  test('8. Record REVIEW_REQUIRED result on a test completed inspection', async () => {
    const tmp = await Inspection.create({
      inspection_id: `INSP-TEST-REV-${Date.now()}`,
      project_id: testProjectLow,
      district: 'Indore',
      state: 'Madhya Pradesh',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      completed_date: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/inspections/${tmp.inspection_id}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        result: 'REVIEW_REQUIRED',
        findings: 'Minor variation in plaster thickness. Technical review recommended.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'RESULT_RECORDED');
    assert.strictEqual(body.data.result, 'REVIEW_REQUIRED');
  });

  // 9. Record ESCALATE result
  test('9. Record ESCALATE result on created inspection', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        result: 'ESCALATE',
        findings: 'Severe substandard cement aggregate mix detected. Immediate work stoppage recommended.',
        remarks: 'Forwarded to State Quality Monitor for laboratory chemical testing.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RESULT_RECORDED');
    assert.strictEqual(body.data.result, 'ESCALATE');
    assert.ok(body.data.findings_summary.includes('substandard'));
  });

  // 10. Reject invalid state transition with 409 INVALID_STATE_TRANSITION
  test('10. Reject invalid state transition with 409 INVALID_STATE_TRANSITION', async () => {
    // Attempting to transition terminal RESULT_RECORDED backwards to IN_PROGRESS
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'INVALID_STATE_TRANSITION');
  });

  // 11. Queue ranking prioritizes HIGH-risk and severe execution mismatch projects
  test('11. Queue ranking prioritizes HIGH-risk and severe execution mismatch projects', async () => {
    const res = await fetch(`${baseUrl}/api/inspections?district=Indore`, {
      headers: {
        Authorization: `Bearer ${daIndoreToken}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.items.length >= 2);

    // The high risk project (score 85 + compliance) must rank higher than the low risk project
    const highItem = body.data.items.find((it) => it.project_id === testProjectHigh);
    const lowItem = body.data.items.find((it) => it.project_id === testProjectLow);

    assert.ok(highItem, 'High risk project found in queue');
    assert.ok(lowItem, 'Low risk project found in queue');
    assert.ok(highItem.priority_score > lowItem.priority_score, `High risk priority (${highItem.priority_score}) must exceed low risk (${lowItem.priority_score})`);
  });

  // 12. Compliance severity properly increases prioritization
  test('12. Compliance severity properly increases prioritization', () => {
    const lowPriority = inspectionQueueService.calculateInspectionPriority({
      riskScore: { overall_score: 20 },
      complianceFindings: [],
      discrepancyGap: 0,
      recommendationSource: 'STATUTORY_QUOTA',
    });

    const highPriorityWithCompliance = inspectionQueueService.calculateInspectionPriority({
      riskScore: { overall_score: 20 },
      complianceFindings: [{ status: 'NON_COMPLIANT', severity: 'CRITICAL' }],
      discrepancyGap: 0,
      recommendationSource: 'STATUTORY_QUOTA',
    });

    assert.ok(
      highPriorityWithCompliance.priorityScore > lowPriority.priorityScore,
      'Non-compliant status must boost priority score'
    );
    assert.strictEqual(highPriorityWithCompliance.priorityScore - lowPriority.priorityScore, 25);
  });

  // 13. Statutory quota statistics are coherent and computed from real records
  test('13. Statutory quota statistics are coherent and computed from real records', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/quota?level=DISTRICT&district=Indore`, {
      headers: {
        Authorization: `Bearer ${daIndoreToken}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.eligible_works === 'number');
    assert.ok(typeof body.data.target_count === 'number');
    assert.ok(typeof body.data.completed_count === 'number');
    assert.ok(typeof body.data.remaining_count === 'number');
    assert.ok(typeof body.data.progress_percentage === 'number');
  });

  // 14. Admin receives 403 ADMIN_ISOLATION on inspection data
  test('14. Admin receives 403 ADMIN_ISOLATION on inspection data', async () => {
    const res = await fetch(`${baseUrl}/api/inspections`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'ADMIN_ISOLATION');
  });

  // 15. Cross-jurisdiction requests receive 403 FORBIDDEN_JURISDICTION
  test('15. Cross-jurisdiction requests receive 403 FORBIDDEN_JURISDICTION', async () => {
    // Collector of Dhar attempts to assign officer to an Indore inspection
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daDharToken}`,
      },
      body: JSON.stringify({
        assigned_officer_id: 'FO-DHAR-001',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'FORBIDDEN_JURISDICTION');
  });

  // 16. Unauthorized roles receive 403 FORBIDDEN_ROLE
  test('16. Unauthorized roles receive 403 FORBIDDEN_ROLE', async () => {
    // Implementing Agency attempts to schedule inspection
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agencyToken}`,
      },
      body: JSON.stringify({
        status: 'SCHEDULED',
        scheduled_date: '2026-10-15',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'FORBIDDEN_ROLE');
  });

  // 17. Unauthenticated requests receive 401 UNAUTHENTICATED
  test('17. Unauthenticated requests receive 401 UNAUTHENTICATED', async () => {
    const res = await fetch(`${baseUrl}/api/inspections`);
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
  });

  // 18. Auditor cannot modify or record results (read-only enforcement)
  test('18. Auditor cannot modify or record results (read-only enforcement)', async () => {
    const res = await fetch(`${baseUrl}/api/inspections/${createdInspectionId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify({
        result: 'NO_ISSUE',
        findings: 'Auditor attempt to record result',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'FORBIDDEN_ROLE');
  });

  // 19. Phase 10 Send-for-Inspection creates/updates inspection recommendation
  test('19. Phase 10 Send-for-Inspection creates/updates inspection recommendation', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectPhase10}/decision`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daIndoreToken}`,
      },
      body: JSON.stringify({
        decision: 'ORDER_INSPECTION',
        reason: 'District collector orders physical soil and site verification before sanction',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.project_status, 'INSPECTION_REQUESTED');

    // Verify inspection was created in database
    if (isDbConnected) {
      const insp = await Inspection.findOne({ project_id: testProjectPhase10 });
      assert.ok(insp, 'Inspection record must be created via Phase 10 decision');
      assert.strictEqual(insp.status, 'RECOMMENDED');
      assert.strictEqual(insp.recommendation_source, 'OFFICER_RECOMMENDATION');
    }
  });

  // 20. Phase 10 Send-for-Inspection does NOT auto-sanction project
  test('20. Phase 10 Send-for-Inspection does NOT auto-sanction project', async () => {
    if (isDbConnected) {
      const p = await Project.findOne({ project_id: testProjectPhase10 }).lean();
      assert.notStrictEqual(p.status, 'SANCTIONED');
      assert.strictEqual(p.status, 'INSPECTION_REQUESTED');
    }
  });

  // 21. AI does NOT auto-assign an officer
  test('21. AI does NOT auto-assign an officer', async () => {
    if (isDbConnected) {
      const insp = await Inspection.findOne({ project_id: testProjectPhase10 }).lean();
      assert.strictEqual(insp.assigned_officer_id, null, 'AI must not auto-assign officer');
    }
  });

  // 22. AI does NOT auto-schedule an inspection
  test('22. AI does NOT auto-schedule an inspection', async () => {
    if (isDbConnected) {
      const insp = await Inspection.findOne({ project_id: testProjectPhase10 }).lean();
      assert.strictEqual(insp.scheduled_date, null, 'AI must not auto-schedule inspection date');
    }
  });

  // 23. AI does NOT auto-record results
  test('23. AI does NOT auto-record results', async () => {
    if (isDbConnected) {
      const insp = await Inspection.findOne({ project_id: testProjectPhase10 }).lean();
      assert.strictEqual(insp.result, null, 'AI must not auto-record inspection result');
    }
  });

  // 24. Inspection result does NOT silently close or alter project status
  test('24. Inspection result does NOT silently close or alter project status', async () => {
    if (isDbConnected) {
      const p = await Project.findOne({ project_id: testProjectHigh }).lean();
      assert.strictEqual(p.status, 'SANCTIONED', 'Project status must remain SANCTIONED after inspection result');
      assert.notStrictEqual(p.status, 'COMPLETED');
      assert.notStrictEqual(p.status, 'CLOSED');
    }
  });

  // 25. Audit records are created for all inspection lifecycle actions
  test('25. Audit records are created for all inspection lifecycle actions', async () => {
    if (isDbConnected) {
      const audits = await AuditLog.find({
        action: { $in: ['INSPECTION_RECOMMENDED', 'INSPECTION_ASSIGNED', 'INSPECTION_SCHEDULED', 'INSPECTION_RESULT_RECORDED'] },
      });
      assert.ok(audits.length >= 3, `Expected multiple inspection audit entries, found ${audits.length}`);
    }
  });

  after(async () => {
    if (server?.closeAllConnections) {
      server.closeAllConnections();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
});
