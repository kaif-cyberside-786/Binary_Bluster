/**
 * Phase 6 Backend Tests: Deterministic Compliance & Invariants Monitoring
 * Tests all 7 pure-function deterministic rules, evaluator orchestrator,
 * compliance API routes, jurisdiction boundaries, and strict Admin Isolation (403).
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
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  UtilizationCertificate,
  Document,
  ComplianceFinding,
  AuditLog,
  ScStAreaReference,
  User,
} = require('../../backend-node/src/models');
const {
  rules,
  evaluateProject,
  evaluateMpScStStatus,
} = require('../../backend-node/src/services/compliance');

describe('Phase 6: Deterministic Compliance & Monitoring Tests', () => {
  let server;
  let baseUrl;

  const mpId = 'MP-CMP-TEST-01';
  const daId = 'DA-CMP-IND-01';
  const otherDaId = 'DA-CMP-DHAR-01';
  const adminId = 'ADMIN-CMP-01';

  let mpToken;
  let daToken;
  let otherDaToken;
  let adminToken;

  const testProjectId = 'PRJ-MAD-IND-CMPTEST01';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test data using native collection to bypass append-only hooks in tests
    await mongoose.connection.collection('users').deleteMany({
      user_id: { $in: [mpId, daId, otherDaId, adminId] },
    });
    await mongoose.connection.collection('projects').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_progress').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_payments').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('documents').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('compliance_findings').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('audit_logs').deleteMany({ project_id: testProjectId });

    const hash = await bcrypt.hash('TestPass@123', 12);

    // Create test users
    await User.create([
      {
        user_id: mpId,
        official_email: 'mp.cmptest@test.gov.in',
        password_hash: hash,
        full_name: 'Hon MP Indore CMP Test',
        role: 'MP',
        designation: 'Member of Parliament',
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
        is_active: true,
      },
      {
        user_id: daId,
        official_email: 'da.cmptest@test.gov.in',
        password_hash: hash,
        full_name: 'District Collector Indore CMP Test',
        role: 'DISTRICT_AUTHORITY',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        is_active: true,
      },
      {
        user_id: otherDaId,
        official_email: 'da.dhar.cmptest@test.gov.in',
        password_hash: hash,
        full_name: 'District Collector Dhar CMP Test',
        role: 'DISTRICT_AUTHORITY',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' },
        is_active: true,
      },
      {
        user_id: adminId,
        official_email: 'admin.cmptest@test.gov.in',
        password_hash: hash,
        full_name: 'Admin CMP Test',
        role: 'ADMIN',
        designation: 'System Administrator',
        jurisdiction: { level: 'NATIONAL' },
        is_active: true,
      },
    ]);

    mpToken = jwt.sign(
      { user_id: mpId, role: 'MP', jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    daToken = jwt.sign(
      { user_id: daId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    otherDaToken = jwt.sign(
      { user_id: otherDaId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Seed test project in SANCTIONED status
    await Project.create({
      project_id: testProjectId,
      mp_id: mpId,
      state: 'Madhya Pradesh',
      district: 'Indore',
      category: 'Roads & Bridges',
      title: 'Construction of Cement Concrete Road in Ward 12',
      status: 'SANCTIONED',
      estimated_cost: 2500000,
      sanctioned_cost: 2500000,
      sanction_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });

    await ProjectRecommendation.create({
      project_id: testProjectId,
      mp_id: mpId,
      description: 'Construction of durable CC road connecting main market to hospital ward 12',
      estimated_cost: 2500000,
      work_category: 'Roads & Bridges',
      location: { block: 'Indore Urban', village_ward: 'Ward 12' },
      recommended_by: mpId,
    });

    // Start server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Native cleanup to bypass Mongoose append-only hooks
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.collection('users').deleteMany({
        user_id: { $in: [mpId, daId, otherDaId, adminId] },
      });
      await mongoose.connection.collection('projects').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('project_progress').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('project_payments').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('documents').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('compliance_findings').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('audit_logs').deleteMany({ project_id: testProjectId });
    }

    if (server?.closeAllConnections) server.closeAllConnections();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, headers: res.headers, body };
  }

  // 1. Pure unit tests for individual rules
  test('Rule 1 (REQUIRED_FIELDS): passes on valid project, flags missing fields', () => {
    const validPrj = {
      title: 'Community Health Center Building',
      category: 'Health & Family Welfare',
      estimated_cost: 1500000,
      district: 'Indore',
      state: 'Madhya Pradesh',
    };
    const validRec = { description: 'Construction of primary healthcare facility' };
    const resPass = rules.evaluateRequiredFields(validPrj, validRec);
    assert.equal(resPass.status, 'COMPLIANT');
    assert.equal(resPass.rule_id, 'REQUIRED_FIELDS');

    const invalidPrj = {
      title: 'Bad',
      category: 'Unknown Category',
      estimated_cost: -50,
      district: '',
      state: '',
    };
    const resFail = rules.evaluateRequiredFields(invalidPrj, { description: 'Short' });
    assert.equal(resFail.status, 'NON_COMPLIANT');
    assert.equal(resFail.severity, 'HIGH');
    assert.ok(resFail.evidence.missing_fields.length > 0);
  });

  test('Rule 2 (DOC_COMPLETENESS): flags REVIEW_REQUIRED when sanctioned work lacks DPR', () => {
    const prj = { status: 'SANCTIONED' };
    const resNoDpr = rules.evaluateDocCompleteness(prj, [], []);
    assert.equal(resNoDpr.status, 'REVIEW_REQUIRED');

    const resWithDpr = rules.evaluateDocCompleteness(prj, [{ version: 'v1' }], [{ document_id: 'DOC-1' }]);
    assert.equal(resWithDpr.status, 'COMPLIANT');
  });

  test('Rule 3 (UC_OVERDUE): flags NON_COMPLIANT for payment disbursed > 90d without UC', () => {
    const prj = { status: 'IN_PROGRESS' };
    const oldDisbursed = [
      {
        status: 'DISBURSED',
        amount: 1000000,
        payment_date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      },
    ];

    const resOverdue = rules.evaluateUcOverdue(prj, oldDisbursed, []);
    assert.equal(resOverdue.status, 'NON_COMPLIANT');
    assert.equal(resOverdue.severity, 'HIGH');
    assert.ok(resOverdue.evidence.days_overdue >= 9);

    // When UC covers the amount
    const ucs = [{ is_filed: true, amount_certified: 1000000 }];
    const resCovered = rules.evaluateUcOverdue(prj, oldDisbursed, ucs);
    assert.equal(resCovered.status, 'COMPLIANT');
  });

  test('Rule 4 (PAYMENT_PROGRESS_MISMATCH): flags REVIEW_REQUIRED at 25% gap, NON_COMPLIANT at 45% gap', () => {
    const prj = { sanctioned_cost: 10000000 }; // 1 Crore
    const payments = [{ status: 'APPROVED', amount: 5000000 }]; // 50% disbursed
    const progress25Gap = [{ percent_complete: 25 }]; // 50% disbursed vs 25% progress -> 25% gap
    const resWarn = rules.evaluatePaymentProgressMismatch(prj, payments, progress25Gap);
    assert.equal(resWarn.status, 'REVIEW_REQUIRED');
    assert.equal(resWarn.evidence.gap_percent, 25);

    const progress50Gap = [{ percent_complete: 5 }]; // 50% disbursed vs 5% progress -> 45% gap
    const resError = rules.evaluatePaymentProgressMismatch(prj, payments, progress50Gap);
    assert.equal(resError.status, 'NON_COMPLIANT');
    assert.equal(resError.severity, 'HIGH');

    const progressAligned = [{ percent_complete: 45 }]; // 50% disbursed vs 45% progress -> 5% gap
    const resOk = rules.evaluatePaymentProgressMismatch(prj, payments, progressAligned);
    assert.equal(resOk.status, 'COMPLIANT');
  });

  test('Rule 5 (COST_DRIFT): flags REVIEW_REQUIRED at 15% overrun, NON_COMPLIANT at 30% overrun', () => {
    const prj = { sanctioned_cost: 2000000 }; // 20 Lakh
    const dpr15 = [{ version: 'v1', detailed_estimate: 2300000 }]; // 15% growth
    const resWarn = rules.evaluateCostDrift(prj, dpr15);
    assert.equal(resWarn.status, 'REVIEW_REQUIRED');

    const dpr30 = [{ version: 'v1', detailed_estimate: 2600000 }]; // 30% growth
    const resError = rules.evaluateCostDrift(prj, dpr30);
    assert.equal(resError.status, 'NON_COMPLIANT');
    assert.equal(resError.severity, 'HIGH');

    const dprOk = [{ version: 'v1', detailed_estimate: 2100000 }]; // 5% growth
    const resOk = rules.evaluateCostDrift(prj, dprOk);
    assert.equal(resOk.status, 'COMPLIANT');
  });

  test('Rule 6 (STALLED_PROGRESS): flags NON_COMPLIANT when active work has no updates for > 180 days', () => {
    const prj = {
      status: 'IN_PROGRESS',
      sanction_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    };
    const oldProgress = [{ created_at: new Date(Date.now() - 190 * 24 * 60 * 60 * 1000), percent_complete: 30 }];
    const resStalled = rules.evaluateStalledProgress(prj, oldProgress);
    assert.equal(resStalled.status, 'NON_COMPLIANT');
    assert.equal(resStalled.severity, 'HIGH');

    const recentProgress = [{ created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), percent_complete: 40 }];
    const resActive = rules.evaluateStalledProgress(prj, recentProgress);
    assert.equal(resActive.status, 'COMPLIANT');
  });

  test('Rule 7 (SC_ST_MIX): calculates continuous statutory earmarking percentages against 15% and 7.5%', () => {
    const scStRef = [
      { state: 'Madhya Pradesh', constituency: 'Ujjain', classification: 'SC_MAJORITY' },
      { state: 'Madhya Pradesh', constituency: 'Dhar', classification: 'ST_MAJORITY' },
      { state: 'Madhya Pradesh', constituency: 'Indore', classification: 'OTHER' },
    ];

    const recommendations = [
      { state: 'Madhya Pradesh', constituency: 'Ujjain', estimated_cost: 2000000 }, // 20L SC (20%)
      { state: 'Madhya Pradesh', constituency: 'Dhar', estimated_cost: 1000000 }, // 10L ST (10%)
      { state: 'Madhya Pradesh', constituency: 'Indore', estimated_cost: 7000000 }, // 70L Other
    ]; // Total = 1.00 Crore

    const res = rules.evaluateScStMix(recommendations, scStRef, 50000000);
    assert.equal(res.status, 'COMPLIANT');
    assert.equal(res.evidence.sc_percent, 20);
    assert.equal(res.evidence.st_percent, 10);
  });

  // 2. Integration & API Route Tests
  test('POST /api/compliance/evaluate/:projectId triggers evaluation and persists findings', async () => {
    const res = await request(`/api/compliance/evaluate/${testProjectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.project_id, testProjectId);
    assert.ok(['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'].includes(res.body.data.overall_status));
    assert.equal(res.body.data.summary.total_rules, 6);

    // Verify persisted findings in MongoDB
    const persisted = await ComplianceFinding.find({ project_id: testProjectId }).lean();
    assert.equal(persisted.length, 6);

    // Verify AuditLog
    const audit = await AuditLog.findOne({
      project_id: testProjectId,
      action: 'EVALUATE_COMPLIANCE',
    }).lean();
    assert.ok(audit);
    assert.equal(audit.user_id, daId);
  });

  test('GET /api/compliance/project/:projectId returns project compliance details', async () => {
    const res = await request(`/api/compliance/project/${testProjectId}`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.project_id, testProjectId);
    assert.ok(Array.isArray(res.body.data.findings));
    assert.equal(res.body.data.findings.length, 6);
  });

  test('GET /api/compliance/projects/:projectId plural alias returns project compliance details', async () => {
    const res = await request(`/api/compliance/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.project_id, testProjectId);
  });

  test('GET /api/projects/:projectId includes compliance summary in Project 360', async () => {
    const res = await request(`/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.compliance);
    assert.ok(res.body.data.compliance.overall_status);
    assert.ok(Array.isArray(res.body.data.compliance.findings));
  });

  test('GET /api/compliance/sc-st-status/:mpId returns continuous quota evaluation', async () => {
    const res = await request(`/api/compliance/sc-st-status/${mpId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.mp_id, mpId);
    assert.ok(res.body.data.evidence.sc_target_percent === 15);
    assert.ok(res.body.data.evidence.st_target_percent === 7.5);
  });

  test('GET /api/compliance/mp returns MP quota without explicit ID in URL', async () => {
    const res = await request('/api/compliance/mp', {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.mp_id, mpId);
  });

  test('GET /api/compliance/district returns in-jurisdiction compliance queue', async () => {
    const res = await request('/api/compliance/district', {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.items));
  });

  test('GET /api/compliance/dashboard returns scoped compliance statistics', async () => {
    const res = await request('/api/compliance/dashboard', {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total_projects >= 1);
    assert.ok(res.body.data.findings_by_rule);
  });

  test('Strict Admin Isolation: Admin receives 403 on all compliance routes per rules.md §10', async () => {
    // 1. Evaluate
    const resEval = await request(`/api/compliance/evaluate/${testProjectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resEval.status, 403);
    assert.equal(resEval.body.error.code, 'ADMIN_ISOLATION');

    // 2. Project compliance
    const resPrj = await request(`/api/compliance/project/${testProjectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resPrj.status, 403);
    assert.equal(resPrj.body.error.code, 'ADMIN_ISOLATION');

    // 3. SC/ST Status
    const resQuota = await request(`/api/compliance/sc-st-status/${mpId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resQuota.status, 403);
    assert.equal(resQuota.body.error.code, 'ADMIN_ISOLATION');

    // 4. Compliance dashboard
    const resDash = await request('/api/compliance/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resDash.status, 403);
    assert.equal(resDash.body.error.code, 'ADMIN_ISOLATION');

    // 5. District compliance queue
    const resDist = await request('/api/compliance/district', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resDist.status, 403);
    assert.equal(resDist.body.error.code, 'ADMIN_ISOLATION');
  });

  test('Cross-jurisdiction access denial: Collector of another district cannot inspect or evaluate project compliance', async () => {
    const resEval = await request(`/api/compliance/evaluate/${testProjectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });
    assert.equal(resEval.status, 403);
    assert.equal(resEval.body.error.code, 'FORBIDDEN_JURISDICTION');

    const resGet = await request(`/api/compliance/project/${testProjectId}`, {
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });
    assert.equal(resGet.status, 403);
    assert.equal(resGet.body.error.code, 'FORBIDDEN_JURISDICTION');
  });
});
