/**
 * Automated tests for Project Lifecycle API & State Transitions
 * Verifies architecture.md §10.1 canonical states & rules.md §3, §6, §7, §10
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
  OfficerDecision,
  AuditLog,
} = require('../../backend-node/src/models');

describe('Project Lifecycle & District Review Queue Tests', () => {
  let server;
  let baseUrl;

  const mpId = 'MP-TEST-IND-01';
  const daId = 'DA-TEST-IND-01';
  const otherDaId = 'DA-TEST-BHO-01';
  const adminId = 'ADMIN-TEST-PL-01';

  let mpToken;
  let daToken;
  let otherDaToken;
  let adminToken;

  let createdProjectId = null;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test data using native driver to bypass append-only hooks in tests
    await mongoose.connection.collection('users').deleteMany({ user_id: { $in: [mpId, daId, otherDaId, adminId] } });
    await mongoose.connection.collection('projects').deleteMany({ mp_id: mpId });
    await mongoose.connection.collection('project_recommendations').deleteMany({ mp_id: mpId });

    const hash = await bcrypt.hash('TestPass@123', 12);

    // Create MP User
    await User.create({
      user_id: mpId,
      official_email: 'mp.ind@test.gov.in',
      password_hash: hash,
      full_name: 'Hon MP Indore Test',
      role: 'MP',
      designation: 'Member of Parliament',
      jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
      is_active: true,
    });

    // Create Indore District Authority
    await User.create({
      user_id: daId,
      official_email: 'da.ind@test.gov.in',
      password_hash: hash,
      full_name: 'District Collector Indore Test',
      role: 'DISTRICT_AUTHORITY',
      designation: 'Collector',
      jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
      is_active: true,
    });

    // Create Bhopal District Authority (different jurisdiction)
    await User.create({
      user_id: otherDaId,
      official_email: 'da.bho@test.gov.in',
      password_hash: hash,
      full_name: 'District Collector Bhopal Test',
      role: 'DISTRICT_AUTHORITY',
      designation: 'Collector',
      jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Bhopal' },
      is_active: true,
    });

    // Create Admin User
    await User.create({
      user_id: adminId,
      official_email: 'admin.pl@test.gov.in',
      password_hash: hash,
      full_name: 'Admin Test PL',
      role: 'ADMIN',
      designation: 'Admin',
      jurisdiction: { level: 'NATIONAL' },
      is_active: true,
    });

    // Generate JWTs
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
      { user_id: otherDaId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Bhopal' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

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
    await mongoose.connection.collection('users').deleteMany({ user_id: { $in: [mpId, daId, otherDaId, adminId] } });
    if (createdProjectId) {
      await mongoose.connection.collection('projects').deleteOne({ project_id: createdProjectId });
      await mongoose.connection.collection('project_recommendations').deleteOne({ project_id: createdProjectId });
      await mongoose.connection.collection('officer_decisions').deleteMany({ project_id: createdProjectId });
      await mongoose.connection.collection('audit_logs').deleteMany({ project_id: createdProjectId });
    }
    if (server?.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
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

  test('MP can create recommendation (atomically creates Project, ProjectRecommendation, AuditLog)', async () => {
    const payload = {
      title: 'Construction of Community Health Center Ward 12',
      category: 'Health & Family Welfare',
      estimated_cost: 2500000,
      description: 'Public health center catering to 15,000 residents in ward 12 with basic outpatient facilities.',
      location: { block: 'Indore Urban', gram_panchayat: 'Ward 12', village_ward: 'Sector A' },
    };

    const res = await request('/api/projects/recommendation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.project);
    assert.equal(res.body.data.project.status, 'DISTRICT_REVIEW');
    assert.equal(res.body.data.project.title, payload.title);

    createdProjectId = res.body.data.project.project_id;

    // Verify DB models exist
    const projectInDb = await Project.findOne({ project_id: createdProjectId });
    assert.ok(projectInDb);
    assert.equal(projectInDb.status, 'DISTRICT_REVIEW');

    const recInDb = await ProjectRecommendation.findOne({ project_id: createdProjectId });
    assert.ok(recInDb);
    assert.equal(recInDb.estimated_cost, payload.estimated_cost);

    const auditInDb = await AuditLog.findOne({ project_id: createdProjectId, action: 'CREATE_RECOMMENDATION' });
    assert.ok(auditInDb);
  });

  test('Non-MP user cannot create recommendation (403 Forbidden)', async () => {
    const payload = {
      title: 'Illegal Proposal Attempt',
      category: 'Drinking Water',
      estimated_cost: 100000,
      description: 'Should be rejected by RBAC.',
    };

    const res = await request('/api/projects/recommendation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${daToken}` },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('Validation: Rejects missing fields or invalid estimated cost', async () => {
    const res = await request('/api/projects/recommendation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify({
        title: '',
        category: 'Drinking Water',
        estimated_cost: -500,
        description: 'Short',
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('District Authority sees only in-jurisdiction pending projects', async () => {
    // Indore DA should see the project in Indore
    const resIndore = await request('/api/projects?status=DISTRICT_REVIEW', {
      headers: { Authorization: `Bearer ${daToken}` },
    });

    assert.equal(resIndore.status, 200);
    assert.ok(resIndore.body.data.items.some((p) => p.project_id === createdProjectId));

    // Bhopal DA should NOT see the project in Indore
    const resBhopal = await request('/api/projects?status=DISTRICT_REVIEW', {
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });

    assert.equal(resBhopal.status, 200);
    assert.ok(!resBhopal.body.data.items.some((p) => p.project_id === createdProjectId));
  });

  test('Admin Isolation: Admin cannot list project business data (403)', async () => {
    const res = await request('/api/projects', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ADMIN_ISOLATION');
  });

  test('District Authority can sanction project with substantive reason', async () => {
    const res = await request(`/api/projects/${createdProjectId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${daToken}` },
      body: JSON.stringify({
        decision: 'SANCTION',
        reason: 'Technical feasibility verified by RES Executive Engineer. DPR approved.',
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.project.status, 'SANCTIONED');

    // Verify DB update
    const project = await Project.findOne({ project_id: createdProjectId });
    assert.equal(project.status, 'SANCTIONED');
    assert.ok(project.sanction_date);

    // Verify append-only OfficerDecision created
    const decision = await OfficerDecision.findOne({ project_id: createdProjectId, decision: 'SANCTION' });
    assert.ok(decision);
    assert.equal(decision.officer_id, daId);
    assert.equal(decision.new_state, 'SANCTIONED');

    // Verify append-only AuditLog created
    const audit = await AuditLog.findOne({ project_id: createdProjectId, action: 'OFFICER_DECISION_SANCTION' });
    assert.ok(audit);
  });

  test('Decision requires substantive reason (minimum 5 characters)', async () => {
    const res = await request(`/api/projects/${createdProjectId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${daToken}` },
      body: JSON.stringify({
        decision: 'HOLD',
        reason: 'No', // Too short
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'REASON_REQUIRED');
  });

  test('Cross-jurisdiction officer cannot decide on project (403)', async () => {
    const res = await request(`/api/projects/${createdProjectId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherDaToken}` },
      body: JSON.stringify({
        decision: 'HOLD',
        reason: 'Attempting cross-district decision',
      }),
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_JURISDICTION');
  });
});

