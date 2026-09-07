/**
 * Automated tests for User Schema Validation Rules (Phase 1)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { User, ROLES } = require('../../backend-node/src/models/User');

describe('User Model Schema Validation Tests', () => {
  // A valid bcrypt hash of length 60 for testing schema validation
  const dummyBcryptHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12';

  test('Valid user passes schema validation', async () => {
    const validUser = new User({
      user_id: 'USR-DIST-001',
      official_email: 'collector.indore@gov.in',
      password_hash: dummyBcryptHash,
      full_name: 'District Collector Indore',
      role: 'DISTRICT_AUTHORITY',
      designation: 'District Magistrate',
      phone: '9876543210',
      jurisdiction: {
        level: 'DISTRICT',
        state: 'Madhya Pradesh',
        district: 'Indore',
      },
    });

    const error = validUser.validateSync();
    assert.equal(error, undefined, 'Valid user should not produce validation errors');
  });

  test('Missing required fields produce validation errors', async () => {
    const emptyUser = new User({});
    const error = emptyUser.validateSync();

    assert.ok(error, 'Expected validation error for missing fields');
    assert.ok(error.errors['user_id'], 'user_id should be required');
    assert.ok(error.errors['official_email'], 'official_email should be required');
    assert.ok(error.errors['password_hash'], 'password_hash should be required');
    assert.ok(error.errors['full_name'], 'full_name should be required');
    assert.ok(error.errors['role'], 'role should be required');
    assert.ok(error.errors['jurisdiction'], 'jurisdiction should be required');
  });

  test('Invalid role is rejected by schema', async () => {
    const user = new User({
      user_id: 'USR-TEST-001',
      official_email: 'test@gov.in',
      password_hash: dummyBcryptHash,
      full_name: 'Test Officer',
      role: 'SUPER_USER', // Invalid role
      jurisdiction: { level: 'NATIONAL' },
    });

    const error = user.validateSync();
    assert.ok(error);
    assert.ok(error.errors['role']);
    assert.ok(error.errors['role'].message.includes('not a valid role'));
  });

  test('All 7 canonical roles are accepted', async () => {
    for (const role of ROLES) {
      const user = new User({
        user_id: `USR-${role}-001`,
        official_email: `${role.toLowerCase()}@gov.in`,
        password_hash: dummyBcryptHash,
        full_name: `${role} Officer`,
        role: role,
        jurisdiction: { level: 'NATIONAL' },
      });

      const error = user.validateSync();
      assert.equal(
        error?.errors?.['role'],
        undefined,
        `Role ${role} should be accepted by schema validation`
      );
    }
  });

  test('Invalid user_id pattern is rejected', async () => {
    const user = new User({
      user_id: 'invalid id with spaces!',
      official_email: 'test@gov.in',
      password_hash: dummyBcryptHash,
      full_name: 'Test Officer',
      role: 'ADMIN',
      jurisdiction: { level: 'NATIONAL' },
    });

    const error = user.validateSync();
    assert.ok(error);
    assert.ok(error.errors['user_id']);
  });

  test('Invalid official_email format is rejected', async () => {
    const user = new User({
      user_id: 'USR-ADMIN-001',
      official_email: 'not-an-email',
      password_hash: dummyBcryptHash,
      full_name: 'Admin Officer',
      role: 'ADMIN',
      jurisdiction: { level: 'NATIONAL' },
    });

    const error = user.validateSync();
    assert.ok(error);
    assert.ok(error.errors['official_email']);
  });

  test('Jurisdiction validation enforces required fields per level', async () => {
    // DISTRICT requires state and district
    const districtUserMissing = new User({
      user_id: 'USR-DA-002',
      official_email: 'da@gov.in',
      password_hash: dummyBcryptHash,
      full_name: 'DA Officer',
      role: 'DISTRICT_AUTHORITY',
      jurisdiction: {
        level: 'DISTRICT',
        // missing district and state
      },
    });

    const districtError = districtUserMissing.validateSync();
    assert.ok(districtError);
    assert.ok(districtError.errors['jurisdiction.district']);
    assert.ok(districtError.errors['jurisdiction.state']);

    // AGENCY requires agency_id
    const agencyUserMissing = new User({
      user_id: 'USR-AG-001',
      official_email: 'agency@gov.in',
      password_hash: dummyBcryptHash,
      full_name: 'Agency Engineer',
      role: 'IMPLEMENTING_AGENCY',
      jurisdiction: {
        level: 'AGENCY',
        // missing agency_id
      },
    });

    const agencyError = agencyUserMissing.validateSync();
    assert.ok(agencyError);
    assert.ok(agencyError.errors['jurisdiction.agency_id']);
  });
});

