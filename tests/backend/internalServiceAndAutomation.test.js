/**
 * Phase 7 Backend Tests: Internal Service Endpoints, Service Authentication & Automation
 * Verifies internal service routes (/api/internal/*), service credentials,
 * safe background execution, role boundaries, and core path independence from n8n.
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
  User,
  Project,
  ProjectRecommendation,
  Notification,
  Inspection,
  ComplianceFinding,
  AuditLog,
  MpAllocation,
} = require('../../backend-node/src/models');

describe('Phase 7: Internal Service Endpoints & Automation Workflows Tests', () => {
  let server;
  let baseUrl;

  const serviceToken = config.n8nServiceToken;
  const mpId = 'MP-N8N-TEST-01';
  const daId = 'DA-N8N-IND-01';
  const stateId = 'SNA-N8N-MP-01';
  const ministryId = 'MIN-N8N-01';
  const adminId = 'ADMIN-N8N-01';

  let mpToken;
  let daToken;
  let adminToken;
  let serviceJwtToken;

  const testProjectId = 'PRJ-MAD-IND-N8NTEST01';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Native collection cleanup to bypass append-only hooks in tests
    await mongoose.connection.collection('users').deleteMany({
      user_id: { $in: [mpId, daId, stateId, ministryId, adminId] },
    });
    await mongoose.connection.collection('projects').deleteMany({
      project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
    });
    await mongoose.connection.collection('project_recommendations').deleteMany({
      project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
    });
    await mongoose.connection.collection('notifications').deleteMany({
      recipient_user_id: { $in: [mpId, daId, stateId, ministryId, 'USR-DIST-01'] },
    });
    await mongoose.connection.collection('inspections').deleteMany({
      project_id: testProjectId,
    });
    await mongoose.connection.collection('compliance_findings').deleteMany({
      project_id: testProjectId,
    });
    await mongoose.connection.collection('audit_logs').deleteMany({
      project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
    });

    const hash = await bcrypt.hash('TestPass@123', 12);

    // Create test officers across tiers for notification/escalation routing
    await User.create([
      {
        user_id: mpId,
        official_email: 'mp.n8ntest@test.gov.in',
        password_hash: hash,
        full_name: 'Hon MP Indore N8N Test',
        role: 'MP',
        designation: 'Member of Parliament',
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
        is_active: true,
      },
      {
        user_id: daId,
        official_email: 'da.n8ntest@test.gov.in',
        password_hash: hash,
        full_name: 'Collector Indore N8N Test',
        role: 'DISTRICT_AUTHORITY',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        is_active: true,
      },
      {
        user_id: stateId,
        official_email: 'state.n8ntest@test.gov.in',
        password_hash: hash,
        full_name: 'State Nodal Officer MP N8N Test',
        role: 'STATE_NODAL_AUTHORITY',
        designation: 'State Secretary',
        jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' },
        is_active: true,
      },
      {
        user_id: ministryId,
        official_email: 'ministry.n8ntest@test.gov.in',
        password_hash: hash,
        full_name: 'Director MoSPI N8N Test',
        role: 'MINISTRY',
        designation: 'Director',
        jurisdiction: { level: 'NATIONAL' },
        is_active: true,
      },
      {
        user_id: adminId,
        official_email: 'admin.n8ntest@test.gov.in',
        password_hash: hash,
        full_name: 'Admin N8N Test',
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
    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    serviceJwtToken = jwt.sign(
      { user_id: 'SYSTEM_N8N_JWT', role: 'SERVICE', designation: 'Automated Worker', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Create an active project for scheduled monitoring & batch compliance
    await Project.create({
      project_id: testProjectId,
      mp_id: mpId,
      state: 'Madhya Pradesh',
      district: 'Indore',
      category: 'Drinking Water',
      title: 'Installation of Solar RO Drinking Water Plant in Ward 5',
      status: 'SANCTIONED',
      estimated_cost: 1200000,
      sanctioned_cost: 1200000,
      sanction_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    });

    await ProjectRecommendation.create({
      project_id: testProjectId,
      mp_id: mpId,
      description: 'Solar powered community reverse osmosis water purification plant',
      estimated_cost: 1200000,
      work_category: 'Drinking Water',
      location: { block: 'Indore Urban', village_ward: 'Ward 5' },
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
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.collection('users').deleteMany({
        user_id: { $in: [mpId, daId, stateId, ministryId, adminId] },
      });
      await mongoose.connection.collection('projects').deleteMany({
        project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
      });
      await mongoose.connection.collection('project_recommendations').deleteMany({
        project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
      });
      await mongoose.connection.collection('notifications').deleteMany({
        recipient_user_id: { $in: [mpId, daId, stateId, ministryId, 'USR-DIST-01'] },
      });
      await mongoose.connection.collection('inspections').deleteMany({
        project_id: testProjectId,
      });
      await mongoose.connection.collection('compliance_findings').deleteMany({
        project_id: testProjectId,
      });
      await mongoose.connection.collection('audit_logs').deleteMany({
        project_id: { $in: [testProjectId, `${testProjectId}-INDEP`] },
      });
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

  // 1. Service Authentication & Boundary Tests
  test('Service Auth: rejects request missing service token with HTTP 401', async () => {
    const res = await request('/api/internal/status');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED_SERVICE');
  });

  test('Service Auth: rejects request with invalid service token with HTTP 401', async () => {
    const res = await request('/api/internal/status', {
      headers: { 'X-Service-Token': 'invalid_secret_token_123' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED_SERVICE');
  });

  test('Service Auth: accepts valid X-Service-Token header', async () => {
    const res = await request('/api/internal/status', {
      headers: { 'X-Service-Token': serviceToken },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'MPLADS_INTERNAL_AUTOMATION');
    assert.equal(res.body.data.services.database, 'CONNECTED');
  });

  test('Service Auth: accepts valid Authorization: Bearer service token', async () => {
    const res = await request('/api/internal/status', {
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Service Auth: accepts valid signed JWT with role SERVICE', async () => {
    const res = await request('/api/internal/status', {
      headers: { Authorization: `Bearer ${serviceJwtToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Admin Isolation / Role Boundary: Normal Admin token cannot access /api/internal/* without service credentials', async () => {
    const res = await request('/api/internal/status', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // Regular admin JWT is not a service token and doesn't have role 'SERVICE'
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED_SERVICE');
  });

  test('Service Identity cannot access officer transactional routes (e.g. Sanction decisions)', async () => {
    const res = await request(`/api/projects/${testProjectId}/decision`, {
      method: 'PATCH',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({ action: 'SANCTION', reason: 'Automated sanction attempt' }),
    });
    // Officer endpoints require role DISTRICT_AUTHORITY, not SERVICE
    assert.equal(res.status, 401); // User auth expects user JWT
  });

  // 2. Workflow 1: Data Ingestion Endpoint Tests
  test('POST /api/internal/ingestion/allocations runs idempotent ingestion and returns counts', async () => {
    const res = await request('/api/internal/ingestion/allocations', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({ year: '2024-2025' }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.operation, 'ALLOCATIONS_INGESTION');
    assert.equal(res.body.data.is_real_government_data, true);
    assert.ok(typeof res.body.data.loaded === 'number');
    assert.ok(res.body.data.loaded >= 500); // 542 real MP records
  });

  // 3. Workflow 2: Active Projects & Batch Compliance Monitor Tests
  test('GET /api/internal/projects/active returns list of active projects', async () => {
    const res = await request('/api/internal/projects/active?limit=10', {
      headers: { 'X-Service-Token': serviceToken },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.projects));
    assert.ok(res.body.data.total >= 1);
    const found = res.body.data.projects.find((p) => p.project_id === testProjectId);
    assert.ok(found);
    assert.equal(found.status, 'SANCTIONED');
  });

  test('POST /api/internal/compliance/evaluate-batch evaluates projects and aggregates statuses', async () => {
    const res = await request('/api/internal/compliance/evaluate-batch', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({ projectIds: [testProjectId] }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.total_evaluated, 1);
    assert.ok(res.body.data.results.length === 1);
    assert.equal(res.body.data.results[0].project_id, testProjectId);
    assert.ok(['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'].includes(res.body.data.results[0].overall_status));
  });

  // 4. Workflow 3: Notifications Router Tests
  test('POST /api/internal/notifications creates validated notification records', async () => {
    const res = await request('/api/internal/notifications', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        recipient_user_id: daId,
        type: 'COMPLIANCE_ALERT',
        title: 'Overdue UC Alert for Ward 5 Project',
        message: 'A payment has been disbursed without a filed UC exceeding 90 days.',
        project_id: testProjectId,
      }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.created_count, 1);

    // Verify persisted record in DB
    const saved = await Notification.findOne({ recipient_user_id: daId, project_id: testProjectId }).lean();
    assert.ok(saved);
    assert.equal(saved.type, 'COMPLIANCE_ALERT');
    assert.equal(saved.is_read, false);
  });

  test('POST /api/internal/notifications rejects missing required fields', async () => {
    const res = await request('/api/internal/notifications', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        recipient_user_id: '',
        title: '',
        message: '',
      }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // 5. Workflow 4: Escalation Handler Tests
  test('POST /api/internal/escalations dispatches multi-tier alert chain across District, State, and Ministry', async () => {
    const res = await request('/api/internal/escalations', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        district: 'Indore',
        state: 'Madhya Pradesh',
        trigger_reason: '3 repeated non-compliant findings on water works',
        non_compliant_count: 3,
        project_ids: [testProjectId],
        notes: 'Dispatched by n8n escalation handler',
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.escalation_id.startsWith('ESC-'));
    assert.ok(res.body.data.notified_users_count >= 3); // DA, State Nodal, Ministry

    // Verify notifications were delivered to all three roles
    const notifications = await Notification.find({
      type: 'ESCALATION',
      recipient_user_id: { $in: [daId, stateId, ministryId] },
    }).lean();
    assert.ok(notifications.length >= 3);
  });

  // 6. Workflow 5: Inspection Recommendation Shell Tests
  test('POST /api/internal/inspections/recommend creates an advisory recommendation shell in inspections collection', async () => {
    const res = await request('/api/internal/inspections/recommend', {
      method: 'POST',
      headers: { 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        project_id: testProjectId,
        reason: 'Severe cost drift (> 25%) detected by deterministic compliance monitor',
        priority: 'HIGH',
      }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'RECOMMENDED');
    assert.equal(res.body.data.priority, 'HIGH');
    assert.ok(res.body.data.advisory_note);

    // Verify DB inspection record
    const record = await Inspection.findOne({ project_id: testProjectId }).lean();
    assert.ok(record);
    assert.equal(record.status, 'RECOMMENDED');
    assert.equal(record.priority, 'HIGH');
    assert.equal(record.assigned_officer_id, null); // Human must assign
  });

  // 7. Critical Architecture Invariant: Core Path Independence from n8n
  test('CRITICAL: Core platform operates 100% synchronously with zero n8n dependency', async () => {
    const indepProjectId = `${testProjectId}-INDEP`;

    // 1. MP Recommends work directly via Express
    const resRec = await request('/api/projects/recommendation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify({
        title: 'Construction of Community Hall Ward 8',
        category: 'Community Hall',
        work_category: 'Community Hall',
        estimated_cost: 3500000,
        district: 'Indore',
        description: 'Multipurpose public hall with solar roof and rainwater harvesting',
        location: { block: 'Indore Urban', village_ward: 'Ward 8' },
      }),
    });
    assert.equal(resRec.status, 201);
    assert.equal(resRec.body.success, true);
    const newProjectId = resRec.body.data.project.project_id;
    assert.equal(resRec.body.data.project.status, 'DISTRICT_REVIEW');

    // 2. District Collector Reviews and Sanctions directly via Express
    const resSanction = await request(`/api/projects/${newProjectId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${daToken}` },
      body: JSON.stringify({
        decision: 'SANCTION',
        reason: 'Technically and administratively verified under annual plan quota',
      }),
    });
    assert.equal(resSanction.status, 200);
    assert.equal(resSanction.body.success, true);
    assert.equal(resSanction.body.data.project.status, 'SANCTIONED');

    // 3. User evaluates deterministic compliance on-demand
    const resEval = await request(`/api/compliance/evaluate/${newProjectId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(resEval.status, 200);
    assert.equal(resEval.body.success, true);
    assert.ok(['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'].includes(resEval.body.data.overall_status));

    // 4. User views Project 360 overview
    const res360 = await request(`/api/projects/${newProjectId}`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(res360.status, 200);
    assert.equal(res360.body.success, true);
    assert.equal(res360.body.data.project.project_id, newProjectId);
    assert.ok(res360.body.data.compliance);
    assert.ok(Array.isArray(res360.body.data.decisions));

    // Clean up temporary independent project
    await mongoose.connection.collection('projects').deleteOne({ project_id: newProjectId });
    await mongoose.connection.collection('project_recommendations').deleteOne({ project_id: newProjectId });
    await mongoose.connection.collection('compliance_findings').deleteMany({ project_id: newProjectId });
    await mongoose.connection.collection('audit_logs').deleteMany({ project_id: newProjectId });
  });
});
