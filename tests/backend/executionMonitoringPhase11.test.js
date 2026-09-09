/**
 * Phase 11 Backend Tests: Continuous Execution Monitoring
 * Tests:
 * 1. Payment vs physical progress mismatch detection (PRD §12.5)
 * 2. Abnormal progress jump detection
 * 3. Timeline delay and staleness detection (PRD §12.6)
 * 4. Automatic execution evaluation on POST /api/projects/:projectId/progress
 * 5. Automatic execution evaluation on PATCH /api/projects/:projectId/payments/:paymentId
 * 6. GET /api/projects/:projectId/monitoring endpoint returns complete telemetry
 * 7. POST /api/projects/:projectId/monitoring/evaluate triggers on-demand evaluation
 * 8. GET /api/projects/monitoring/active returns jurisdiction-scoped active works queue
 * 9. Multi-tier alert dispatch (notifications collection created for District & State)
 * 10. Strict Admin Isolation (403 ADMIN_ISOLATION)
 * 11. Cross-jurisdiction access denial
 * 12. Human-in-the-loop guarantee: AI execution monitoring flags are advisory; no auto-suspension or closure
 */
process.env.NODE_ENV = 'test';
const path = require('path');
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const {
  Project,
  ProjectProgress,
  ProjectPayment,
  EngineeringReport,
  ComplianceFinding,
  AiRiskFlag,
  AiRiskScore,
  Notification,
  User,
  AuditLog,
} = require('../../backend-node/src/models');
const executionMonitoringService = require('../../backend-node/src/services/executionMonitoringService');

describe('Phase 11: Continuous Execution Monitoring Tests', () => {
  let server;
  let baseUrl;
  let isDbConnected = false;

  const daIndoreId = 'DA-P11-IND-01';
  const daDharId = 'DA-P11-DHAR-01';
  const saMpId = 'SA-P11-MP-01';
  const ministryId = 'MIN-P11-01';
  const agencyId = 'AG-P11-PWD-01';
  const auditorId = 'AUD-P11-01';
  const adminId = 'ADMIN-P11-01';

  let daIndoreToken;
  let daDharToken;
  let saMpToken;
  let ministryToken;
  let agencyToken;
  let auditorToken;
  let adminToken;

  const mismatchProjectId = 'PRJ-MAD-IND-P11-MISMATCH';
  const jumpProjectId = 'PRJ-MAD-IND-P11-JUMP';
  const delayProjectId = 'PRJ-MAD-IND-P11-DELAY';
  const normalProjectId = 'PRJ-MAD-IND-P11-NORMAL';

  before(async () => {
    // Generate valid tokens
    daIndoreToken = jwt.sign(
      { user_id: daIndoreId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' } },
      config.jwtSecret
    );
    daDharToken = jwt.sign(
      { user_id: daDharId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' } },
      config.jwtSecret
    );
    saMpToken = jwt.sign(
      { user_id: saMpId, role: 'STATE_NODAL_AUTHORITY', jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' } },
      config.jwtSecret
    );
    ministryToken = jwt.sign(
      { user_id: ministryId, role: 'MINISTRY', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret
    );
    agencyToken = jwt.sign(
      { user_id: agencyId, role: 'IMPLEMENTING_AGENCY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore', agency_id: agencyId } },
      config.jwtSecret
    );
    auditorToken = jwt.sign(
      { user_id: auditorId, role: 'AUDITOR', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret
    );
    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret
    );

    // Database check & seeding
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(config.mongoUri);
      }
      isDbConnected = true;

      // Clean up previous test run data bypassing append-only hooks
      const allTestIds = [mismatchProjectId, jumpProjectId, delayProjectId, normalProjectId];
      await mongoose.connection.collection('projects').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('project_progress').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('project_payments').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('ai_risk_flags').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('ai_risk_scores').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('notifications').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('users').deleteMany({ user_id: { $in: [daIndoreId, daDharId, saMpId, ministryId, agencyId, auditorId, adminId] } });

      const hash = await bcrypt.hash('TestPass@123', 10);
      await User.create([
        {
          user_id: daIndoreId,
          official_email: 'da.p11.ind@mp.gov.in',
          full_name: 'District Authority Indore P11',
          role: 'DISTRICT_AUTHORITY',
          jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: daDharId,
          official_email: 'da.p11.dhar@mp.gov.in',
          full_name: 'District Authority Dhar P11',
          role: 'DISTRICT_AUTHORITY',
          jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: saMpId,
          official_email: 'sa.p11.mp@mp.gov.in',
          full_name: 'State Nodal Authority MP P11',
          role: 'STATE_NODAL_AUTHORITY',
          jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: ministryId,
          official_email: 'min.p11@gov.in',
          full_name: 'Ministry Official P11',
          role: 'MINISTRY',
          jurisdiction: { level: 'NATIONAL' },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: agencyId,
          official_email: 'pwd.p11.ind@mp.gov.in',
          full_name: 'Executive Engineer PWD Indore P11',
          role: 'IMPLEMENTING_AGENCY',
          jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore', agency_id: agencyId },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: auditorId,
          official_email: 'auditor.p11@cag.gov.in',
          full_name: 'Auditor Official P11',
          role: 'AUDITOR',
          jurisdiction: { level: 'NATIONAL' },
          password_hash: hash,
          is_active: true,
        },
        {
          user_id: adminId,
          official_email: 'admin.p11@mplads.gov.in',
          full_name: 'Admin Official P11',
          role: 'ADMIN',
          jurisdiction: { level: 'NATIONAL' },
          password_hash: hash,
          is_active: true,
        },
      ]);

      // Seed Project 1: Severe Payment vs Progress Mismatch (Disbursed 96% vs Physical 45%)
      await Project.create({
        project_id: mismatchProjectId,
        mp_id: 'MP-IND-01',
        state: 'Madhya Pradesh',
        district: 'Indore',
        category: 'Community Hall',
        title: 'Community Hall Mismatch Work P11',
        status: 'IN_PROGRESS',
        sanctioned_cost: 2500000,
        estimated_cost: 2500000,
        sanction_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        implementing_agency_id: agencyId,
      });

      await ProjectProgress.create({
        progress_id: 'PROG-P11-MIS-01',
        project_id: mismatchProjectId,
        percent_complete: 45,
        stage: 'SUPERSTRUCTURE',
        physical_summary: 'Superstructure columns and lintels constructed',
        reported_by: agencyId,
        reported_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });

      await ProjectPayment.create({
        payment_id: 'PAY-P11-MIS-01',
        project_id: mismatchProjectId,
        installment_number: 1,
        amount: 2400000,
        status: 'DISBURSED',
        raised_by: agencyId,
        approved_by: daIndoreId,
        payment_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      });

      // Seed Project 2: Abnormal Progress Jump (+60% jump in 10 days)
      await Project.create({
        project_id: jumpProjectId,
        mp_id: 'MP-IND-01',
        state: 'Madhya Pradesh',
        district: 'Indore',
        category: 'Drinking Water',
        title: 'Drinking Water Pipeline Jump Work P11',
        status: 'IN_PROGRESS',
        sanctioned_cost: 3000000,
        estimated_cost: 3000000,
        sanction_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        implementing_agency_id: agencyId,
      });

      await ProjectProgress.create([
        {
          progress_id: 'PROG-P11-JUMP-02',
          project_id: jumpProjectId,
          percent_complete: 75,
          stage: 'FINISHING',
          physical_summary: 'Major pipeline surge reported to 75%',
          reported_by: agencyId,
          reported_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          progress_id: 'PROG-P11-JUMP-01',
          project_id: jumpProjectId,
          percent_complete: 15,
          stage: 'FOUNDATION',
          physical_summary: 'Excavation completed',
          reported_by: agencyId,
          reported_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        },
      ]);

      // Seed Project 3: Stalled Timeline (> 90 days without update)
      await Project.create({
        project_id: delayProjectId,
        mp_id: 'MP-IND-01',
        state: 'Madhya Pradesh',
        district: 'Indore',
        category: 'Roads & Bridges',
        title: 'Approach Road Stalled Project P11',
        status: 'IN_PROGRESS',
        sanctioned_cost: 1800000,
        estimated_cost: 1800000,
        sanction_date: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000),
        implementing_agency_id: agencyId,
      });

      await ProjectProgress.create({
        progress_id: 'PROG-P11-DEL-01',
        project_id: delayProjectId,
        percent_complete: 30,
        stage: 'FOUNDATION',
        physical_summary: 'Earthwork done',
        reported_by: agencyId,
        reported_at: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000), // 110 days ago
      });

      // Seed Project 4: Normal In-Progress Work
      await Project.create({
        project_id: normalProjectId,
        mp_id: 'MP-IND-01',
        state: 'Madhya Pradesh',
        district: 'Indore',
        category: 'Education',
        title: 'Primary School Boundary Wall P11',
        status: 'IN_PROGRESS',
        sanctioned_cost: 1000000,
        estimated_cost: 1000000,
        sanction_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        implementing_agency_id: agencyId,
      });

      await ProjectProgress.create({
        progress_id: 'PROG-P11-NORM-01',
        project_id: normalProjectId,
        percent_complete: 40,
        stage: 'SUPERSTRUCTURE',
        physical_summary: 'Brickwork completed to 40%',
        reported_by: agencyId,
        reported_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      });

      await ProjectPayment.create({
        payment_id: 'PAY-P11-NORM-01',
        project_id: normalProjectId,
        installment_number: 1,
        amount: 400000,
        status: 'DISBURSED',
        raised_by: agencyId,
        approved_by: daIndoreId,
        payment_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      });
    } catch (e) {
      console.warn('MongoDB connection note in Phase 11 test setup:', e.message);
    }

    // Start Express test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server?.closeAllConnections) server.closeAllConnections();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (isDbConnected && mongoose.connection.readyState !== 0) {
      const allTestIds = [mismatchProjectId, jumpProjectId, delayProjectId, normalProjectId];
      await mongoose.connection.collection('projects').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('project_progress').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('project_payments').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('ai_risk_flags').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('ai_risk_scores').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('notifications').deleteMany({ project_id: { $in: allTestIds } });
      await mongoose.connection.collection('users').deleteMany({ user_id: { $in: [daIndoreId, daDharId, saMpId, ministryId, agencyId, auditorId, adminId] } });
      await mongoose.disconnect();
    }
  });

  describe('Execution Analysis Engine (PRD §12.5 & §12.6)', () => {
    test('Detects severe payment vs progress mismatch (96% payment vs 45% progress -> HIGH severity gap 51%)', async () => {
      const evaluation = await executionMonitoringService.evaluateProjectExecution(mismatchProjectId);

      assert.equal(evaluation.project_id, mismatchProjectId);
      assert.equal(evaluation.execution_metrics.financial_disbursed_percent, 96.0);
      assert.equal(evaluation.execution_metrics.physical_progress_percent, 45.0);
      assert.equal(evaluation.execution_metrics.discrepancy_gap_percent, 51.0);
      assert.equal(evaluation.execution_metrics.is_mismatched, true);
      assert.equal(evaluation.execution_metrics.mismatch_severity, 'HIGH');
      assert.equal(evaluation.advisory_recommendation.action, 'GROUND_VERIFICATION_RECOMMENDED');
      assert.match(evaluation.advisory_recommendation.text, /substantially exceeds physical progress/i);
    });

    test('Detects abnormal progress jump (+60% in 10 days without interim milestones)', async () => {
      const evaluation = await executionMonitoringService.evaluateProjectExecution(jumpProjectId);

      assert.equal(evaluation.project_id, jumpProjectId);
      assert.equal(evaluation.execution_metrics.progress_jumps.has_abnormal_jump, true);
      assert.equal(evaluation.execution_metrics.progress_jumps.jump_percent, 60.0);
      assert.equal(evaluation.execution_metrics.progress_jumps.jump_severity, 'HIGH');
      assert.match(evaluation.execution_metrics.progress_jumps.jump_message, /abnormal physical progress surge/i);
    });

    test('Detects execution stall & timeline delay (> 90 days without progress report)', async () => {
      const evaluation = await executionMonitoringService.evaluateProjectExecution(delayProjectId);

      assert.equal(evaluation.project_id, delayProjectId);
      assert.equal(evaluation.execution_metrics.timeline.is_delayed, true);
      assert.ok(evaluation.execution_metrics.timeline.days_since_last_progress >= 100);
      assert.match(evaluation.execution_metrics.timeline.delay_message, /delayed|exceeded/i);
    });

    test('Identifies balanced execution trajectory as LOW risk with aligned pace', async () => {
      const evaluation = await executionMonitoringService.evaluateProjectExecution(normalProjectId);

      assert.equal(evaluation.project_id, normalProjectId);
      assert.equal(evaluation.execution_metrics.financial_disbursed_percent, 40.0);
      assert.equal(evaluation.execution_metrics.physical_progress_percent, 40.0);
      assert.equal(evaluation.execution_metrics.discrepancy_gap_percent, 0.0);
      assert.equal(evaluation.execution_metrics.is_mismatched, false);
      assert.equal(evaluation.execution_metrics.mismatch_severity, 'LOW');
      assert.equal(evaluation.advisory_recommendation.action, 'NORMAL_MONITORING');
    });
  });

  describe('Express Ingestion Triggers & API Surface', () => {
    test('POST /api/projects/:projectId/progress automatically triggers execution monitoring', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${normalProjectId}/progress`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          percent_complete: 65,
          stage: 'SUPERSTRUCTURE',
          physical_summary: 'Superstructure slab casting complete on block A',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.progress_id);
      assert.ok(body.data.monitoring, 'Response should include monitoring summary');
      assert.equal(body.data.monitoring.is_mismatched !== undefined, true);
    });

    test('PATCH /api/projects/:projectId/payments/:paymentId triggers execution monitoring on disbursement', async () => {
      // First create a pending payment
      const createRes = await fetch(`${baseUrl}/api/projects/${normalProjectId}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installment_number: 2,
          amount: 250000,
        }),
      });
      assert.equal(createRes.status, 201);
      const createBody = await createRes.json();
      const paymentId = createBody.data.payment_id;

      // Now approve & disburse via District Authority
      const patchRes = await fetch(`${baseUrl}/api/projects/${normalProjectId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${daIndoreToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          reason: 'Work verified up to slab level by AE; passed for payment.',
        }),
      });

      assert.equal(patchRes.status, 200);
      const patchBody = await patchRes.json();
      assert.equal(patchBody.success, true);
      assert.ok(patchBody.data.monitoring, 'Payment update response should include monitoring summary');
    });

    test('GET /api/projects/:projectId/monitoring returns full telemetry package', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${mismatchProjectId}/monitoring`, {
        headers: { Authorization: `Bearer ${daIndoreToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.project_id, mismatchProjectId);
      assert.ok(body.data.execution_metrics);
      assert.ok(body.data.risk);
      assert.ok(body.data.advisory_recommendation);
      assert.equal(body.data.advisory_recommendation.is_advisory, true);
    });

    test('POST /api/projects/:projectId/monitoring/evaluate triggers on-demand evaluation', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${mismatchProjectId}/monitoring/evaluate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${daIndoreToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.project_id, mismatchProjectId);
      assert.equal(body.data.execution_metrics.mismatch_severity, 'HIGH');
    });

    test('GET /api/projects/monitoring/active returns jurisdiction-scoped active works queue', async () => {
      const res = await fetch(`${baseUrl}/api/projects/monitoring/active`, {
        headers: { Authorization: `Bearer ${daIndoreToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 3);

      const mismatchItem = body.data.find((p) => p.project_id === mismatchProjectId);
      assert.ok(mismatchItem, 'Mismatch project should be in active monitoring queue');
      assert.equal(mismatchItem.is_mismatched, true);
    });

    test('GET /api/projects/monitoring/active supports ?mismatched_only=true filter', async () => {
      const res = await fetch(`${baseUrl}/api/projects/monitoring/active?mismatched_only=true`, {
        headers: { Authorization: `Bearer ${daIndoreToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.every((p) => p.is_mismatched));
    });
  });

  describe('Multi-Tier Governance & Hierarchical Alerts', () => {
    test('Dispatches server-validated notifications to District and State on HIGH severity mismatch', async () => {
      // Re-evaluate mismatch project with notifications enabled
      await executionMonitoringService.evaluateProjectExecution(mismatchProjectId, null, { skipNotifications: false });

      if (isDbConnected) {
        const daNotifs = await Notification.find({
          project_id: mismatchProjectId,
          recipient_user_id: daIndoreId,
        }).lean();

        assert.ok(daNotifs.length > 0, 'District Collector must receive notification');
        assert.equal(daNotifs[0].type, 'RISK_ALERT');

        const saNotifs = await Notification.find({
          project_id: mismatchProjectId,
          recipient_user_id: saMpId,
        }).lean();

        assert.ok(saNotifs.length > 0, 'State Nodal Authority must receive escalation on severe mismatch');
        assert.equal(saNotifs[0].type, 'ESCALATION');
      }
    });
  });

  describe('Admin Isolation, RBAC & Human-in-the-Loop Safeguards', () => {
    test('Strict Admin Isolation: Admin receives 403 on GET /monitoring/active per rules.md §10', async () => {
      const res = await fetch(`${baseUrl}/api/projects/monitoring/active`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    });

    test('Strict Admin Isolation: Admin receives 403 on GET /:projectId/monitoring per rules.md §10', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${mismatchProjectId}/monitoring`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    });

    test('Cross-jurisdiction access denial: Collector of Dhar cannot view monitoring of Indore project', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${mismatchProjectId}/monitoring`, {
        headers: { Authorization: `Bearer ${daDharToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error?.code, 'FORBIDDEN_JURISDICTION');
    });

    test('Human-in-the-loop guarantee: Severe mismatch does NOT auto-suspend or auto-close project', async () => {
      // Check project status remains IN_PROGRESS despite HIGH severity mismatch (score >= 75)
      const prj = await Project.findOne({ project_id: mismatchProjectId }).lean();
      assert.equal(prj.status, 'IN_PROGRESS', 'Project status must not be autonomously altered by AI risk flags');
    });
  });
});

