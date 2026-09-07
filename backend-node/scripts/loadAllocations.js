/**
 * CLI Script to execute real MP allocation data load
 * Usage: node scripts/loadAllocations.js
 */
const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDB, closeDB } = require('../src/config/db');
const { loadMpAllocation } = require('../src/utils/loadMpAllocation');
const logger = require('../src/utils/logger');

async function main() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB. Initiating real MP allocation ingestion...');

    const result = await loadMpAllocation();
    logger.info('Allocation load completed successfully', result);

    await closeDB();
    process.exit(0);
  } catch (err) {
    logger.error('Failed to load MP allocations', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();

