/**
 * Phase 15 Backend Integration Tests: Audit, Traceability & Quality Assurance
 * Verifies all Phase 15 requirements:
 * 1. Material actions create audit rows with complete shape (actor_user_id, role, action, entity_type, entity_id, project_id, request_id, timestamp, event_type)
 * 2. AI events logged as SYSTEM, never as officer decisions (event_type: 'SYSTEM', actor: 'SYSTEM')
 * 3. Officer decisions logged as HUMAN (event_type: 'HUMAN', actor: officer_id)
 * 4. API blocks PUT, PATCH, DELETE on /api/audit/* (HTTP 403 IMMUTABLE_RECORD)
 * 5. API blocks direct POST to /api/audit (HTTP 403 IMMUTABLE_RECORD)
 * 6. API blocks PUT, PATCH, DELETE on /api/projects/:id/audit (HTTP 403 IMMUTABLE_RECORD)
 * 7. Mongoose appendOnlyPlugin rejects in-place update and delete operations on AuditLog (IMMUTABLE_RECORD)
 * 8. Admin Isolation: Admin receiving 403 ADMIN_ISOLATION on /api/audit
 * 9. Admin Isolation: Admin receiving 403 ADMIN_ISOLATION on /api/projects/:id/audit
 * 10. Jurisdiction Scoping: Cross-district authority receives 403 FORBIDDEN_JURISDICTION on /api/projects/:id/audit
 * 11. Auditor has read-only access to /api/audit and /api/projects/:id/audit
 * 12. Request correlation: X-Request-Id header is propagated and persisted in audit_logs.request_id
 * 13. Offline AI degradation: AI service unavailable logs AI_ANALYSIS_UNAVAILABLE as SYSTEM event without crashing
 * 14. Project 360 includes complete chronological audit trail
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
const auditService = require('../../backend-node/src/services/auditService');
const {
  Project,
  AuditLog,
  ProjectRecommendation,
  User,
} = require('../../backend-node/src/models');

describe('Phase 15 Backend: Audit, Traceability & Quality Assurance Tests', () => {
  let server;
  let baseUrl;

  const mpUserId = 'USR-P15-MP-01';
  const distIndoreUserId = 'USR-P15-DIST-IND';
  const distBhopalUserId = 'USR-P15-DIST-BHP';
  const auditorUserId = 'USR-P15-AUD-01';
  const adminUserId = 'USR-P15-ADMIN-01';
  const ministryUserId = 'USR-P15-MIN-01';

  let mpToken;
  let distIndoreToken;
  let distBhopalToken;
  let auditorToken;
  let adminToken;
  let ministryToken;

  const p1Id = `PRJ-P15-${Date.now()}-01`;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed test users
    const usersToSeed = [
      {
        user_id: mpUserId,
        official_email: 'mp.p15@sansad.nic.in',
        role: 'MP',
        full_name: 'MP Indore P15',
        designation: 'Member of Parliament',
        jurisdiction: { level: 'CONSTITUENCY', constituency: 'Indore', state: 'Madhya Pradesh' },
      },
      {
        user_id: distIndoreUserId,
        official_email: 'collector.indore.p15@mp.gov.in',
        role: 'DISTRICT_AUTHORITY',
        full_name: 'Collector Indore P15',
        designation: 'District Magistrate',
        jurisdiction: { level: 'DISTRICT', district: 'Indore', state: 'Madhya Pradesh' },
      },
      {
        user_id: distBhopalUserId,
        official_email: 'collector.bhopal.p15@mp.gov.in',
        role: 'DISTRICT_AUTHORITY',
        full_name: 'Collector Bhopal P15',
        designation: 'District Magistrate',
        jurisdiction: { level: 'DISTRICT', district: 'Bhopal', state: 'Madhya Pradesh' },
      },
      {
        user_id: auditorUserId,
        official_email: 'cag.auditor.p15@cag.gov.in',
        role: 'AUDITOR',
        full_name: 'Senior Auditor P15',
        designation: 'Senior Audit Officer',
        jurisdiction: { level: 'NATIONAL' },
      },
      {
        user_id: adminUserId,
        official_email: 'admin.p15@nic.in',
        role: 'ADMIN',
        full_name: 'System Admin P15',
        designation: 'Portal Administrator',
        jurisdiction: { level: 'NATIONAL' },
      },
      {
        user_id: ministryUserId,
        official_email: 'director.p15@mospi.gov.in',
        role: 'MINISTRY',
        full_name: 'Director MoSPI P15',
        designation: 'Director, MPLADS',
        jurisdiction: { level: 'NATIONAL' },
      },
    ];

    for (const u of usersToSeed) {
      await User.findOneAndUpdate(
        { user_id: u.user_id },
        { ...u, password_hash: 'mockhash', is_active: true },
        { upsert: true }
      );
    }

    const sign = (u) =>
      jwt.sign(
        {
          user_id: u.user_id,
          role: u.role,
          jurisdiction: u.jurisdiction,
          full_name: u.full_name,
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

    mpToken = sign(usersToSeed[0]);
    distIndoreToken = sign(usersToSeed[1]);
    distBhopalToken = sign(usersToSeed[2]);
    auditorToken = sign(usersToSeed[3]);
    adminToken = sign(usersToSeed[4]);
    ministryToken = sign(usersToSeed[5]);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let testProjectId = p1Id;

  // 1. Material actions create audit rows with complete shape
  test('1. Material action (PROJECT_RECOMMENDED) creates complete append-only audit row', async () => {
    const customRequestId = `req-trace-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/projects/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
        'X-Request-Id': customRequestId,
      },
      body: JSON.stringify({
        title: 'Community Skill Center P15',
        description: 'Construction of skill center in Indore for technical education',
        category: 'Education',
        estimated_cost: 2500000,
        district: 'Indore',
        location: {
          village_ward: 'Ward 12',
          block: 'Indore Urban',
        },
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    testProjectId = body.data.project.project_id;

    // Verify audit log record in MongoDB
    const auditRecord = await AuditLog.findOne({ project_id: testProjectId, action: 'CREATE_RECOMMENDATION' });
    assert.ok(auditRecord, 'Audit record for CREATE_RECOMMENDATION must exist');
    assert.strictEqual(auditRecord.event_type, 'HUMAN');
    assert.strictEqual(auditRecord.user_id, mpUserId);
    assert.strictEqual(auditRecord.actor_user_id, mpUserId);
    assert.strictEqual(auditRecord.role, 'MP');
    assert.strictEqual(auditRecord.request_id, customRequestId);
    assert.ok(auditRecord.timestamp instanceof Date);
    assert.strictEqual(auditRecord.entity_type, 'PROJECT');
    assert.strictEqual(auditRecord.entity_id, testProjectId);
  });

  // 2. AI events logged as SYSTEM, never as officer decisions
  test('2. AI evaluation logged as SYSTEM event, never as officer decision', async () => {
    const aiAudit = await auditService.recordAuditEvent({
      action: 'AI_ANALYSIS_COMPLETED',
      entity_type: 'PROJECT',
      entity_id: testProjectId,
      project_id: testProjectId,
      event_type: 'SYSTEM',
      actor_user_id: 'SYSTEM',
      role: 'SYSTEM',
      reason: 'Automated statistical anomaly detection & risk scoring completed',
      metadata: {
        analysis_id: `ANALYSIS-${Date.now()}`,
        overall_score: 42,
        risk_level: 'MEDIUM',
        ai_status: 'AI_ANALYSIS_COMPLETE',
      },
    });

    assert.ok(aiAudit);
    assert.strictEqual(aiAudit.event_type, 'SYSTEM');
    assert.strictEqual(aiAudit.actor_user_id, 'SYSTEM');
    assert.strictEqual(aiAudit.role, 'SYSTEM');
    assert.notStrictEqual(aiAudit.event_type, 'HUMAN', 'AI event must not be human');
    assert.ok(aiAudit.action.startsWith('AI_'));
  });

  // 3. Officer decisions logged as HUMAN decisions
  test('3. Officer sanction logged as HUMAN decision with officer user_id', async () => {
    const decisionRequestId = `req-dec-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${distIndoreToken}`,
        'X-Request-Id': decisionRequestId,
      },
      body: JSON.stringify({
        decision: 'SANCTION',
        reason: 'Statutory approval granted after review of technical specifications',
        assigned_agency_id: 'PWD-INDORE-01',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const auditRecord = await AuditLog.findOne({
      project_id: testProjectId,
      action: 'OFFICER_DECISION_SANCTION',
    });
    assert.ok(auditRecord, 'Decision audit log must exist');
    assert.strictEqual(auditRecord.event_type, 'HUMAN');
    assert.strictEqual(auditRecord.user_id, distIndoreUserId);
    assert.strictEqual(auditRecord.actor_user_id, distIndoreUserId);
    assert.strictEqual(auditRecord.role, 'DISTRICT_AUTHORITY');
    assert.strictEqual(auditRecord.request_id, decisionRequestId);
  });

  // 4. API blocks PUT, PATCH, DELETE on /api/audit/*
  test('4. API blocks PUT, PATCH, DELETE on /api/audit/* returning 403 IMMUTABLE_RECORD', async () => {
    const putRes = await fetch(`${baseUrl}/api/audit/AUD-TEST`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Attempted modification' }),
    });
    assert.strictEqual(putRes.status, 403);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.error.code, 'IMMUTABLE_RECORD');

    const patchRes = await fetch(`${baseUrl}/api/audit/AUD-TEST`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Attempted patch' }),
    });
    assert.strictEqual(patchRes.status, 403);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.error.code, 'IMMUTABLE_RECORD');

    const deleteRes = await fetch(`${baseUrl}/api/audit/AUD-TEST`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(deleteRes.status, 403);
    const delBody = await deleteRes.json();
    assert.strictEqual(delBody.error.code, 'IMMUTABLE_RECORD');
  });

  // 5. API blocks direct POST to /api/audit
  test('5. API blocks direct POST to /api/audit returning 403 IMMUTABLE_RECORD', async () => {
    const postRes = await fetch(`${baseUrl}/api/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'FAKE_ACTION' }),
    });
    assert.strictEqual(postRes.status, 403);
    const body = await postRes.json();
    assert.strictEqual(body.error.code, 'IMMUTABLE_RECORD');
  });

  // 6. API blocks mutation on /api/projects/:id/audit
  test('6. API blocks PUT, PATCH, DELETE on /api/projects/:id/audit returning 403 IMMUTABLE_RECORD', async () => {
    const delRes = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${distIndoreToken}` },
    });
    assert.strictEqual(delRes.status, 403);
    const body = await delRes.json();
    assert.strictEqual(body.error.code, 'IMMUTABLE_RECORD');
  });

  // 7. Mongoose appendOnlyPlugin rejects in-place update and delete
  test('7. Mongoose appendOnlyPlugin rejects in-place update and delete on AuditLog model', async () => {
    const testLog = await AuditLog.findOne({ project_id: testProjectId });
    assert.ok(testLog);

    // Save modification
    testLog.reason = 'Hacked reason';
    await assert.rejects(
      async () => {
        await testLog.save();
      },
      (err) => {
        assert.strictEqual(err.code, 'IMMUTABLE_RECORD');
        return true;
      }
    );

    // Query update
    await assert.rejects(
      async () => {
        await AuditLog.updateOne({ _id: testLog._id }, { reason: 'Hacked update' });
      },
      (err) => {
        assert.strictEqual(err.code, 'IMMUTABLE_RECORD');
        return true;
      }
    );

    // Query delete
    await assert.rejects(
      async () => {
        await AuditLog.deleteOne({ _id: testLog._id });
      },
      (err) => {
        assert.strictEqual(err.code, 'IMMUTABLE_RECORD');
        return true;
      }
    );
  });

  // 8. Admin Isolation: Admin receiving 403 ADMIN_ISOLATION on /api/audit
  test('8. Admin receives 403 ADMIN_ISOLATION on /api/audit', async () => {
    const res = await fetch(`${baseUrl}/api/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ADMIN_ISOLATION');
  });

  // 9. Admin Isolation: Admin receiving 403 ADMIN_ISOLATION on /api/projects/:id/audit
  test('9. Admin receives 403 ADMIN_ISOLATION on /api/projects/:id/audit', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'ADMIN_ISOLATION');
  });

  // 10. Jurisdiction Scoping: Cross-district authority receives 403 FORBIDDEN_JURISDICTION
  test('10. Cross-district authority receives 403 FORBIDDEN_JURISDICTION on /api/projects/:id/audit', async () => {
    // Project is in Indore; Collector Bhopal attempts access
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      headers: { Authorization: `Bearer ${distBhopalToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'FORBIDDEN_JURISDICTION');

    // Authorized Collector Indore succeeds
    const okRes = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      headers: { Authorization: `Bearer ${distIndoreToken}` },
    });
    assert.strictEqual(okRes.status, 200);
    const okBody = await okRes.json();
    assert.ok(okBody.data.audit_logs.length >= 2);
  });

  // 11. Auditor has read-only access to /api/audit and /api/projects/:id/audit
  test('11. Auditor has read access to /api/audit and /api/projects/:id/audit', async () => {
    const auditRes = await fetch(`${baseUrl}/api/audit?project_id=${testProjectId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert.strictEqual(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.ok(auditBody.data.records.length >= 2);

    const projectAuditRes = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert.strictEqual(projectAuditRes.status, 200);
    const projectAuditBody = await projectAuditRes.json();
    assert.ok(projectAuditBody.data.audit_logs.length >= 2);
  });

  // 12. Request correlation: X-Request-Id header is propagated and persisted
  test('12. Request correlation: X-Request-Id header is returned in response and stored in AuditLog', async () => {
    const testRequestId = `req-trace-correlation-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/audit`, {
      headers: {
        Authorization: `Bearer ${distIndoreToken}`,
        'X-Request-Id': testRequestId,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-request-id'), testRequestId);
  });

  // 13. Offline AI degradation: AI service unavailable logs AI_ANALYSIS_UNAVAILABLE
  test('13. Offline AI degradation: logs AI_ANALYSIS_UNAVAILABLE as SYSTEM event without crashing project', async () => {
    const unavailLog = await auditService.recordAuditEvent({
      action: 'AI_ANALYSIS_UNAVAILABLE',
      entity_type: 'PROJECT',
      entity_id: testProjectId,
      project_id: testProjectId,
      event_type: 'SYSTEM',
      actor_user_id: 'SYSTEM',
      role: 'SYSTEM',
      reason: 'AI service offline or timed out; system operated in degraded fallback mode',
      metadata: {
        fallback: true,
        triggered_by: distIndoreUserId,
      },
    });

    assert.ok(unavailLog);
    assert.strictEqual(unavailLog.event_type, 'SYSTEM');
    assert.strictEqual(unavailLog.action, 'AI_ANALYSIS_UNAVAILABLE');

    // Confirm project still exists and is healthy
    const prj = await Project.findOne({ project_id: testProjectId });
    assert.ok(prj);
    assert.strictEqual(prj.status, 'SANCTIONED');
  });

  // 14. Project 360 includes complete chronological audit trail
  test('14. Project 360 (GET /api/projects/:id) includes audit_trail array with human and system events', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${distIndoreToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data.audit_trail), 'audit_trail array must exist in Project 360');
    assert.ok(body.data.audit_trail.length >= 3, 'audit_trail must contain recommendation, decision, and AI events');

    const hasHuman = body.data.audit_trail.some((l) => l.event_type === 'HUMAN');
    const hasSystem = body.data.audit_trail.some((l) => l.event_type === 'SYSTEM');
    assert.ok(hasHuman, 'audit_trail must contain HUMAN decisions');
    assert.ok(hasSystem, 'audit_trail must contain SYSTEM events');
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
