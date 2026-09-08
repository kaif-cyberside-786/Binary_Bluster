/**
 * Phase 6 Backend Tests: Deterministic Compliance & Invariants Monitoring
 * Tests all 7 pure-function deterministic rules, evaluator orchestrator,
 * compliance API routes, jurisdiction boundaries, and strict Admin Isolation (403).
 */
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

let server;
let baseUrl;

function makeRequest(method, pathName, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      official_email: user.official_email,
      role: user.role,
      jurisdiction: user.jurisdiction,
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

const TEST_MP_USER = {
  user_id: 'MP-IND-01',
  official_email: 'mp.indore@sansad.nic.in',
  role: 'MP',
  jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
};

const TEST_DA_USER = {
  user_id: 'DA-IND-01',
  official_email: 'collector.indore@mp.gov.in',
  role: 'DISTRICT_AUTHORITY',
  jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
};

const TEST_DA_OTHER_USER = {
  user_id: 'DA-CMP-DHAR-01',
  official_email: 'da.dhar@mp.gov.in',
  role: 'DISTRICT_AUTHORITY',
  jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' },
};

const TEST_ADMIN_USER = {
  user_id: 'ADMIN001',
  official_email: 'admin@mplads.gov.in',
  role: 'ADMIN',
  jurisdiction: { level: 'NATIONAL' },
};

let mpToken;
let daToken;
let daOtherToken;
let adminToken;

const TEST_PROJECT_ID = 'PRJ-MAD-IND-CMPTEST01';

describe('Phase 6: Deterministic Compliance & Monitoring Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Clean up test data using native collection to bypass append-only hooks in tests
    await mongoose.connection.collection('projects').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('project_progress').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('project_payments').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('documents').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('compliance_findings').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('audit_logs').deleteMany({ project_id: TEST_PROJECT_ID });
    await mongoose.connection.collection('users').deleteMany({ user_id: TEST_DA_OTHER_USER.user_id });

    // Seed test Dhar DA user for cross-jurisdiction check
    await mongoose.connection.collection('users').insertOne({
      user_id: TEST_DA_OTHER_USER.user_id,
      official_email: TEST_DA_OTHER_USER.official_email,
      password_hash: 'dummyhash',
      full_name: 'Collector Dhar Test',
      role: TEST_DA_OTHER_USER.role,
      designation: 'District Collector',
      jurisdiction: TEST_DA_OTHER_USER.jurisdiction,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    mpToken = generateToken(TEST_MP_USER);
    daToken = generateToken(TEST_DA_USER);
    daOtherToken = generateToken(TEST_DA_OTHER_USER);
    adminToken = generateToken(TEST_ADMIN_USER);

    // Seed test project in SANCTIONED status
    await Project.create({
      project_id: TEST_PROJECT_ID,
      mp_id: TEST_MP_USER.user_id,
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
      project_id: TEST_PROJECT_ID,
      mp_id: TEST_MP_USER.user_id,
      description: 'Construction of durable CC road connecting main market to hospital ward 12',
      estimated_cost: 2500000,
      work_category: 'Roads & Bridges',
      location: { block: 'Indore Urban', village_ward: 'Ward 12' },
      recommended_by: TEST_MP_USER.user_id,
    });
  });

  after(async () => {
    // Native cleanup to bypass Mongoose append-only hooks
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.collection('projects').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('project_progress').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('project_payments').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('documents').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('compliance_findings').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('audit_logs').deleteMany({ project_id: TEST_PROJECT_ID });
      await mongoose.connection.collection('users').deleteMany({ user_id: TEST_DA_OTHER_USER.user_id });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

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
    const res = await makeRequest('POST', `/api/compliance/evaluate/${TEST_PROJECT_ID}`, {}, daToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.project_id, TEST_PROJECT_ID);
    assert.ok(['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'].includes(res.data.data.overall_status));
    assert.equal(res.data.data.summary.total_rules, 6);

    // Verify persisted findings in MongoDB
    const persisted = await ComplianceFinding.find({ project_id: TEST_PROJECT_ID }).lean();
    assert.equal(persisted.length, 6);

    // Verify AuditLog
    const audit = await AuditLog.findOne({
      project_id: TEST_PROJECT_ID,
      action: 'EVALUATE_COMPLIANCE',
    }).lean();
    assert.ok(audit);
    assert.equal(audit.user_id, TEST_DA_USER.user_id);
  });

  test('GET /api/compliance/project/:projectId returns project compliance details', async () => {
    const res = await makeRequest('GET', `/api/compliance/project/${TEST_PROJECT_ID}`, null, daToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.project_id, TEST_PROJECT_ID);
    assert.ok(Array.isArray(res.data.data.findings));
    assert.equal(res.data.data.findings.length, 6);
  });

  test('GET /api/projects/:projectId includes compliance summary in Project 360', async () => {
    const res = await makeRequest('GET', `/api/projects/${TEST_PROJECT_ID}`, null, daToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.compliance);
    assert.ok(res.data.data.compliance.overall_status);
    assert.ok(Array.isArray(res.data.data.compliance.findings));
  });

  test('GET /api/compliance/sc-st-status/:mpId returns continuous quota evaluation', async () => {
    const res = await makeRequest('GET', `/api/compliance/sc-st-status/${TEST_MP_USER.user_id}`, null, mpToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.mp_id, TEST_MP_USER.user_id);
    assert.ok(res.data.data.evidence.sc_target_percent === 15);
    assert.ok(res.data.data.evidence.st_target_percent === 7.5);
  });

  test('GET /api/compliance/dashboard returns scoped compliance statistics', async () => {
    const res = await makeRequest('GET', '/api/compliance/dashboard', null, daToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.total_projects >= 1);
    assert.ok(res.data.data.findings_by_rule);
  });

  test('Strict Admin Isolation: Admin receives 403 on all compliance routes per rules.md §10', async () => {
    // 1. Evaluate
    const resEval = await makeRequest('POST', `/api/compliance/evaluate/${TEST_PROJECT_ID}`, {}, adminToken);
    assert.equal(resEval.status, 403);
    assert.equal(resEval.data.error.code, 'ADMIN_ISOLATION');

    // 2. Project compliance
    const resPrj = await makeRequest('GET', `/api/compliance/project/${TEST_PROJECT_ID}`, null, adminToken);
    assert.equal(resPrj.status, 403);
    assert.equal(resPrj.data.error.code, 'ADMIN_ISOLATION');

    // 3. SC/ST Status
    const resQuota = await makeRequest('GET', `/api/compliance/sc-st-status/${TEST_MP_USER.user_id}`, null, adminToken);
    assert.equal(resQuota.status, 403);
    assert.equal(resQuota.data.error.code, 'ADMIN_ISOLATION');

    // 4. Compliance dashboard
    const resDash = await makeRequest('GET', '/api/compliance/dashboard', null, adminToken);
    assert.equal(resDash.status, 403);
    assert.equal(resDash.data.error.code, 'ADMIN_ISOLATION');
  });

  test('Cross-jurisdiction access denial: Collector of another district cannot inspect or evaluate project compliance', async () => {
    const resEval = await makeRequest('POST', `/api/compliance/evaluate/${TEST_PROJECT_ID}`, {}, daOtherToken);
    assert.equal(resEval.status, 403);
    assert.equal(resEval.data.error.code, 'FORBIDDEN_JURISDICTION');

    const resGet = await makeRequest('GET', `/api/compliance/project/${TEST_PROJECT_ID}`, null, daOtherToken);
    assert.equal(resGet.status, 403);
    assert.equal(resGet.data.error.code, 'FORBIDDEN_JURISDICTION');
  });
});
