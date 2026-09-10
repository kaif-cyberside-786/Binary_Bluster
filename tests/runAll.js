/**
 * Unified Test Runner for Backend and Frontend Tests
 * Runs all suites cleanly and reports results using spec reporter
 */
process.env.NODE_ENV = 'test';
const path = require('path');
// Ensure modules from backend-node/node_modules are resolvable
module.paths.push(path.resolve(__dirname, '../backend-node/node_modules'));

const { spawnSync } = require('child_process');

const testFiles = [
  path.resolve(__dirname, 'backend/health.test.js'),
  path.resolve(__dirname, 'backend/auth.test.js'),
  path.resolve(__dirname, 'backend/adminUsers.test.js'),
  path.resolve(__dirname, 'backend/domainModels.test.js'),
  path.resolve(__dirname, 'backend/allocationLoader.test.js'),
  path.resolve(__dirname, 'backend/projectLifecycle.test.js'),
  path.resolve(__dirname, 'backend/dashboardAndPreferences.test.js'),
  path.resolve(__dirname, 'backend/projectManagementPhase5.test.js'),
  path.resolve(__dirname, 'backend/complianceRules.test.js'),
  path.resolve(__dirname, 'backend/internalServiceAndAutomation.test.js'),
  path.resolve(__dirname, 'backend/aiHistoricalIntelligence.test.js'),
  path.resolve(__dirname, 'backend/riskEnginePhase9.test.js'),
  path.resolve(__dirname, 'backend/districtReviewDecisionPhase10.test.js'),
  path.resolve(__dirname, 'backend/executionMonitoringPhase11.test.js'),
  path.resolve(__dirname, 'backend/agencyIntelligencePhase12.test.js'),
  path.resolve(__dirname, 'backend/inspectionQueuePhase13.test.js'),
  path.resolve(__dirname, 'backend/systemicIntelligencePhase14.test.js'),
  path.resolve(__dirname, 'backend/auditTraceabilityPhase15.test.js'),
  path.resolve(__dirname, 'frontend/designTokens.test.js'),
  path.resolve(__dirname, 'frontend/authAndRouting.test.js'),
  path.resolve(__dirname, 'frontend/phase4Workspaces.test.js'),
  path.resolve(__dirname, 'frontend/phase5ProjectDetail.test.js'),
  path.resolve(__dirname, 'frontend/phase8AiIntelligence.test.js'),
  path.resolve(__dirname, 'frontend/phase9RiskPanel.test.js'),
  path.resolve(__dirname, 'frontend/phase10DistrictReview.test.js'),
  path.resolve(__dirname, 'frontend/phase11ExecutionMonitoring.test.js'),
  path.resolve(__dirname, 'frontend/phase12AgencyIntelligence.test.js'),
  path.resolve(__dirname, 'frontend/inspectionQueuePhase13Frontend.test.js'),
  path.resolve(__dirname, 'frontend/systemicIntelligencePhase14Frontend.test.js'),
  path.resolve(__dirname, 'frontend/phase15AuditTraceability.test.js'),
];

console.log('Running MPLADS Test Suites (Backend + Frontend)...');
console.log(`Total suites to execute: ${testFiles.length}\n`);

let passedCount = 0;
let failedCount = 0;
const failedFiles = [];

for (const file of testFiles) {
  const relPath = path.relative(path.resolve(__dirname, '..'), file);
  process.stdout.write(`▶ Running ${relPath}... `);
  const start = Date.now();
  const res = spawnSync(process.execPath, ['--test', file], {
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  if (res.status === 0) {
    passedCount++;
    console.log(`✔ PASS (${duration}s)`);
  } else {
    failedCount++;
    failedFiles.push(relPath);
    console.log(`✖ FAIL (${duration}s)`);
    if (res.stdout) console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
  }
}

console.log('\n=========================================');
console.log(`Test Execution Summary:`);
console.log(`  Passed Suites: ${passedCount}/${testFiles.length}`);
console.log(`  Failed Suites: ${failedCount}/${testFiles.length}`);
if (failedFiles.length > 0) {
  console.log(`  Failing Files:`);
  failedFiles.forEach((f) => console.log(`    - ${f}`));
}
console.log('=========================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


