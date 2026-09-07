/**
 * Automated tests for Health Check & Centralized Error Handling
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../../backend-node/src/app');

describe('Backend Foundation & Health Check Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server?.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('GET /api/health returns 200 OK with standardized envelope', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.data, 'object');
    assert.equal(body.data.status, 'OK');
    assert.equal(body.data.platform, 'MPLADS AI Risk Monitoring & Decision Support Platform');
    assert.equal(body.data.version, '1.0.0');
    assert.equal(body.data.phase, 'Phase 1 - Foundation & Portal Shell');
    assert.ok(['connected', 'disconnected', 'connecting'].includes(body.data.database));
    assert.ok(typeof body.data.uptimeSeconds === 'number');
    assert.ok(body.data.timestamp);
  });

  test('GET /api/non-existent returns 404 with standardized error envelope', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error);
    assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(body.error.message.includes('does not exist'));
  });

  test('POST with invalid JSON body returns 400 with safe error message', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json: true, ',
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error);
    assert.equal(body.error.code, 'INVALID_JSON');
    // Ensure no stack traces or server paths leak
    assert.equal(body.error.stack, undefined);
  });

  test('Responses include X-Request-Id header for observability', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const requestId = res.headers.get('x-request-id');
    assert.ok(requestId, 'Expected X-Request-Id header in response');
    assert.ok(requestId.length > 5);
  });
});

