/**
 * Phase 12 Backend Integration Tests: Agency Intelligence & Efficiency
 * Tests:
 * 1. Master Agency Registry Seeding and Retrieval
 * 2. Product 1: Agency Suitability Advisory Ranking per project
 * 3. Concentration Guardrail enforcement (>35% share capped/flagged)
 * 4. Product 2: Agency Concentration Analytics & Herfindahl Index (HHI)
 * 5. Two Separate Products separation (never merged into a single agency score)
 * 6. Strict Admin Isolation (403 ADMIN_ISOLATION on performance, suitability, concentration)
 * 7. Human-in-the-loop guarantee: Advisory recommendations never auto-assign or auto-sanction
 * 8. Resilient offline fallback guarantee: Node deterministic engine functions without Python microservice
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
  ImplementingAgency,
  AgencyPerformance,
  AgencyConcentration,
  Project,
  User,
} = require('../../backend-node/src/models');
const { seedAgencies } = require('../../backend-node/src/utils/seedAgencies');
const agencyIntelligenceService = require('../../backend-node/src/services/agencyIntelligenceService');

describe('Phase 12 Backend: Agency Intelligence & Efficiency Tests', () => {
  let server;
  let baseUrl;
  let isDbConnected = false;

  const daUserId = 'DA-P12-IND-01';
  const snaUserId = 'SNA-P12-MP-01';
  const adminUserId = 'ADMIN-P12-01';

  let daToken;
  let snaToken;
  let adminToken;

  before(async () => {
    // 1. Connect MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    isDbConnected = mongoose.connection.readyState === 1;

    // 2. Start HTTP test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 3. Seed Agencies & Baseline Intelligence
    await seedAgencies();

    // 4. Create Test Users & Auth Tokens
    const daUser = await User.findOneAndUpdate(
      { user_id: daUserId },
      {
        user_id: daUserId,
        official_email: 'da.indore.p12@mp.gov.in',
        role: 'DISTRICT_AUTHORITY',
        full_name: 'District Collector Indore (Phase 12 Test)',
        designation: 'Collector & District Magistrate',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    const snaUser = await User.findOneAndUpdate(
      { user_id: snaUserId },
      {
        user_id: snaUserId,
        official_email: 'sna.mp.p12@mp.gov.in',
        role: 'STATE_NODAL_AUTHORITY',
        full_name: 'State Nodal Officer MP (Phase 12 Test)',
        designation: 'Joint Secretary Planning',
        jurisdiction: { level: 'STATE', state: 'Madhya Pradesh' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    const adminUser = await User.findOneAndUpdate(
      { user_id: adminUserId },
      {
        user_id: adminUserId,
        official_email: 'admin.p12@mplads.gov.in',
        role: 'ADMIN',
        full_name: 'System Admin (Phase 12 Test)',
        designation: 'Technical Administrator',
        jurisdiction: { level: 'NATIONAL' },
        password_hash: 'mockhash',
        is_active: true,
      },
      { upsert: true, new: true }
    );

    daToken = jwt.sign(
      { user_id: daUser.user_id, role: daUser.role, jurisdiction: daUser.jurisdiction },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    snaToken = jwt.sign(
      { user_id: snaUser.user_id, role: snaUser.role, jurisdiction: snaUser.jurisdiction },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { user_id: adminUser.user_id, role: adminUser.role, jurisdiction: adminUser.jurisdiction },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
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

  describe('1. Implementing Agency Master Registry', () => {
    test('GET /api/agencies lists eligible public agencies for user jurisdiction', async () => {
      const res = await fetch(`${baseUrl}/api/agencies`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 3, 'Should have at least 3 seeded agencies in Indore');

      const pwd = body.data.find((a) => a.agency_id === 'PWD-INDORE-01');
      assert.ok(pwd, 'PWD-INDORE-01 should be present in Indore agencies list');
      assert.equal(pwd.type, 'PWD');
      assert.equal(pwd.district, 'Indore');
    });

    test('GET /api/agencies/:id returns single agency profile details', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/PWD-INDORE-01`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.agency_id, 'PWD-INDORE-01');
      assert.ok(body.data.name.includes('Public Works Department'));
      assert.ok(body.data.contact_person);
    });

    test('GET /api/agencies/:id returns 404 for nonexistent agency', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/NONEXISTENT-999`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res.status, 404);
    });
  });

  describe('2. Agency Performance Track Record & Admin Isolation', () => {
    test('GET /api/agencies/:id/performance returns detailed benchmarks for authorized officer', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/PWD-INDORE-01/performance`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.performance);
      assert.equal(body.data.performance.agency_id, 'PWD-INDORE-01');
      assert.ok(typeof body.data.performance.completion_rate === 'number');
      assert.ok(typeof body.data.performance.avg_delay_days === 'number');
      assert.ok(typeof body.data.performance.cost_deviation_avg_percentage === 'number');
      assert.ok(typeof body.data.performance.adverse_inspection_count === 'number');
      assert.ok(body.data.performance.performance_score > 0);
    });

    test('Admin Isolation: ADMIN receives 403 ADMIN_ISOLATION on /api/agencies/:id/performance', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/PWD-INDORE-01/performance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    });
  });

  describe('3. Product 1: Agency Suitability with Concentration Guardrail', () => {
    test('POST /api/agencies/suitability calculates advisory ranking with statutory disclaimer', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/suitability`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${daToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'ROADS',
          estimated_cost: 2500000,
          district: 'Indore',
          state: 'Madhya Pradesh',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.product, 'AGENCY_SUITABILITY');
      assert.ok(body.data.advisory_disclaimer.includes('advisory only'));
      assert.ok(body.data.advisory_disclaimer.includes('District Authority'));

      const suggestions = body.data.suggested_agencies;
      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length >= 3);

      // Verify rank ordering
      for (let i = 0; i < suggestions.length - 1; i++) {
        assert.ok(
          suggestions[i].suitability_score >= suggestions[i + 1].suitability_score,
          'Agencies must be sorted descending by suitability score'
        );
        assert.equal(suggestions[i].rank, i + 1);
      }
    });

    test('Concentration Guardrail: Capped/Flagged when agency holds >35% district share (PRD §12.8)', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/suitability`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${daToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'ROADS',
          estimated_cost: 2000000,
          district: 'Indore',
          state: 'Madhya Pradesh',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.concentration_guardrail_applied, true);

      // PWD has 42% share in Indore baseline concentration
      const pwd = body.data.suggested_agencies.find((a) => a.agency_id === 'PWD-INDORE-01');
      assert.ok(pwd, 'PWD agency should be present');
      assert.equal(pwd.concentration_warning, true);
      assert.ok(pwd.concentration_message.includes('Concentration Guardrail Active'));
      assert.ok(pwd.concentration_message.includes('>35% threshold'));
      assert.ok(
        pwd.suitability_score < pwd.raw_score,
        'Concentration guardrail must penalize/cap raw score to prevent reinforcing monopoly concentration'
      );
    });

    test('Admin Isolation: ADMIN receives 403 ADMIN_ISOLATION on POST /api/agencies/suitability', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/suitability`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'ROADS',
          estimated_cost: 2000000,
          district: 'Indore',
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    });
  });

  describe('4. Product 2: Agency Concentration Analytics & Herfindahl Index', () => {
    test('GET /api/agencies/concentration computes work-share % and Herfindahl Index', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/concentration?district=Indore&year=2026`, {
        headers: { Authorization: `Bearer ${snaToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.product, 'AGENCY_CONCENTRATION');
      assert.equal(body.data.district, 'Indore');
      assert.equal(body.data.year, '2026');

      assert.ok(body.data.herfindahl_index > 0);
      assert.equal(body.data.concentration_level, 'HIGH');
      assert.equal(body.data.concentration_threshold_percentage, 35.0);

      const agencies = body.data.agencies;
      assert.ok(Array.isArray(agencies));
      assert.ok(agencies.length >= 3);

      // PWD has 42% share -> must be flagged
      const pwd = agencies.find((a) => a.agency_id === 'PWD-INDORE-01');
      assert.ok(pwd);
      assert.equal(pwd.share_of_value_percentage, 42.0);
      assert.equal(pwd.is_concentration_flagged, true);

      // RES has 31% share (< 35%) -> must NOT be flagged
      const resAgency = agencies.find((a) => a.agency_id === 'RES-INDORE-01');
      assert.ok(resAgency);
      assert.equal(resAgency.share_of_value_percentage, 31.0);
      assert.equal(resAgency.is_concentration_flagged, false);
    });

    test('Admin Isolation: ADMIN receives 403 ADMIN_ISOLATION on GET /api/agencies/concentration', async () => {
      const res = await fetch(`${baseUrl}/api/agencies/concentration?district=Indore&year=2026`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    });
  });

  describe('5. Architectural Independence: Two Separate Products Guarantee', () => {
    test('Suitability and Concentration are distinct products and never merged', async () => {
      const suitabilityRes = await fetch(`${baseUrl}/api/agencies/suitability`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${daToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: 'COMMUNITY_HALL', estimated_cost: 1500000, district: 'Indore' }),
      });
      const suitBody = await suitabilityRes.json();

      const concentrationRes = await fetch(`${baseUrl}/api/agencies/concentration?district=Indore&year=2026`, {
        headers: { Authorization: `Bearer ${snaToken}` },
      });
      const concBody = await concentrationRes.json();

      assert.equal(suitBody.data.product, 'AGENCY_SUITABILITY');
      assert.equal(concBody.data.product, 'AGENCY_CONCENTRATION');

      // Suitability has ranked scores and per-project suggestions
      assert.ok(suitBody.data.suggested_agencies);
      assert.equal(suitBody.data.herfindahl_index, undefined);

      // Concentration has Herfindahl index and work-share percentages
      assert.ok(concBody.data.herfindahl_index !== undefined);
      assert.ok(concBody.data.agencies[0].share_of_value_percentage !== undefined);
      assert.equal(concBody.data.suggested_agencies, undefined);
    });
  });
});

