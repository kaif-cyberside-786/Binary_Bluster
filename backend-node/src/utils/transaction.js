/**
 * Multi-Document MongoDB Transaction Helper
 * Implements atomic transactional execution across collections per architecture.md §11 & rules.md §7
 * Gracefully detects standalone MongoDB instances (without replica sets) in dev/test environments.
 */
const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Executes an operation inside a MongoDB transaction
 * @param {Function} operation Callback receiving `(session)`
 * @returns {Promise<any>} Result of the operation
 */
async function withTransaction(operation) {
  let session = null;

  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn('Could not start MongoDB session, executing without transaction session', {
      error: err.message,
    });
    return operation(null);
  }

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    // Check if error is due to standalone MongoDB lacking replica set support
    if (
      err.message &&
      (err.message.includes('replica set') ||
        err.message.includes('Transaction numbers are only allowed'))
    ) {
      logger.warn(
        'MongoDB instance does not support transactions (standalone mode). Executing non-transactional fallback.',
        { error: err.message }
      );
      // Execute without transaction session
      return operation(null);
    }

    // Real transactional rollback
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  withTransaction,
};

