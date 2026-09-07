/**
 * Automated tests for Authentication, CAPTCHA, Lockout & Password Reset
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
const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const { User } = require('../../backend-node/src/models/User');

describe('Authentication & Session Security Tests', () => {
  let server;
  let baseUrl;
  const testUserId = 'USR-TEST-AUTH-01';
  const testEmail = 'auth.test@gov.in';
  const testPassword = 'SecurePassword@123';

  before(async () => {
    // Connect DB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test user
    await User.deleteMany({
      $or: [{ user_id: testUserId }, { official_email: testEmail }],
    });

    // Create a fresh test user
    const password_hash = await bcrypt.hash(testPassword, 12);
    await User.create({
      user_id: testUserId,
      official_email: testEmail,
      password_hash,
      full_name: 'Auth Test Officer',
      role: 'DISTRICT_AUTHORITY',
      designation: 'Collector',
      phone: '9876543210',
      jurisdiction: {
        level: 'DISTRICT',
        state: 'Madhya Pradesh',
        district: 'Indore',
      },
      is_active: true,
      failed_login_attempts: 0,
      lockout_until: null,
    });

    // Start ephemeral server
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
      $or: [{ user_id: testUserId }, { official_email: testEmail }],
    });
    if (server?.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  test('GET /api/auth/captcha issues SVG and signed token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/captcha`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.captchaToken, 'Expected captchaToken in response');
    assert.ok(body.data.captchaSvg, 'Expected captchaSvg in response');
    assert.ok(body.data.captchaSvg.includes('<svg'));
  });

  test('POST /api/auth/login rejects invalid CAPTCHA', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: testPassword,
        captchaToken: 'fake.token',
        captchaAnswer: 'WRONG',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CAPTCHA');
  });

  test('POST /api/auth/login succeeds with valid credentials (test bypass)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: testPassword,
        captchaToken: 'bypass_token',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken, 'Expected accessToken');
    assert.ok(body.data.refreshToken, 'Expected refreshToken');
    assert.equal(body.data.user.user_id, testUserId);
    assert.equal(body.data.user.role, 'DISTRICT_AUTHORITY');
    assert.equal(body.data.user.password_hash, undefined, 'password_hash must be excluded');
  });

  test('POST /api/auth/login fails with incorrect password and increments attempts', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: 'WrongPassword@999',
        captchaToken: 'bypass_token',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');

    const updatedUser = await User.findOne({ user_id: testUserId });
    assert.equal(updatedUser.failed_login_attempts, 1);
  });

  test('Account lockout is enforced after reaching max failed attempts', async () => {
    // Force user to 4 failed attempts
    await User.updateOne(
      { user_id: testUserId },
      { $set: { failed_login_attempts: config.lockoutMaxAttempts - 1 } }
    );

    // 5th failed attempt should trigger lockout
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: 'WrongPassword@999',
        captchaToken: 'bypass_token',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });

    assert.equal(res.status, 423); // 423 Locked
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'ACCOUNT_LOCKED');

    const lockedUser = await User.findOne({ user_id: testUserId });
    assert.ok(lockedUser.lockout_until);
    assert.ok(lockedUser.lockout_until > new Date());

    // Subsequent attempt while locked also returns 423
    const retryRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: testPassword,
        captchaToken: 'bypass_token',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });

    assert.equal(retryRes.status, 423);

    // Reset lockout for further tests
    await User.updateOne(
      { user_id: testUserId },
      { $set: { failed_login_attempts: 0, lockout_until: null } }
    );
  });

  test('GET /api/auth/me rejects unauthenticated request and accepts valid JWT', async () => {
    // 1. Without token
    const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(unauthRes.status, 401);

    // 2. Login to get token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail, // Test email login
        password: testPassword,
        captchaToken: 'bypass_token',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    // 3. With token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.success, true);
    assert.equal(meData.data.user.user_id, testUserId);
    assert.equal(meData.data.user.official_email, testEmail);
  });

  test('Password reset flow (forgot-password -> reset-password)', async () => {
    // 1. Request reset
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotData = await forgotRes.json();
    const resetToken = forgotData.data.testResetToken;
    assert.ok(resetToken, 'Expected testResetToken in test environment');

    // 2. Perform reset
    const newPassword = 'NewlyResetPassword@2026';
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    });
    assert.equal(resetRes.status, 200);

    // 3. Verify login works with new password
    const verifyLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUserId,
        password: newPassword,
        captchaToken: 'bypass',
        captchaAnswer: 'TEST_BYPASS',
      }),
    });
    assert.equal(verifyLogin.status, 200);
  });
});
