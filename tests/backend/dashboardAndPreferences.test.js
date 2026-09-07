/**
 * Automated tests for Role Dashboards & User Preferences APIs
 * Verifies rules.md §10 (Admin Isolation), §17 (Derived MP Attention), and memory.md
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
  UserPreference,
  MpAllocation,
} = require('../../backend-node/src/models');

describe('Dashboard Aggregations & User Preferences Tests', () => {
  let server;
  let baseUrl;

  const mpId = 'MP-DASH-TEST-01';
  const daId = 'DA-DASH-TEST-01';
  const adminId = 'ADMIN-DASH-TEST-01';

  let mpToken;
  let daToken;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up
    await User.deleteMany({ user_id: { $in: [mpId, daId, adminId] } });
    await UserPreference.deleteMany({ user_id: { $in: [mpId, daId, adminId] } });

    const hash = await bcrypt.hash('TestPass@123', 12);

    await User.create({
      user_id: mpId,
      official_email: 'mp.dash@test.gov.in',
      password_hash: hash,
      full_name: 'MP Dashboard Tester',
      role: 'MP',
      designation: 'MP',
      jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', constituency: 'Indore' },
      is_active: true,
    });

    await User.create({
      user_id: daId,
      official_email: 'da.dash@test.gov.in',
      password_hash: hash,
      full_name: 'DA Dashboard Tester',
      role: 'DISTRICT_AUTHORITY',
      designation: 'Collector',
      jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
      is_active: true,
    });

    await User.create({
      user_id: adminId,
      official_email: 'admin.dash@test.gov.in',
      password_hash: hash,
      full_name: 'Admin Dashboard Tester',
      role: 'ADMIN',
      designation: 'System Administrator',
      jurisdiction: { level: 'NATIONAL' },
      is_active: true,
    });

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

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await User.deleteMany({ user_id: { $in: [mpId, daId, adminId] } });
    await UserPreference.deleteMany({ user_id: { $in: [mpId, daId, adminId] } });
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

  test('GET /api/dashboard/mp returns real allocation and derived attention safely', async () => {
    const res = await request('/api/dashboard/mp', {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.mp_info);
    assert.ok(res.body.data.counts);
    assert.ok(res.body.data.financial);
    assert.ok(res.body.data.derived_attention);
    // Derived attention should be a valid object with count >= 0
    assert.equal(typeof res.body.data.derived_attention.attention_count, 'number');
    assert.ok(Array.isArray(res.body.data.derived_attention.items));
  });

  test('GET /api/dashboard/district returns pending queue and inspection metrics', async () => {
    const res = await request('/api/dashboard/district', {
      headers: { Authorization: `Bearer ${daToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.district_info);
    assert.equal(res.body.data.district_info.district, 'Indore');
    assert.ok(res.body.data.counts);
    assert.ok(res.body.data.inspections);
    assert.ok(Array.isArray(res.body.data.pending_queue));
  });

  test('Admin Isolation: GET /api/dashboard/admin contains ONLY telemetry and user counts', async () => {
    const res = await request('/api/dashboard/admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.telemetry);
    assert.ok(res.body.data.users);

    // Strictly verify absence of project business, risk scores, or decisions
    assert.equal(res.body.data.projects, undefined);
    assert.equal(res.body.data.risk_scores, undefined);
    assert.equal(res.body.data.decisions, undefined);
    assert.equal(res.body.data.audit_logs, undefined);
  });

  test('User Preferences: GET returns defaults if uninitialized', async () => {
    const res = await request('/api/user/preferences', {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sidebar_collapsed, false);
    assert.equal(res.body.data.table_page_size, 10);
  });

  test('User Preferences: PATCH persists settings for authenticated user', async () => {
    const res = await request('/api/user/preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify({
        sidebar_collapsed: true,
        table_page_size: 25,
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sidebar_collapsed, true);
    assert.equal(res.body.data.table_page_size, 25);

    // Verify GET reflects the updated preferences
    const resGet = await request('/api/user/preferences', {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    assert.equal(resGet.body.data.sidebar_collapsed, true);
    assert.equal(resGet.body.data.table_page_size, 25);
  });

  test('User Preferences Isolation: Different user retains distinct preferences', async () => {
    const res = await request('/api/user/preferences', {
      headers: { Authorization: `Bearer ${daToken}` },
    });

    assert.equal(res.status, 200);
    // daToken user should have default preferences (not mpToken's modified preferences)
    assert.equal(res.body.data.sidebar_collapsed, false);
    assert.equal(res.body.data.table_page_size, 10);
  });
});

