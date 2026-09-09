/**
 * One-off script to set one shared password for all users in MongoDB.
 * Preserves user_id, roles, jurisdictions, emails.
 * Shared password: Demo@12345 (bcrypt cost factor 12)
 *
 * Usage:
 *   node backend-node/scripts/set-all-passwords.js
 */
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');
const { connectDB, closeDB } = require('../src/config/db');
const { User } = require('../src/models/User');
const logger = require('../src/utils/logger');

const SHARED_PASSWORD = 'Demo@12345';
const BCRYPT_ROUNDS = 12;

async function setAllPasswords() {
  try {
    console.log('Connecting to MongoDB via configured MONGODB_URI...');
    await connectDB();
    console.log('Connected to MongoDB.');

    console.log(`Generating bcrypt hash for shared demo password (cost factor: ${BCRYPT_ROUNDS})...`);
    const password_hash = await bcrypt.hash(SHARED_PASSWORD, BCRYPT_ROUNDS);

    console.log('Updating all user records in the users collection...');
    const updateResult = await User.updateMany(
      {},
      {
        $set: {
          password_hash,
          failed_login_attempts: 0,
          lockout_until: null,
          is_active: true,
        },
      }
    );

    console.log(`Updated ${updateResult.modifiedCount} user record(s) in MongoDB.`);

    // Retrieve and display list of all users with user_id and role (no hashes in log)
    const users = await User.find({}, 'user_id role official_email full_name is_active')
      .sort({ user_id: 1 })
      .lean();

    console.log('\n--- Synchronized User Accounts ---');
    console.log(`Total users in database: ${users.length}`);
    console.table(
      users.map((u) => ({
        user_id: u.user_id,
        role: u.role,
        full_name: u.full_name,
        official_email: u.official_email,
        active: u.is_active,
      }))
    );
    console.log('All accounts have been set to shared password: Demo@12345 (lockouts cleared).\n');

    await closeDB();
    console.log('Disconnected cleanly from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to set all passwords:', err.message);
    try {
      await closeDB();
    } catch (_) {}
    process.exit(1);
  }
}

setAllPasswords();

