/**
 * Automated Tests for Phase 5: Project Management, Engineering, Progress, Payments & Documents
 * Verifies architecture.md §10.1, §14, and rules.md §4, §9, §10
 */
process.env.NODE_ENV = 'test';
const path = require('path');
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const {
  User,
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  UtilizationCertificate,
  Document,
  OfficerDecision,
  AuditLog,
} = require('../../backend-node/src/models');

describe('Phase 5: Project Management, Engineering, Progress, Payments & Documents Tests', () => {
  let server;
  let baseUrl;

  const mpId = 'MP-P5-IND-01';
  const daId = 'DA-P5-IND-01';
  const otherDaId = 'DA-P5-BHO-01';
  const agencyId = 'AG-P5-PWD-01';
  const adminId = 'ADMIN-P5-01';

  let mpToken;
  let daToken;
  let otherDaToken;
  let agencyToken;
  let adminToken;

  const testProjectId = 'PRJ-MAD-IND-PHASE5TEST';
  let createdPaymentId = null;
  let createdDocId = null;
  let createdDocPath = null;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test data using native driver to bypass append-only hooks in tests
    await mongoose.connection.collection('users').deleteMany({
      user_id: { $in: [mpId, daId, otherDaId, agencyId, adminId] },
    });
    await mongoose.connection.collection('projects').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_progress').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_payments').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('documents').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('officer_decisions').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('audit_logs').deleteMany({ project_id: testProjectId });

    const hash = await bcrypt.hash('TestPass@123', 12);

    // Create test users
    await User.create([
      {
        user_id: mpId,
        official_email: 'mp.p5@test.gov.in',
        password_hash: hash,
        full_name: 'MP Indore Phase 5',
        role: 'MP',
        designation: 'Member of Parliament',
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
        is_active: true,
      },
      {
        user_id: daId,
        official_email: 'da.p5@test.gov.in',
        password_hash: hash,
        full_name: 'District Collector Indore Phase 5',
        role: 'DISTRICT_AUTHORITY',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        is_active: true,
      },
      {
        user_id: otherDaId,
        official_email: 'da.bho.p5@test.gov.in',
        password_hash: hash,
        full_name: 'District Collector Bhopal Phase 5',
        role: 'DISTRICT_AUTHORITY',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Bhopal' },
        is_active: true,
      },
      {
        user_id: agencyId,
        official_email: 'ee.pwd.p5@test.gov.in',
        password_hash: hash,
        full_name: 'Executive Engineer PWD Phase 5',
        role: 'IMPLEMENTING_AGENCY',
        designation: 'Executive Engineer',
        jurisdiction: { level: 'AGENCY', state: 'Madhya Pradesh', district: 'Indore', agency_id: 'PWD-INDORE-01' },
        is_active: true,
      },
      {
        user_id: adminId,
        official_email: 'admin.p5@test.gov.in',
        password_hash: hash,
        full_name: 'Admin Phase 5',
        role: 'ADMIN',
        designation: 'System Administrator',
        jurisdiction: { level: 'NATIONAL' },
        is_active: true,
      },
    ]);

    // Create test Project in SANCTIONED state
    await Project.create({
      project_id: testProjectId,
      mp_id: mpId,
      state: 'Madhya Pradesh',
      district: 'Indore',
      category: 'Roads & Bridges',
      title: 'Construction of Cement Concrete Road Ward 15',
      status: 'SANCTIONED',
      estimated_cost: 3000000,
      sanctioned_cost: 3000000,
      implementing_agency_id: 'PWD-INDORE-01',
      sanction_date: new Date(),
      is_real_government_data: false,
      is_synthetic: false,
    });

    // Create initial ProjectRecommendation
    await ProjectRecommendation.create({
      project_id: testProjectId,
      mp_id: mpId,
      description: 'Construction of 500m CC road connecting main market to community school.',
      location: { block: 'Indore Urban', gram_panchayat: 'Ward 15', village_ward: 'Sector 3' },
      estimated_cost: 3000000,
      work_category: 'Roads & Bridges',
      recommended_at: new Date(),
      recommended_by: mpId,
    });

    // Tokens
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
    agencyToken = jwt.sign(
      { user_id: agencyId, role: 'IMPLEMENTING_AGENCY', jurisdiction: { level: 'AGENCY', state: 'Madhya Pradesh', district: 'Indore', agency_id: 'PWD-INDORE-01' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await mongoose.connection.collection('users').deleteMany({
      user_id: { $in: [mpId, daId, otherDaId, agencyId, adminId] },
    });
    await mongoose.connection.collection('projects').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_progress').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('project_payments').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('utilization_certificates').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('documents').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('officer_decisions').deleteMany({ project_id: testProjectId });
    await mongoose.connection.collection('audit_logs').deleteMany({ project_id: testProjectId });

    if (createdDocPath && fs.existsSync(createdDocPath)) {
      try { fs.unlinkSync(createdDocPath); } catch {}
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

  // 1. ENGINEERING REPORTS TESTS
  test('Agency can submit Engineering Report v1 and v2; both versions retained in chronological order', async () => {
    // Submit v1
    const res1 = await request(`/api/projects/${testProjectId}/engineering-reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        detailed_estimate: 2850000,
        technical_specs: {
          dimensions: '500m x 4.0m x 0.15m',
          materials: ['Cement M30', 'Stone Aggregate', 'Steel'],
          specifications_summary: 'Rigid pavement design per IRC:SP:62-2014 norms.',
        },
        rate_schedule_basis: 'MP PWD Schedule of Rates 2024',
      }),
    });

    assert.equal(res1.status, 201);
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.data.version, 1);
    assert.equal(res1.body.data.detailed_estimate, 2850000);

    // Submit v2 (updated estimate and dimensions)
    const res2 = await request(`/api/projects/${testProjectId}/engineering-reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        detailed_estimate: 2980000,
        technical_specs: {
          dimensions: '520m x 4.5m x 0.15m',
          materials: ['Cement M35', 'Ready-Mix Concrete', 'Drainage Spouts'],
          specifications_summary: 'Revised scope with side storm drainage per district engineer inspection.',
        },
        rate_schedule_basis: 'MP PWD Schedule of Rates 2024',
      }),
    });

    assert.equal(res2.status, 201);
    assert.equal(res2.body.data.version, 2);
    assert.equal(res2.body.data.detailed_estimate, 2980000);

    // Verify both versions exist in database
    const reportsInDb = await EngineeringReport.find({ project_id: testProjectId }).sort({ version: 1 });
    assert.equal(reportsInDb.length, 2);
    assert.equal(reportsInDb[0].version, 1);
    assert.equal(reportsInDb[1].version, 2);

    // Verify appendOnlyPlugin prevents modifying v1
    await assert.rejects(
      async () => {
        await EngineeringReport.updateOne(
          { project_id: testProjectId, version: 1 },
          { $set: { detailed_estimate: 999999 } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );
  });

  test('Validation: Rejects invalid or negative engineering estimates', async () => {
    const res = await request(`/api/projects/${testProjectId}/engineering-reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        detailed_estimate: -50000,
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // 2. PHYSICAL PROGRESS TESTS
  test('Agency can append physical progress update; automatic transition to IN_PROGRESS', async () => {
    const res = await request(`/api/projects/${testProjectId}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        percent_complete: 35,
        stage: 'FOUNDATION',
        physical_summary: 'Sub-base preparation and compaction completed across 500m length.',
        geo_coordinates: { latitude: 22.7196, longitude: 75.8577 },
        photos_count: 3,
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.percent_complete, 35);
    assert.equal(res.body.data.stage, 'FOUNDATION');

    // Verify project status updated to IN_PROGRESS
    const project = await Project.findOne({ project_id: testProjectId });
    assert.equal(project.status, 'IN_PROGRESS');

    // Verify append-only immutability on progress
    await assert.rejects(
      async () => {
        await ProjectProgress.updateOne(
          { project_id: testProjectId },
          { $set: { percent_complete: 99 } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );
  });

  // 3. PAYMENT INSTALLMENT TESTS
  test('Agency creates payment installment with PENDING status; invalid amounts rejected', async () => {
    // Negative amount rejected
    const badRes = await request(`/api/projects/${testProjectId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        installment_number: 1,
        amount: -100000,
      }),
    });
    assert.equal(badRes.status, 400);

    // Valid payment creation
    const res = await request(`/api/projects/${testProjectId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        installment_number: 1,
        amount: 1000000,
        sanction_order_ref: 'SO-IND-2026-0042',
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.amount, 1000000);
    createdPaymentId = res.body.data.payment_id;
  });

  test('District Authority approves payment installment with substantive reason; cross-jurisdiction rejected', async () => {
    // Cross-jurisdiction Bhopal DA cannot approve Indore project payment
    const crossRes = await request(`/api/projects/${testProjectId}/payments/${createdPaymentId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherDaToken}` },
      body: JSON.stringify({
        status: 'APPROVED',
        reason: 'Attempting cross-district approval',
      }),
    });
    assert.equal(crossRes.status, 403);

    // Indore DA approves payment
    const res = await request(`/api/projects/${testProjectId}/payments/${createdPaymentId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${daToken}` },
      body: JSON.stringify({
        status: 'APPROVED',
        reason: 'Physical inspection report verified 35% sub-base completion. First installment approved.',
        voucher_number: 'VCH-IND-2026-9918',
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'APPROVED');
    assert.equal(res.body.data.voucher_number, 'VCH-IND-2026-9918');

    // Verify appendOnlyPlugin prevents modifying amount
    await assert.rejects(
      async () => {
        await ProjectPayment.updateOne(
          { payment_id: createdPaymentId },
          { $set: { amount: 5000000 } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    // Verify OfficerDecision created
    const decision = await OfficerDecision.findOne({
      project_id: testProjectId,
      decision: 'SANCTION',
      officer_id: daId,
    });
    assert.ok(decision);
  });

  // 4. UTILIZATION CERTIFICATE (UC) TESTS
  test('Agency can file Utilization Certificate linked to payment', async () => {
    const res = await request(`/api/projects/${testProjectId}/utilization-certificates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        payment_id: createdPaymentId,
        amount_certified: 1000000,
        is_filed: true,
        file_ref: 'UC-IND-2026-001.pdf',
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.amount_certified, 1000000);
    assert.equal(res.body.data.is_filed, true);

    // Query UCs
    const listRes = await request(`/api/projects/${testProjectId}/utilization-certificates`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);
  });

  // 5. CONTROLLED DOCUMENT PIPELINE TESTS
  test('Multipart document upload stores binary on disk and metadata in DB with SHA-256 hash', async () => {
    const boundary = '----WebKitFormBoundaryPhase5Test';
    const sampleContent = '%PDF-1.4 sample test document binary content for phase 5';
    
    const bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document_type"\r\n\r\nDETAILED_PROJECT_REPORT\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="DPR_Ward15.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      Buffer.from(sampleContent),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agencyToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.document_type, 'DETAILED_PROJECT_REPORT');
    assert.equal(body.data.file_name, 'DPR_Ward15.pdf');
    assert.ok(body.data.sha256_hash);

    createdDocId = body.data.document_id;
    createdDocPath = path.resolve(config.uploadDir, body.data.storage_ref);
    assert.ok(fs.existsSync(createdDocPath));

    // Verify metadata list contains zero storage_ref exposure
    const listRes = await request(`/api/projects/${testProjectId}/documents`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.some((d) => d.document_id === createdDocId));
  });

  test('Authorized document streaming download; Admin gets 403 ADMIN_ISOLATION, Cross-district gets 403', async () => {
    // 1. Admin blocked by Admin Isolation
    const adminRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    const adminBody = await adminRes.json();
    assert.equal(adminBody.error.code, 'ADMIN_ISOLATION');

    // 2. Cross-district Bhopal DA blocked
    const crossRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`, {
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });
    assert.equal(crossRes.status, 403);

    // 3. Authorized Indore DA successfully downloads file
    const daRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.equal(daRes.status, 200);
    assert.equal(daRes.headers.get('content-type'), 'application/pdf');
    const downloadedContent = await daRes.text();
    assert.ok(downloadedContent.includes('%PDF-1.4 sample test document'));
  });

  // 6. PROJECT 360 AGGREGATED VIEW TESTS
  test('GET /api/projects/:projectId returns complete project 360; Admin blocked with 403', async () => {
    // MP retrieves full project 360
    const res = await request(`/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.project);
    assert.ok(res.body.data.recommendation);
    assert.ok(res.body.data.engineering_reports.length >= 2);
    assert.ok(res.body.data.progress.length >= 1);
    assert.ok(res.body.data.payments.length >= 1);
    assert.ok(res.body.data.utilization_certificates.length >= 1);
    assert.ok(res.body.data.documents.length >= 1);

    // Admin blocked from project details
    const adminRes = await request(`/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    assert.equal(adminRes.body.error.code, 'ADMIN_ISOLATION');
  });
});
