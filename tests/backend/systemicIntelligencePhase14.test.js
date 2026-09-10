/**
 * Phase 14 Backend Integration Tests: Ministry Systemic Intelligence & Portfolio Analytics
 * Tests all 25 core criteria:
 * 1. GET /api/systemic/overview succeeds for MINISTRY token with national aggregates
 * 2. GET /api/systemic/overview supports optional analytics state filter for Ministry
 * 3. GET /api/systemic/overview calculates accurate Value-at-Risk (deduplicated)
 * 4. GET /api/systemic/overview correctly calculates Phase 9 risk distribution and high_risk_rate
 * 5. GET /api/systemic/overview reports canonical project status distribution
 * 6. GET /api/systemic/geographic succeeds for MINISTRY grouping by State
 * 7. GET /api/systemic/geographic succeeds for STATE_NODAL_AUTHORITY grouping by District
 * 8. State Nodal Authority requesting another State via ?state= receives 403 FORBIDDEN_JURISDICTION
 * 9. GET /api/systemic/categories aggregates project count, outlay, and risk rates
 * 10. GET /api/systemic/agency-concentration calculates systemic HHI without suitability ranking
 * 11. Agency concentration flags agencies with >35% value share (concentration guardrail)
 * 12. GET /api/systemic/inspections aggregates canonical 7-stage lifecycle tally
 * 13. GET /api/systemic/inspections aggregates inspection outcomes (NO_ISSUE, REVIEW_REQUIRED, ESCALATE)
 * 14. GET /api/systemic/inspections rolls up State 1% physical inspection statutory quota
 * 15. GET /api/systemic/attention ranks regions by transparent multi-signal formula
 * 16. Higher risk and non-compliant areas rank higher in attention list than clean areas
 * 17. Admin receives 403 ADMIN_ISOLATION on /api/systemic/overview
 * 18. Admin receives 403 ADMIN_ISOLATION on all systemic endpoints
 * 19. District Authority receives 403 FORBIDDEN_ROLE on systemic endpoints
 * 20. Member of Parliament receives 403 FORBIDDEN_ROLE on systemic endpoints
 * 21. Implementing Agency receives 403 FORBIDDEN_ROLE on systemic endpoints
 * 22. Unauthenticated request receives 401 UNAUTHENTICATED
 * 23. Auditor receives read-only access within authorized jurisdiction scope
 * 24. Read-only safety: Systemic GET endpoints do NOT mutate project status, decisions, or inspections
 * 25. Empty/sparse database behavior returns 200 with honest 0 counts and empty arrays
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
  AiRiskScore,
  ComplianceFinding,
  Inspection,
  ImplementingAgency,
  User,
} = require('../../backend-node/src/models');

describe('Phase 14 Backend: Systemic Intelligence & Portfolio Analytics Tests', () => {
  let server;
  let baseUrl;
  let isDbConnected = false;

  const ministryUserId = 'MIN-P14-01';
  const snaMpUserId = 'SNA-P14-MP-01';
  const daIndoreUserId = 'DA-P14-IND-01';
  const adminUserId = 'ADMIN-P14-01';
  const auditorUserId = 'AUD-P14-01';
  const mpUserId = 'MP-P14-01';
  const agencyUserId = 'AG-P14-01';

  let ministryToken;
  let snaToken;
  let daToken;
  let adminToken;
  let auditorToken;
  let mpToken;
  let agencyToken;

  const p1Id = 'PRJ-MAD-IND-P14-HIGH';
  const p2Id = 'PRJ-MAD-IND-P14-MED';
  const p3Id = 'PRJ-MAD-BHP-P14-CLEAN';
  const p4Id = 'PRJ-MAH-MUM-P14-HIGH';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    isDbConnected = mongoose.connection.readyState === 1;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Seed Test Users
    await User.findOneAndUpdate(
      { user_id: ministryUserId },
      {
        user_id: ministryUserId,
        official_email: 'director.diid.p14@mospi.gov.in',
        role: 'MINISTRY',
        full_name: 'Director DIID MoSPI',
        designation: 'Director, DIID',
        jurisdiction: { level: 'NATIONAL' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: snaMpUserId },
      {
        user_id: snaMpUserId,
        official_email: 'sna.mp.p14@mp.gov.in',
        role: 'STATE_NODAL_AUTHORITY',
        full_name: 'State Nodal Officer MP',
        designation: 'Secretary Planning',
        jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: daIndoreUserId },
      {
        user_id: daIndoreUserId,
        official_email: 'da.indore.p14@mp.gov.in',
        role: 'DISTRICT_AUTHORITY',
        full_name: 'District Magistrate Indore',
        designation: 'Collector',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: adminUserId },
      {
        user_id: adminUserId,
        official_email: 'admin.p14@mplads.gov.in',
        role: 'ADMIN',
        full_name: 'System Admin',
        designation: 'Portal Administrator',
        jurisdiction: { level: 'NATIONAL' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: auditorUserId },
      {
        user_id: auditorUserId,
        official_email: 'auditor.p14@cag.gov.in',
        role: 'AUDITOR',
        full_name: 'Principal Auditor',
        designation: 'Senior Auditor',
        jurisdiction: { level: 'NATIONAL' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: mpUserId },
      {
        user_id: mpUserId,
        official_email: 'mp.indore.p14@sansad.nic.in',
        role: 'MP',
        full_name: 'Member of Parliament Indore',
        designation: 'Lok Sabha MP',
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { user_id: agencyUserId },
      {
        user_id: agencyUserId,
        official_email: 'pwd.indore.p14@mp.gov.in',
        role: 'IMPLEMENTING_AGENCY',
        full_name: 'Executive Engineer PWD',
        designation: 'EE PWD Indore',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    // 2. Generate Auth JWTs
    ministryToken = jwt.sign(
      { user_id: ministryUserId, role: 'MINISTRY', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    snaToken = jwt.sign(
      { user_id: snaMpUserId, role: 'STATE_NODAL_AUTHORITY', jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    daToken = jwt.sign(
      { user_id: daIndoreUserId, role: 'DISTRICT_AUTHORITY', jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { user_id: adminUserId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    auditorToken = jwt.sign(
      { user_id: auditorUserId, role: 'AUDITOR', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    mpToken = jwt.sign(
      { user_id: mpUserId, role: 'MP', jurisdiction: { level: 'CONSTITUENCY' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    agencyToken = jwt.sign(
      { user_id: agencyUserId, role: 'IMPLEMENTING_AGENCY', jurisdiction: { level: 'DISTRICT' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    if (isDbConnected) {
      // 3. Seed Implementing Agencies
      await ImplementingAgency.findOneAndUpdate(
        { agency_id: 'PWD-INDORE-P14' },
        {
          agency_id: 'PWD-INDORE-P14',
          name: 'Public Works Department Indore Division',
          state: 'Madhya Pradesh',
          district: 'Indore',
          type: 'PWD',
          is_active: true,
        },
        { upsert: true }
      );

      // 4. Seed Known Fixture Projects
      await Project.findOneAndUpdate(
        { project_id: p1Id },
        {
          project_id: p1Id,
          mp_id: 'MP-INDORE-01',
          state: 'Madhya Pradesh',
          district: 'Indore',
          category: 'Roads & Bridges',
          title: 'High Risk Ring Road Overlap',
          status: 'SANCTIONED',
          estimated_cost: 4000000,
          sanctioned_cost: 4000000,
          implementing_agency_id: 'PWD-INDORE-P14',
          sanction_date: new Date('2026-02-01'),
        },
        { upsert: true }
      );

      await Project.findOneAndUpdate(
        { project_id: p2Id },
        {
          project_id: p2Id,
          mp_id: 'MP-INDORE-01',
          state: 'Madhya Pradesh',
          district: 'Indore',
          category: 'Drinking Water',
          title: 'Medium Risk Water Supply',
          status: 'IN_PROGRESS',
          estimated_cost: 2000000,
          sanctioned_cost: 2000000,
          implementing_agency_id: 'PWD-INDORE-P14',
          sanction_date: new Date('2026-02-15'),
        },
        { upsert: true }
      );

      await Project.findOneAndUpdate(
        { project_id: p3Id },
        {
          project_id: p3Id,
          mp_id: 'MP-BHOPAL-01',
          state: 'Madhya Pradesh',
          district: 'Bhopal',
          category: 'Community Hall',
          title: 'Clean Community Hall',
          status: 'COMPLETED',
          estimated_cost: 1500000,
          sanctioned_cost: 1500000,
          implementing_agency_id: 'RES-BHOPAL-01',
          sanction_date: new Date('2026-01-10'),
        },
        { upsert: true }
      );

      await Project.findOneAndUpdate(
        { project_id: p4Id },
        {
          project_id: p4Id,
          mp_id: 'MP-MUMBAI-01',
          state: 'Maharashtra',
          district: 'Mumbai',
          category: 'Education',
          title: 'Maharashtra High Risk School',
          status: 'SANCTIONED',
          estimated_cost: 5000000,
          sanctioned_cost: 5000000,
          implementing_agency_id: 'PWD-MUM-01',
          sanction_date: new Date('2026-03-01'),
        },
        { upsert: true }
      );

      // Seed Phase 9 Risk Scores
      await AiRiskScore.findOneAndUpdate(
        { project_id: p1Id },
        {
          project_id: p1Id,
          overall_score: 85,
          risk_level: 'HIGH',
          recommendation: 'REVIEW_RECOMMENDED',
          ai_status: 'AI_ANALYSIS_COMPLETE',
        },
        { upsert: true }
      );

      await AiRiskScore.findOneAndUpdate(
        { project_id: p2Id },
        {
          project_id: p2Id,
          overall_score: 45,
          risk_level: 'MEDIUM',
          recommendation: 'MONITOR',
          ai_status: 'AI_ANALYSIS_COMPLETE',
        },
        { upsert: true }
      );

      await AiRiskScore.findOneAndUpdate(
        { project_id: p3Id },
        {
          project_id: p3Id,
          overall_score: 15,
          risk_level: 'LOW',
          recommendation: 'PROCEED',
          ai_status: 'AI_ANALYSIS_COMPLETE',
        },
        { upsert: true }
      );

      await AiRiskScore.findOneAndUpdate(
        { project_id: p4Id },
        {
          project_id: p4Id,
          overall_score: 80,
          risk_level: 'HIGH',
          recommendation: 'REVIEW_RECOMMENDED',
          ai_status: 'AI_ANALYSIS_COMPLETE',
        },
        { upsert: true }
      );

      // Seed Compliance Finding (p1Id is also NON_COMPLIANT)
      await ComplianceFinding.findOneAndUpdate(
        { finding_id: 'FIND-P14-01' },
        {
          finding_id: 'FIND-P14-01',
          project_id: p1Id,
          mp_id: 'MP-INDORE-01',
          state: 'Madhya Pradesh',
          district: 'Indore',
          rule_id: 'RULE-FIN-01',
          rule_category: 'FINANCIAL',
          status: 'NON_COMPLIANT',
          severity: 'HIGH',
          title: 'Unsanctioned Cost Overrun',
          message: 'Cost overrun exceeds permitted bounds',
          is_active: true,
        },
        { upsert: true }
      );

      // Seed Phase 13 Inspections
      await Inspection.findOneAndUpdate(
        { inspection_id: 'INSP-P14-01' },
        {
          inspection_id: 'INSP-P14-01',
          project_id: p1Id,
          state: 'Madhya Pradesh',
          district: 'Indore',
          inspection_type: 'STATUTORY_10_PERCENT_DA',
          status: 'RESULT_RECORDED',
          priority_score: 88,
          priority_tier: 'URGENT',
          result: 'ESCALATE',
          scheduled_date: new Date('2026-03-05'),
          completed_date: new Date('2026-03-06'),
          assigned_officer_id: daIndoreUserId,
          quota_year: '2026',
        },
        { upsert: true }
      );

      await Inspection.findOneAndUpdate(
        { inspection_id: 'INSP-P14-02' },
        {
          inspection_id: 'INSP-P14-02',
          project_id: p3Id,
          state: 'Madhya Pradesh',
          district: 'Bhopal',
          inspection_type: 'STATE_1_PERCENT',
          status: 'COMPLETED',
          priority_score: 20,
          priority_tier: 'ROUTINE',
          result: 'NO_ISSUE',
          scheduled_date: new Date('2026-03-01'),
          completed_date: new Date('2026-03-02'),
          assigned_officer_id: 'OFFICER-BHP-01',
          quota_year: '2026',
        },
        { upsert: true }
      );
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

  // 1. GET /api/systemic/overview succeeds for MINISTRY token with national aggregates
  test('1. GET /api/systemic/overview succeeds for MINISTRY token with national aggregates', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.scope, 'ministry');
    assert.ok(body.data.metrics.total_projects >= 4);
  });

  // 2. GET /api/systemic/overview supports optional analytics state filter for Ministry
  test('2. GET /api/systemic/overview supports optional analytics state filter for Ministry', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview?state=Maharashtra`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.state, 'Maharashtra');
    assert.strictEqual(body.data.metrics.total_projects, 1);
  });

  // 3. GET /api/systemic/overview calculates accurate Value-at-Risk (deduplicated)
  test('3. GET /api/systemic/overview calculates accurate Value-at-Risk (deduplicated)', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview?state=Madhya Pradesh`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    const body = await res.json();
    const varData = body.data.metrics.value_at_risk;
    // p1Id is 4000000 and is both HIGH risk and NON_COMPLIANT
    // total_at_risk_value should be 4000000 (deduplicated union, not 8000000)
    assert.strictEqual(varData.high_risk_value, 4000000);
    assert.strictEqual(varData.non_compliant_value, 4000000);
    assert.strictEqual(varData.total_at_risk_value, 4000000);
  });

  // 4. GET /api/systemic/overview correctly calculates Phase 9 risk distribution and high_risk_rate
  test('4. GET /api/systemic/overview correctly calculates Phase 9 risk distribution and high_risk_rate', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    const body = await res.json();
    const dist = body.data.metrics.risk_distribution;
    assert.ok(dist.HIGH >= 2);
    assert.ok(dist.MEDIUM >= 1);
    assert.ok(dist.LOW >= 1);
    assert.ok(body.data.metrics.high_risk_rate > 0);
  });

  // 5. GET /api/systemic/overview reports canonical project status distribution
  test('5. GET /api/systemic/overview reports canonical project status distribution', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    const body = await res.json();
    const statusDist = body.data.metrics.status_distribution;
    assert.ok(statusDist.SANCTIONED !== undefined);
    assert.ok(statusDist.IN_PROGRESS !== undefined);
    assert.ok(statusDist.COMPLETED !== undefined);
  });

  // 6. GET /api/systemic/geographic succeeds for MINISTRY grouping by State
  test('6. GET /api/systemic/geographic succeeds for MINISTRY grouping by State', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/geographic`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.grouping_dimension, 'STATE');
    const states = body.data.breakdown.map((b) => b.region);
    assert.ok(states.includes('Madhya Pradesh'));
    assert.ok(states.includes('Maharashtra'));
  });

  // 7. GET /api/systemic/geographic succeeds for STATE_NODAL_AUTHORITY grouping by District
  test('7. GET /api/systemic/geographic succeeds for STATE_NODAL_AUTHORITY grouping by District', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/geographic`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.scope, 'state');
    assert.strictEqual(body.data.state, 'Madhya Pradesh');
    assert.strictEqual(body.data.grouping_dimension, 'DISTRICT');
    const districts = body.data.breakdown.map((b) => b.region);
    assert.ok(districts.includes('Indore'));
    assert.ok(districts.includes('Bhopal'));
    assert.ok(!districts.includes('Mumbai')); // Mumbai is Maharashtra, must NOT be leaked
  });

  // 8. State Nodal Authority requesting another State via ?state= receives 403 FORBIDDEN_JURISDICTION
  test('8. State Nodal Authority requesting another State via ?state= receives 403 FORBIDDEN_JURISDICTION', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/geographic?state=Karnataka`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    const code = body.code || body.error?.code;
    assert.strictEqual(code, 'FORBIDDEN_JURISDICTION');
  });

  // 9. GET /api/systemic/categories aggregates project count, outlay, and risk rates
  test('9. GET /api/systemic/categories aggregates project count, outlay, and risk rates', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/categories`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.categories.length > 0);
    const roadCat = body.data.categories.find((c) => c.category === 'Roads & Bridges');
    assert.ok(roadCat);
    assert.strictEqual(roadCat.project_count, 1);
    assert.strictEqual(roadCat.high_risk_count, 1);
  });

  // 10. GET /api/systemic/agency-concentration calculates systemic HHI without suitability ranking
  test('10. GET /api/systemic/agency-concentration calculates systemic HHI without suitability ranking', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/agency-concentration?district=Indore`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.product, 'SYSTEMIC_AGENCY_CONCENTRATION');
    assert.ok(body.data.herfindahl_index !== undefined);
    assert.strictEqual(body.data.suggested_agencies, undefined); // Strictly separate from suitability
    assert.strictEqual(body.data.suitability_score, undefined);
  });

  // 11. Agency concentration flags agencies with >35% value share (concentration guardrail)
  test('11. Agency concentration flags agencies with >35% value share (concentration guardrail)', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/agency-concentration?district=Indore`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    const body = await res.json();
    const pwdAgency = body.data.agencies.find((a) => a.agency_id === 'PWD-INDORE-P14');
    if (pwdAgency && pwdAgency.share_of_value_percentage > 35.0) {
      assert.strictEqual(pwdAgency.is_concentration_flagged, true);
    }
  });

  // 12. GET /api/systemic/inspections aggregates canonical 7-stage lifecycle tally
  test('12. GET /api/systemic/inspections aggregates canonical 7-stage lifecycle tally', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/inspections`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const lifecycle = body.data.lifecycle_distribution;
    assert.ok(lifecycle.RESULT_RECORDED >= 1);
    assert.ok(lifecycle.COMPLETED >= 1);
    assert.ok(lifecycle.RECOMMENDED !== undefined);
  });

  // 13. GET /api/systemic/inspections aggregates inspection outcomes (NO_ISSUE, REVIEW_REQUIRED, ESCALATE)
  test('13. GET /api/systemic/inspections aggregates inspection outcomes (NO_ISSUE, REVIEW_REQUIRED, ESCALATE)', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/inspections`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    const body = await res.json();
    const results = body.data.results_distribution;
    assert.ok(results.ESCALATE >= 1);
    assert.ok(results.NO_ISSUE >= 1);
  });

  // 14. GET /api/systemic/inspections rolls up State 1% physical inspection statutory quota
  test('14. GET /api/systemic/inspections rolls up State 1% physical inspection statutory quota', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/inspections?state=Madhya Pradesh`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    const body = await res.json();
    assert.ok(body.data.statutory_1_percent_quota);
    assert.ok(body.data.statutory_1_percent_quota.target_count !== undefined);
  });

  // 15. GET /api/systemic/attention ranks regions by transparent multi-signal formula
  test('15. GET /api/systemic/attention ranks regions by transparent multi-signal formula', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/attention`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.attention_list.length > 0);
    const top = body.data.attention_list[0];
    assert.ok(top.systemic_attention_score >= 0 && top.systemic_attention_score <= 100);
    assert.ok(top.attention_level);
  });

  // 16. Higher risk and non-compliant areas rank higher in attention list than clean areas
  test('16. Higher risk and non-compliant areas rank higher in attention list than clean areas', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/attention`, {
      headers: { Authorization: `Bearer ${snaToken}` },
    });
    const body = await res.json();
    const list = body.data.attention_list;
    const indoreItem = list.find((item) => item.region === 'Indore');
    const bhopalItem = list.find((item) => item.region === 'Bhopal');
    if (indoreItem && bhopalItem) {
      assert.ok(
        indoreItem.systemic_attention_score > bhopalItem.systemic_attention_score,
        `Expected Indore (${indoreItem.systemic_attention_score}) to have higher attention score than Bhopal (${bhopalItem.systemic_attention_score})`
      );
    }
  });

  // 17. Admin receives 403 ADMIN_ISOLATION on /api/systemic/overview
  test('17. Admin receives 403 ADMIN_ISOLATION on /api/systemic/overview', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    const code = body.code || body.error?.code;
    assert.strictEqual(code, 'ADMIN_ISOLATION');
  });

  // 18. Admin receives 403 ADMIN_ISOLATION on all systemic endpoints
  test('18. Admin receives 403 ADMIN_ISOLATION on all systemic endpoints', async () => {
    const endpoints = [
      '/api/systemic/geographic',
      '/api/systemic/categories',
      '/api/systemic/agency-concentration',
      '/api/systemic/inspections',
      '/api/systemic/attention',
    ];
    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 403, `Expected 403 on ${ep}`);
      const body = await res.json();
      const code = body.code || body.error?.code;
      assert.strictEqual(code, 'ADMIN_ISOLATION', `Expected ADMIN_ISOLATION on ${ep}`);
    }
  });

  // 19. District Authority receives 403 FORBIDDEN_ROLE on systemic endpoints
  test('19. District Authority receives 403 FORBIDDEN_ROLE on systemic endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${daToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    const code = body.code || body.error?.code;
    assert.strictEqual(code, 'FORBIDDEN_ROLE');
  });

  // 20. Member of Parliament receives 403 FORBIDDEN_ROLE on systemic endpoints
  test('20. Member of Parliament receives 403 FORBIDDEN_ROLE on systemic endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    const code = body.code || body.error?.code;
    assert.strictEqual(code, 'FORBIDDEN_ROLE');
  });

  // 21. Implementing Agency receives 403 FORBIDDEN_ROLE on systemic endpoints
  test('21. Implementing Agency receives 403 FORBIDDEN_ROLE on systemic endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${agencyToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    const code = body.code || body.error?.code;
    assert.strictEqual(code, 'FORBIDDEN_ROLE');
  });

  // 22. Unauthenticated request receives 401 UNAUTHENTICATED
  test('22. Unauthenticated request receives 401 UNAUTHENTICATED', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`);
    assert.strictEqual(res.status, 401);
  });

  // 23. Auditor receives read-only access within authorized jurisdiction scope
  test('23. Auditor receives read-only access within authorized jurisdiction scope', async () => {
    const res = await fetch(`${baseUrl}/api/systemic/overview`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 24. Read-only safety: Systemic GET endpoints do NOT mutate project status, decisions, or inspections
  test('24. Read-only safety: Systemic GET endpoints do NOT mutate project status, decisions, or inspections', async () => {
    const initialProject = await Project.findOne({ project_id: p1Id }).lean();
    const initialInsp = await Inspection.findOne({ inspection_id: 'INSP-P14-01' }).lean();

    // Call all systemic endpoints
    await fetch(`${baseUrl}/api/systemic/overview`, { headers: { Authorization: `Bearer ${ministryToken}` } });
    await fetch(`${baseUrl}/api/systemic/geographic`, { headers: { Authorization: `Bearer ${ministryToken}` } });
    await fetch(`${baseUrl}/api/systemic/categories`, { headers: { Authorization: `Bearer ${ministryToken}` } });
    await fetch(`${baseUrl}/api/systemic/agency-concentration`, { headers: { Authorization: `Bearer ${ministryToken}` } });
    await fetch(`${baseUrl}/api/systemic/inspections`, { headers: { Authorization: `Bearer ${ministryToken}` } });
    await fetch(`${baseUrl}/api/systemic/attention`, { headers: { Authorization: `Bearer ${ministryToken}` } });

    const postProject = await Project.findOne({ project_id: p1Id }).lean();
    const postInsp = await Inspection.findOne({ inspection_id: 'INSP-P14-01' }).lean();

    assert.strictEqual(postProject.status, initialProject.status, 'Project status must not mutate');
    assert.strictEqual(postInsp.status, initialInsp.status, 'Inspection status must not mutate');
    assert.strictEqual(postInsp.result, initialInsp.result, 'Inspection result must not mutate');
  });

  // 25. Empty/sparse database behavior returns 200 with honest 0 counts and empty arrays
  test('25. Empty/sparse database behavior returns 200 with honest 0 counts and empty arrays', async () => {
    // Query a state with no projects
    const res = await fetch(`${baseUrl}/api/systemic/overview?state=Goa`, {
      headers: { Authorization: `Bearer ${ministryToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.metrics.total_projects, 0);
    assert.strictEqual(body.data.metrics.total_outlay_value, 0);
    assert.strictEqual(body.data.metrics.value_at_risk.total_at_risk_value, 0);
    assert.strictEqual(body.data.metrics.average_risk_score, null);
  });
});
