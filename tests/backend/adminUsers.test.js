/**
 * Automated tests for Admin User Management API & RBAC
 * Verifies design.md §5.32 & rules.md §10
 */
process.env.NODE_ENV = 'test';
const path = require('path');
// Ensure test files in tests/ can resolve modules from backend-node/node_modules
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const { User } = require('../../backend-node/src/models/User');

describe('Admin User Management & RBAC Tests', () => {
  let server;
  let baseUrl;

  const adminId = 'USR-TEST-ADMIN-01';
  const officerId = 'USR-TEST-OFFICER-01';
  let adminToken;
  let officerToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test accounts
    await User.deleteMany({
      user_id: { $in: [adminId, officerId, 'USR-NEW-CREATED-01'] },
    });

    const hash = await bcrypt.hash('TestPassword@123', 12);

    // Create Admin User
    await User.create({
      user_id: adminId,
      official_email: 'admin.test@gov.in',
      password_hash: hash,
      full_name: 'System Admin Tester',
      role: 'ADMIN',
      designation: 'Admin',
      jurisdiction: { level: 'NATIONAL' },
      is_active: true,
    });

    // Create Standard Officer User (MP)
    await User.create({
      user_id: officerId,
      official_email: 'officer.test@gov.in',
      password_hash: hash,
      full_name: 'MP Officer Tester',
      role: 'MP',
      designation: 'MP',
      jurisdiction: {
        level: 'CONSTITUENCY',
        state: 'Madhya Pradesh',
        constituency: 'Indore',
      },
      is_active: true,
    });

    // Generate JWTs
    adminToken = jwt.sign(
      { user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    officerToken = jwt.sign(
      { user_id: officerId, role: 'MP', jurisdiction: { level: 'CONSTITUENCY' } },
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
    await User.deleteMany({
      user_id: { $in: [adminId, officerId, 'USR-NEW-CREATED-01'] },
    });
    if (server?.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  test('Non-ADMIN user calling /api/admin/users receives 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN_ROLE');
  });

  test('Unauthenticated request to /api/admin/users receives 401 Unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(res.status, 401);
  });

  test('ADMIN user can retrieve paginated user registry', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.users));
    assert.ok(body.data.pagination);
    assert.ok(body.data.users.length >= 2);

    // Verify security: password_hash must never be returned
    for (const u of body.data.users) {
      assert.equal(u.password_hash, undefined);
    }
  });

  test('ADMIN user can create a new user with valid schema', async () => {
    const newUserPayload = {
      user_id: 'USR-NEW-CREATED-01',
      official_email: 'new.collector@mp.gov.in',
      password: 'InitialPassword@123',
      full_name: 'New District Collector',
      role: 'DISTRICT_AUTHORITY',
      designation: 'District Magistrate',
      phone: '9876543220',
      jurisdiction: {
        level: 'DISTRICT',
        state: 'Madhya Pradesh',
        district: 'Indore',
      },
    };

    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newUserPayload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user_id, 'USR-NEW-CREATED-01');
    assert.equal(body.data.password_hash, undefined);

    // Verify created user exists in database with hashed password
    const dbUser = await User.findOne({ user_id: 'USR-NEW-CREATED-01' });
    assert.ok(dbUser);
    assert.notEqual(dbUser.password_hash, 'InitialPassword@123');
    const matches = await bcrypt.compare('InitialPassword@123', dbUser.password_hash);
    assert.equal(matches, true);
  });

  test('ADMIN user can update and deactivate user account', async () => {
    // 1. Deactivate account
    const deactRes = await fetch(`${baseUrl}/api/admin/users/USR-NEW-CREATED-01/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ is_active: false }),
    });

    assert.equal(deactRes.status, 200);
    const deactBody = await deactRes.json();
    assert.equal(deactBody.data.is_active, false);

    // 2. Attempt login as deactivated user — should be rejected with 403
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'USR-NEW-CREATED-01',
        password: 'InitialPassword@123',
        captchaToken: 'bypass',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });

    assert.equal(loginRes.status, 403);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.error.code, 'ACCOUNT_DEACTIVATED');
  });
});
