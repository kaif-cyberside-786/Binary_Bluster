/**
 * Phase 8 Backend Tests: AI Historical Intelligence & Anomaly Detection
 * Tests AI orchestration, Python service integration, fallback resilience on outage,
 * append-only persistence in ai_risk_flags and ai_analysis_history,
 * and strict Admin Isolation (403) and cross-jurisdiction boundaries.
 */
process.env.NODE_ENV = 'test';
const path = require('path');
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../../backend-node/src/app');
const config = require('../../backend-node/src/config/env');
const aiClient = require('../../backend-node/src/services/aiClient');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  AiRiskFlag,
  AiAnalysisHistory,
  User,
} = require('../../backend-node/src/models');

describe('Phase 8: AI Historical Intelligence Tests', () => {
  let server;
  let baseUrl;

  const mpId = 'MP-AI-INDORE-01';
  const daId = 'DA-AI-IND-01';
  const otherDaId = 'DA-AI-DHAR-01';
  const adminId = 'ADMIN-AI-01';

  let mpToken;
  let daToken;
  let otherDaToken;
  let adminToken;

  const testProjectId = 'PRJ-MAD-IND-AITEST01';
  const peerProjectId = 'PRJ-MAD-IND-AIPEER01';
  const duplicateCandidateId = 'PRJ-MAD-IND-AIDUP01';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test collections using native driver to bypass append-only hooks
    await mongoose.connection.collection('users').deleteMany({
      user_id: { $in: [mpId, daId, otherDaId, adminId] },
    });
    await mongoose.connection.collection('projects').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('project_recommendations').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('engineering_reports').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('project_progress').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('project_payments').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('ai_risk_flags').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });
    await mongoose.connection.collection('ai_analysis_history').deleteMany({
      project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
    });

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Seed test users
    await User.create([
      {
        user_id: mpId,
        official_email: 'mp.ai.indore@sansad.nic.in',
        password_hash: passwordHash,
        full_name: 'Test MP Indore AI',
        role: 'MP',
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', district: 'Indore', constituency: 'Indore' },
        status: 'ACTIVE',
      },
      {
        user_id: daId,
        official_email: 'collector.ai.indore@mp.gov.in',
        password_hash: passwordHash,
        full_name: 'District Authority Indore AI',
        role: 'DISTRICT_AUTHORITY',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
        status: 'ACTIVE',
      },
      {
        user_id: otherDaId,
        official_email: 'collector.ai.dhar@mp.gov.in',
        password_hash: passwordHash,
        full_name: 'District Authority Dhar AI',
        role: 'DISTRICT_AUTHORITY',
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' },
        status: 'ACTIVE',
      },
      {
        user_id: adminId,
        official_email: 'admin.ai@nic.in',
        password_hash: passwordHash,
        full_name: 'System Admin AI',
        role: 'ADMIN',
        jurisdiction: { level: 'NATIONAL' },
        status: 'ACTIVE',
      },
    ]);

    // Sign JWT tokens
    mpToken = jwt.sign({ user_id: mpId, role: 'MP', jurisdiction: { district: 'Indore', state: 'Madhya Pradesh' } }, config.jwtSecret);
    daToken = jwt.sign({ user_id: daId, role: 'DISTRICT_AUTHORITY', jurisdiction: { district: 'Indore', state: 'Madhya Pradesh' } }, config.jwtSecret);
    otherDaToken = jwt.sign({ user_id: otherDaId, role: 'DISTRICT_AUTHORITY', jurisdiction: { district: 'Dhar', state: 'Madhya Pradesh' } }, config.jwtSecret);
    adminToken = jwt.sign({ user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } }, config.jwtSecret);

    // Seed peer project (normal cost, 22L)
    await Project.create({
      project_id: peerProjectId,
      title: 'Construction of Community Road at Rau',
      description: 'Bitumen road in Rau area',
      category: 'Roads & Bridges',
      estimated_cost: 2200000,
      sanctioned_cost: 2200000,
      state: 'Madhya Pradesh',
      district: 'Indore',
      mp_id: mpId,
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    });

    // Seed duplicate candidate project in same area
    await Project.create({
      project_id: duplicateCandidateId,
      title: 'Construction of Paver Road at Vijay Nagar Ward 12',
      description: 'Laying concrete paver blocks with drain at Vijay Nagar',
      category: 'Roads & Bridges',
      estimated_cost: 2000000,
      sanctioned_cost: 2000000,
      state: 'Madhya Pradesh',
      district: 'Indore',
      location: 'Vijay Nagar',
      ward: 'Ward 12',
      mp_id: mpId,
      status: 'IN_PROGRESS',
      created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });

    // Seed target project with high cost (63L vs 22L peer median) and near duplicate title
    await Project.create({
      project_id: testProjectId,
      title: 'Construction of Paver Road at Vijay Nagar Ward 12',
      description: 'Laying concrete paver blocks and side drainage at Vijay Nagar Ward 12',
      category: 'Roads & Bridges',
      estimated_cost: 6300000,
      sanctioned_cost: 6300000,
      total_disbursed: 5000000,
      state: 'Madhya Pradesh',
      district: 'Indore',
      location: 'Vijay Nagar',
      ward: 'Ward 12',
      mp_id: mpId,
      status: 'IN_PROGRESS',
      sanctioned_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    });

    await ProjectRecommendation.create({
      project_id: testProjectId,
      mp_id: mpId,
      work_category: 'Roads & Bridges',
      recommended_by: mpId,
      estimated_cost: 3500000,
      description: 'Laying concrete paver blocks and side drainage at Vijay Nagar Ward 12',
      recommended_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    });

    await EngineeringReport.create({
      report_id: 'DPR-AI-TEST-01',
      project_id: testProjectId,
      version: 1,
      agency_id: 'PWD-INDORE-01',
      detailed_estimate: 6300000, // +80% cost drift vs recommendation 35L
      scope_remarks: 'Expanded heavy specification with reinforced drainage channels',
      technical_sanction_reference: 'TS/PWD/IND/2026/089',
      submitted_by: 'AG-PWD-01',
      is_current: true,
    });

    await ProjectProgress.create({
      progress_id: 'PROG-AI-TEST-01',
      project_id: testProjectId,
      percent_complete: 30, // 30% physical vs 50L / 63L (79.3%) disbursed -> gap ~49%
      stage: 'FOUNDATION',
      physical_summary: 'Initial foundation works completed',
      reported_at: new Date(Date.now() - 190 * 24 * 60 * 60 * 1000), // Stalled 190 days
      reported_by: 'AG-PWD-01',
    });

    // Start Express server on dynamic port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test data
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.collection('users').deleteMany({
        user_id: { $in: [mpId, daId, otherDaId, adminId] },
      });
      await mongoose.connection.collection('projects').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('project_recommendations').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('engineering_reports').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('project_progress').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('project_payments').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('ai_risk_flags').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
      await mongoose.connection.collection('ai_analysis_history').deleteMany({
        project_id: { $in: [testProjectId, peerProjectId, duplicateCandidateId] },
      });
    }

    if (server?.closeAllConnections) server.closeAllConnections();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  test('POST /api/projects/:projectId/ai/analyze requires authentication (401)', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/analyze`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
  });

  test('Strict Admin Isolation: Admin receives 403 ADMIN_ISOLATION on AI endpoints per rules.md §10', async () => {
    // 1. Analyze trigger
    const resAnalyze = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resAnalyze.status, 403);
    const bodyAnalyze = await resAnalyze.json();
    assert.equal(bodyAnalyze.error?.code, 'ADMIN_ISOLATION');

    // 2. Findings retrieval
    const resFindings = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/findings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resFindings.status, 403);
    const bodyFindings = await resFindings.json();
    assert.equal(bodyFindings.error?.code, 'ADMIN_ISOLATION');
  });

  test('Cross-jurisdiction isolation: Collector of Dhar receives 403 on Indore project AI endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'FORBIDDEN_JURISDICTION');
  });

  test('AI Service offline resilience: returns AI_ANALYSIS_UNAVAILABLE without crashing or faking LOW risk', async () => {
    // Mock aiClient method temporarily to simulate Python service unreachable / down
    const originalPost = aiClient._post;
    aiClient._post = async () => ({
      available: false,
      code: 'AI_ANALYSIS_UNAVAILABLE',
      message: 'AI analysis service is temporarily unavailable.',
    });

    try {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${daToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data?.available, false);
      assert.equal(body.data?.status, 'AI_ANALYSIS_UNAVAILABLE');
      assert.deepEqual(body.data?.flags, []);
    } finally {
      aiClient._post = originalPost;
    }
  });

  test('Live AI Historical Intelligence execution persists flags to ai_risk_flags and history', async () => {
    // Mock the Python service responses to test full Express orchestration and database persistence
    const originalCheckCost = aiClient.checkCostAnomaly;
    const originalCheckDup = aiClient.checkDuplicates;
    const originalCheckSpec = aiClient.checkSpecComparison;
    const originalCheckDelay = aiClient.checkDelay;
    const originalCheckPay = aiClient.checkPaymentProgress;

    aiClient.checkCostAnomaly = async () => ({
      available: true,
      data: {
        signal_type: 'COST_ANOMALY',
        severity: 'HIGH',
        score: 88,
        status: 'OK',
        message: 'Proposed cost ₹6,300,000 is +186.4% above historical peer median (₹2,200,000). Potential cost anomaly. Review recommended.',
        evidence: { proposed_cost: 6300000, peer_median: 2200000, deviation_percent: 186.36, peer_count: 5 },
        model_or_rule: 'PEER_IQR_V1',
      },
    });

    aiClient.checkDuplicates = async () => ({
      available: true,
      data: {
        signal_type: 'DUPLICATE_OVERLAP',
        severity: 'HIGH',
        score: 92,
        status: 'OK',
        message: 'Possible repeated or overlapping work detected with PRJ-MAD-IND-AIDUP01 (92.0% match). Physical review recommended.',
        evidence: { top_matches: [{ project_id: duplicateCandidateId, similarity_score: 92.0 }] },
        model_or_rule: 'TFIDF_COSINE_V1',
      },
    });

    aiClient.checkSpecComparison = async () => ({
      available: true,
      data: {
        signal_type: 'SPEC_DEVIATION',
        severity: 'HIGH',
        score: 85,
        status: 'OK',
        message: 'Detailed engineering estimate deviates +80.0% above original recommended outlay. Review of technical sanction recommended.',
        evidence: { cost_drift_percent: 80.0 },
        model_or_rule: 'SPEC_VARIANCE_V1',
      },
    });

    aiClient.checkDelay = async () => ({
      available: true,
      data: {
        signal_type: 'DELAY_STALENESS',
        severity: 'HIGH',
        score: 85,
        status: 'OK',
        message: 'Substantial project delay detected: 190 days have elapsed without progress update. Ground verification recommended.',
        evidence: { days_since_last_progress: 190, percent_complete: 30 },
        model_or_rule: 'DELAY_RULES_V1',
      },
    });

    aiClient.checkPaymentProgress = async () => ({
      available: true,
      data: {
        signal_type: 'PAYMENT_PROGRESS_MISMATCH',
        severity: 'HIGH',
        score: 87,
        status: 'OK',
        message: 'Financial disbursement (79.4%) substantially exceeds reported physical execution (30.0%). Discrepancy gap of 49.4%. Ground verification recommended.',
        evidence: { discrepancy_gap_percent: 49.37 },
        model_or_rule: 'DISBURSEMENT_PROGRESS_GAP_V1',
      },
    });

    try {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${daToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data?.available, true);
      assert.equal(body.data?.status, 'OK');
      assert.equal(body.data?.flags.length, 5);

      // Verify persistence in ai_risk_flags
      const savedFlags = await AiRiskFlag.find({ project_id: testProjectId }).lean();
      assert.equal(savedFlags.length >= 5, true);

      const costFlag = savedFlags.find((f) => f.flag_type === 'COST_ANOMALY');
      assert.ok(costFlag, 'COST_ANOMALY flag must be saved');
      assert.equal(costFlag.severity, 'HIGH');
      assert.equal(costFlag.risk_score, 88);
      assert.equal(costFlag.model_or_rule, 'PEER_IQR_V1');

      const dupFlag = savedFlags.find((f) => f.flag_type === 'DUPLICATE_OVERLAP');
      assert.ok(dupFlag, 'DUPLICATE_OVERLAP flag must be saved');
      assert.equal(dupFlag.severity, 'HIGH');

      // Verify history snapshot
      const savedHistory = await AiAnalysisHistory.find({ project_id: testProjectId }).lean();
      assert.equal(savedHistory.length >= 1, true);
      assert.equal(savedHistory[0].risk_level, 'HIGH');
      assert.equal(savedHistory[0].triggered_by, daId);

      // Verify GET /api/projects/:projectId/ai/findings returns the stored flags
      const resFindings = await fetch(`${baseUrl}/api/projects/${testProjectId}/ai/findings`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(resFindings.status, 200);
      const bodyFindings = await resFindings.json();
      assert.equal(bodyFindings.data?.flags.length >= 5, true);

      // Verify GET /api/projects/:projectId includes ai_findings in Project 360 payload
      const res360 = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res360.status, 200);
      const body360 = await res360.json();
      assert.ok(Array.isArray(body360.data?.ai_findings), 'Project 360 must include ai_findings array');
      assert.equal(body360.data.ai_findings.length >= 5, true);
    } finally {
      aiClient.checkCostAnomaly = originalCheckCost;
      aiClient.checkDuplicates = originalCheckDup;
      aiClient.checkSpecComparison = originalCheckSpec;
      aiClient.checkDelay = originalCheckDelay;
      aiClient.checkPaymentProgress = originalCheckPay;
    }
  });

  test('Core operations independence: Administrative decisions succeed even when AI service is unavailable', async () => {
    // 1. MP creates recommendation without AI dependency
    const resRec = await fetch(`${baseUrl}/api/projects/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        title: 'New Community Drainage Channel Rau',
        category: 'Roads & Bridges',
        estimated_cost: 2500000,
        description: 'Stormwater drainage along primary rural road',
        beneficiary_count: 5000,
      }),
    });
    assert.equal(resRec.status, 201);
    const bodyRec = await resRec.json();
    const newProjectId = bodyRec.data?.project?.project_id;
    assert.ok(newProjectId);

    // 2. District Authority sanctions project without AI dependency
    const resDecision = await fetch(`${baseUrl}/api/projects/${newProjectId}/decision`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${daToken}`,
      },
      body: JSON.stringify({
        decision: 'SANCTION',
        reason: 'Recommended work vetted and approved for administrative sanction',
      }),
    });

    assert.equal(resDecision.status, 200);
    const bodyDecision = await resDecision.json();
    assert.equal(bodyDecision.success, true);
    assert.equal(bodyDecision.data?.project?.status, 'SANCTIONED');

    // Clean up created project
    await mongoose.connection.collection('projects').deleteOne({ project_id: newProjectId });
    await mongoose.connection.collection('project_recommendations').deleteOne({ project_id: newProjectId });
    await mongoose.connection.collection('officer_decisions').deleteOne({ project_id: newProjectId });
  });
});
