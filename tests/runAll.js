/**
 * Unified Test Runner for Backend and Frontend Tests
 * Runs all suites cleanly and reports results using spec reporter
 */
process.env.NODE_ENV = 'test';
const path = require('path');
// Ensure modules from backend-node/node_modules are resolvable
module.paths.push(path.resolve(__dirname, '../backend-node/node_modules'));

const { run } = require('node:test');
const { spec } = require('node:test/reporters');

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
];

console.log('Running MPLADS Test Suites (Backend + Frontend)...');

const testStream = run({ files: testFiles, concurrency: 1 });

testStream
  .compose(new spec())
  .pipe(process.stdout);

testStream.on('test:fail', () => {
  process.exitCode = 1;
});

