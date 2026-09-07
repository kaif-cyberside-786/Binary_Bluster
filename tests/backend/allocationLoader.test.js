/**
 * Automated Tests for Real MP Allocation Ingestion & API
 * Verifies loadMpAllocation utility, idempotency, and /api/allocations endpoints
 */
process.env.NODE_ENV = 'test';
const path = require('path');
// Ensure test files can resolve modules from backend-node/node_modules
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const config = require('../../backend-node/src/config/env');
const app = require('../../backend-node/src/app');
const { MpAllocation } = require('../../backend-node/src/models/MpAllocation');
const { loadMpAllocation } = require('../../backend-node/src/utils/loadMpAllocation');

describe('MP Allocation Ingestion & API Verification Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Start ephemeral test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server?.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  test('loadMpAllocation ingests real CSV data with is_real_government_data flag', async () => {
    const result = await loadMpAllocation();

    assert.ok(result.totalRows >= 540);
    assert.equal(result.loaded, 542);
    assert.equal(result.skipped, 1); // Row 108 with missing amount

    // Verify count in database
    const count = await MpAllocation.countDocuments({ is_real_government_data: true });
    assert.equal(count, 542);

    // Verify a sample ingested record has accurate fields
    const sample = await MpAllocation.findOne({ constituency: 'HINGOLI' });
    assert.ok(sample);
    assert.equal(sample.state, 'Maharashtra');
    assert.equal(sample.is_real_government_data, true);
    assert.equal(sample.is_synthetic, false);
    assert.ok(sample.allocated_amount > 0);
  });

  test('loadMpAllocation is strictly idempotent upon re-execution', async () => {
    // Running second time
    const result = await loadMpAllocation();
    assert.equal(result.loaded, 542);
    assert.equal(result.upsertedCount, 0, 'No new documents should be created on re-run');

    const count = await MpAllocation.countDocuments({ is_real_government_data: true });
    assert.equal(count, 542, 'Total count must remain exactly 542');
  });

  test('GET /api/allocations returns paginated real allocation records', async () => {
    const res = await fetch(`${baseUrl}/api/allocations?limit=10&page=1`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.allocations));
    assert.equal(body.data.allocations.length, 10);
    assert.equal(body.data.pagination.total, 542);
    assert.equal(body.data.pagination.limit, 10);
    assert.equal(body.data.pagination.page, 1);
    assert.ok(body.data.pagination.totalPages >= 54);

    // Verify provenance flag
    for (const alloc of body.data.allocations) {
      assert.equal(alloc.is_real_government_data, true);
    }
  });

  test('GET /api/allocations supports search filtering by constituency', async () => {
    const res = await fetch(`${baseUrl}/api/allocations?search=BHOPAL`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.allocations.length >= 1);
    assert.ok(body.data.allocations.some((a) => a.constituency === 'BHOPAL'));
  });

  test('GET /api/allocations/:mpId returns single record or 404', async () => {
    const sample = await MpAllocation.findOne();
    assert.ok(sample);

    // 1. Success case
    const res = await fetch(`${baseUrl}/api/allocations/${sample.mp_id}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.mp_id, sample.mp_id);
    assert.equal(body.data.mp_name, sample.mp_name);

    // 2. 404 case
    const notFoundRes = await fetch(`${baseUrl}/api/allocations/NON-EXISTENT-MP-ID`);
    assert.equal(notFoundRes.status, 404);
    const notFoundBody = await notFoundRes.json();
    assert.equal(notFoundBody.success, false);
    assert.equal(notFoundBody.error.code, 'ALLOCATION_NOT_FOUND');
  });
});

