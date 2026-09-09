/**
 * Phase 9 Backend Tests: Risk Engine, AI Gateway & Explainable AI
 * Tests deterministic weighted risk scoring, boundary values (39/40/74/75/100),
 * AI Gateway provider abstraction and failure resilience, data minimization,
 * append-only persistence in ai_risk_scores, ai_risk_flags, and ai_analysis_history,
 * and strict Admin Isolation (403) and cross-jurisdiction checks.
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
const aiGateway = require('../../backend-node/src/services/aiGateway');
const riskEngine = require('../../backend-node/src/services/riskEngine');
const { RISK_WEIGHTS, getRiskLevel } = require('../../backend-node/src/config/riskWeights');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  ComplianceFinding,
  AiRiskFlag,
  AiRiskScore,
  AiAnalysisHistory,
  User,
  OfficerDecision,
  UtilizationCertificate,
  Document,
} = require('../../backend-node/src/models');

describe('Phase 9: Risk Engine, AI Gateway & Explainable AI Tests', () => {
  let server;
  let baseUrl;
  let isDbConnected = false;

  const mpId = 'MP-P9-IND-01';
  const daId = 'DA-P9-IND-01';
  const otherDaId = 'DA-P9-DHAR-01';
  const adminId = 'ADMIN-P9-01';

  let mpToken;
  let daToken;
  let otherDaToken;
  let adminToken;

  const testProjectId = 'PRJ-MAD-IND-P9TEST01';

  // In-memory fallback stores if Atlas is unreachable
  const memoryStore = {
    users: new Map(),
    projects: new Map(),
    riskScores: new Map(),
    riskFlags: [],
    history: [],
  };

  before(async () => {
    // Generate valid JWT tokens for test roles
    mpToken = jwt.sign({ user_id: mpId, role: 'MP', jurisdiction: { district: 'Indore', state: 'Madhya Pradesh' } }, config.jwtSecret);
    daToken = jwt.sign({ user_id: daId, role: 'DISTRICT_AUTHORITY', jurisdiction: { district: 'Indore', state: 'Madhya Pradesh' } }, config.jwtSecret);
    otherDaToken = jwt.sign({ user_id: otherDaId, role: 'DISTRICT_AUTHORITY', jurisdiction: { district: 'Dhar', state: 'Madhya Pradesh' } }, config.jwtSecret);
    adminToken = jwt.sign({ user_id: adminId, role: 'ADMIN', jurisdiction: { level: 'NATIONAL' } }, config.jwtSecret);

    const testUsers = [
      {
        user_id: mpId,
        official_email: 'mp.p9.indore@sansad.nic.in',
        full_name: 'Test MP Indore P9',
        role: 'MP',
        is_active: true,
        jurisdiction: { level: 'CONSTITUENCY', state: 'Madhya Pradesh', district: 'Indore', constituency: 'Indore' },
      },
      {
        user_id: daId,
        official_email: 'collector.p9.indore@mp.gov.in',
        full_name: 'District Authority Indore P9',
        role: 'DISTRICT_AUTHORITY',
        is_active: true,
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Indore' },
      },
      {
        user_id: otherDaId,
        official_email: 'collector.p9.dhar@mp.gov.in',
        full_name: 'District Authority Dhar P9',
        role: 'DISTRICT_AUTHORITY',
        is_active: true,
        jurisdiction: { level: 'DISTRICT', state: 'Madhya Pradesh', district: 'Dhar' },
      },
      {
        user_id: adminId,
        official_email: 'admin.p9@nic.in',
        full_name: 'System Admin P9',
        role: 'ADMIN',
        is_active: true,
        jurisdiction: { level: 'NATIONAL' },
      },
    ];

    for (const u of testUsers) {
      memoryStore.users.set(u.user_id, u);
    }

    const projectData = {
      project_id: testProjectId,
      title: 'Construction of Community Road Vijay Nagar',
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
    };
    memoryStore.projects.set(testProjectId, projectData);

    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
      }
      isDbConnected = mongoose.connection.readyState === 1;
    } catch {
      isDbConnected = false;
    }

    if (isDbConnected) {
      const testPids = [testProjectId];
      await mongoose.connection.collection('projects').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('project_recommendations').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('engineering_reports').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('project_progress').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('ai_risk_flags').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('ai_risk_scores').deleteMany({ project_id: { $in: testPids } });
      await mongoose.connection.collection('ai_analysis_history').deleteMany({ project_id: { $in: testPids } });

      const passwordHash = await bcrypt.hash('TestPass123!', 10);
      for (const u of testUsers) {
        await User.findOneAndUpdate({ user_id: u.user_id }, { ...u, password_hash: passwordHash, status: 'ACTIVE' }, { upsert: true });
      }
      await Project.create(projectData);
      await EngineeringReport.create({
        report_id: 'REP-P9-01',
        project_id: testProjectId,
        detailed_estimate: 7000000,
        status: 'APPROVED',
      });
      await ComplianceFinding.create({
        finding_id: 'CMP-P9-01',
        project_id: testProjectId,
        severity: 'HIGH',
        category: 'CATEGORY_INELIGIBLE',
        message: 'Work category requires verification.',
      });
    } else {
      // Setup resilient model fallbacks for offline testing
      User.findOne = (q) => {
        if (q?.user_id && memoryStore.users.has(q.user_id)) {
          const u = memoryStore.users.get(q.user_id);
          return { lean: async () => u, ...u };
        }
        return null;
      };

      Project.findOne = (q) => {
        if (q?.project_id && memoryStore.projects.has(q.project_id)) {
          const p = memoryStore.projects.get(q.project_id);
          return { lean: async () => p, ...p };
        }
        return { lean: async () => null };
      };

      Project.find = () => ({
        select: () => ({ limit: () => ({ lean: async () => [] }) }),
        limit: () => ({ lean: async () => [] }),
        lean: async () => [],
      });

      ProjectRecommendation.findOne = () => ({ lean: async () => null });
      EngineeringReport.find = () => ({
        sort: () => ({ lean: async () => [{ report_id: 'REP-01', detailed_estimate: 7000000 }] }),
        lean: async () => [{ report_id: 'REP-01', detailed_estimate: 7000000 }],
      });
      ProjectProgress.find = () => ({ sort: () => ({ lean: async () => [] }), lean: async () => [] });
      ProjectPayment.find = () => ({ sort: () => ({ lean: async () => [] }), lean: async () => [] });
      ComplianceFinding.find = () => ({
        sort: () => ({ lean: async () => [{ finding_id: 'CMP-01', severity: 'HIGH', category: 'CATEGORY_INELIGIBLE' }] }),
        lean: async () => [{ finding_id: 'CMP-01', severity: 'HIGH', category: 'CATEGORY_INELIGIBLE' }],
      });
      OfficerDecision.find = () => ({
        sort: () => ({ lean: async () => [] }),
        lean: async () => [],
      });
      UtilizationCertificate.find = () => ({
        sort: () => ({ lean: async () => [] }),
        lean: async () => [],
      });
      Document.find = () => ({
        sort: () => ({ select: () => ({ lean: async () => [] }), lean: async () => [] }),
        select: () => ({ lean: async () => [] }),
        lean: async () => [],
      });

      AiRiskScore.findOne = (q) => {
        if (q?.project_id && memoryStore.riskScores.has(q.project_id)) {
          const s = memoryStore.riskScores.get(q.project_id);
          return { lean: async () => s, ...s };
        }
        return { lean: async () => memoryStore.riskScores.get(q?.project_id) || null };
      };

      AiRiskScore.findOneAndUpdate = async (q, update) => {
        memoryStore.riskScores.set(q.project_id, { ...update, project_id: q.project_id });
        return memoryStore.riskScores.get(q.project_id);
      };

      AiRiskFlag.create = async (doc) => {
        memoryStore.riskFlags.push(doc);
        return doc;
      };

      AiRiskFlag.find = (q) => {
        const filtered = memoryStore.riskFlags.filter((f) => !q?.project_id || f.project_id === q.project_id);
        return {
          sort: () => ({ lean: async () => filtered }),
          lean: async () => filtered,
        };
      };

      AiAnalysisHistory.create = async (doc) => {
        memoryStore.history.push(doc);
        return doc;
      };

      AiAnalysisHistory.find = (q) => {
        const filtered = memoryStore.history.filter((h) => !q?.project_id || h.project_id === q.project_id);
        return {
          sort: () => ({ lean: async () => filtered }),
          lean: async () => filtered,
        };
      };
    }

    // Start Express server on dynamic port
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
    if (isDbConnected && mongoose.connection.readyState !== 0) {
      await mongoose.connection.collection('projects').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('ai_risk_flags').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('ai_risk_scores').deleteMany({ project_id: testProjectId });
      await mongoose.connection.collection('ai_analysis_history').deleteMany({ project_id: testProjectId });
      await mongoose.disconnect();
    }
    if (server?.closeAllConnections) server.closeAllConnections();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Boundary values testing for getRiskLevel per Section 5 & 29
  test('Risk level boundary values: LOW (0-39), MEDIUM (40-74), HIGH (75-100)', () => {
    assert.equal(getRiskLevel(0), 'LOW');
    assert.equal(getRiskLevel(39), 'LOW');
    assert.equal(getRiskLevel(40), 'MEDIUM');
    assert.equal(getRiskLevel(74), 'MEDIUM');
    assert.equal(getRiskLevel(75), 'HIGH');
    assert.equal(getRiskLevel(100), 'HIGH');
  });

  // 2. Centralized weights verification per Section 8
  test('Centralized risk weights: configured and sum to 1.0 (100%)', () => {
    const totalWeight =
      RISK_WEIGHTS.COST_ANOMALY +
      RISK_WEIGHTS.DUPLICATE_RISK +
      RISK_WEIGHTS.SPECIFICATION_DEVIATION +
      RISK_WEIGHTS.PAYMENT_PROGRESS_ANOMALY +
      RISK_WEIGHTS.DELAY_RISK +
      RISK_WEIGHTS.COMPLIANCE +
      RISK_WEIGHTS.HISTORICAL_PATTERN;

    assert.equal(Math.round(totalWeight * 100) / 100, 1.0);
    assert.equal(RISK_WEIGHTS.COST_ANOMALY, 0.25);
    assert.equal(RISK_WEIGHTS.DUPLICATE_RISK, 0.25);
  });

  // 3. Normalization and Individual Signal calculation
  test('RiskEngine normalization: individual signals produce explainable weighted contributions', () => {
    const mockProject = { category: 'Roads & Bridges', estimated_cost: 2000000 };

    const singleSignal = [
      {
        signal_type: 'COST_ANOMALY',
        score: 80,
        severity: 'HIGH',
        message: 'Proposed cost +80% above peer median',
      },
    ];

    const res = riskEngine.aggregateRisk(mockProject, singleSignal, []);
    assert.equal(res.overall_score, 20); // 80 * 0.25 = 20
    assert.equal(res.risk_level, 'LOW'); // 20 <= 39 -> LOW
    assert.equal(res.top_contributors.length, 1);
    assert.equal(res.top_contributors[0].type, 'COST_ANOMALY');
    assert.equal(res.top_contributors[0].weighted_contribution, 20);
  });

  // 4. Combined signals yielding HIGH overall risk
  test('RiskEngine combined signals: strong multi-signal findings yield HIGH overall risk', () => {
    const mockProject = { category: 'Roads & Bridges', estimated_cost: 6300000 };
    const rawSignals = [
      { signal_type: 'COST_ANOMALY', score: 88, severity: 'HIGH', message: 'Cost +186% above median' },
      { signal_type: 'DUPLICATE_RISK', score: 92, severity: 'HIGH', message: '92% similarity with work' },
      { signal_type: 'SPECIFICATION_DEVIATION', score: 85, severity: 'HIGH', message: 'Cost drift +80%' },
      { signal_type: 'PAYMENT_PROGRESS_ANOMALY', score: 87, severity: 'HIGH', message: 'Disbursement gap 49%' },
      { signal_type: 'DELAY_RISK', score: 85, severity: 'HIGH', message: '190 days without progress' },
    ];

    const res = riskEngine.aggregateRisk(mockProject, rawSignals, []);
    assert.ok(res.overall_score >= 75, `Overall score should be >= 75, got ${res.overall_score}`);
    assert.equal(res.risk_level, 'HIGH');
    assert.ok(res.top_contributors.length >= 4);
  });

  // 5. Data Minimization verification per Section 12 & 29
  test('AI Data Minimization: extractDeIdentifiedEvidence contains NO PII or raw documents', () => {
    const mockProject = {
      project_id: 'PRJ-001',
      title: 'Secret Road',
      category: 'Roads & Bridges',
      estimated_cost: 6300000,
      beneficiary_name: 'John Doe',
      applicant_email: 'applicant@example.com',
      bank_account: 'SBI-1234567890',
      uploaded_document_blob: 'base64rawblobdata...',
    };

    const evaluatedSignals = [
      {
        type: 'COST_ANOMALY',
        evidence: { peer_median: 2200000, deviation_percent: 186.4, peer_count: 5 },
      },
    ];

    const evidence = riskEngine.extractDeIdentifiedEvidence(mockProject, evaluatedSignals);

    assert.equal(evidence.project_category, 'Roads & Bridges');
    assert.equal(evidence.estimated_cost, 6300000);
    assert.equal(evidence.peer_median_cost, 2200000);
    assert.equal(evidence.cost_deviation_percent, 186.4);

    assert.equal(evidence.beneficiary_name, undefined);
    assert.equal(evidence.applicant_email, undefined);
    assert.equal(evidence.bank_account, undefined);
    assert.equal(evidence.uploaded_document_blob, undefined);
    assert.equal(evidence.password, undefined);
    assert.equal(evidence.token, undefined);
  });

  // 6. AI Gateway: resilient fallback when microservice/LLM is offline per Section 14
  test('AI Gateway: returns AI_ANALYSIS_UNAVAILABLE and preserves deterministic summary on failure', async () => {
    const originalExplain = aiClient.generateExplanation;
    aiClient.generateExplanation = async () => ({
      available: false,
      code: 'AI_ANALYSIS_UNAVAILABLE',
    });

    try {
      const res = await aiGateway.generateExplanation({
        overallScore: 87,
        riskLevel: 'HIGH',
        category: 'Roads & Bridges',
        topContributors: [{ type: 'COST_ANOMALY', severity: 'HIGH', score: 88, reason: 'High cost' }],
      });

      assert.equal(res.status, 'AI_ANALYSIS_UNAVAILABLE');
      assert.ok(res.explanation.includes('temporarily unavailable'));
      assert.ok(res.explanation.includes('Overall Risk: HIGH — 87'));
      assert.ok(res.explanation.includes('Review recommended'));
      assert.equal(res.data_minimized, true);
    } finally {
      aiClient.generateExplanation = originalExplain;
    }
  });

  // 7. Security: Strict Admin Isolation on risk endpoints (403 ADMIN_ISOLATION) per rules.md §10
  test('Strict Admin Isolation: Admin receives 403 ADMIN_ISOLATION on all /risk endpoints', async () => {
    const endpoints = [
      { method: 'GET', path: `/api/projects/${testProjectId}/risk` },
      { method: 'GET', path: `/api/projects/${testProjectId}/risk/history` },
      { method: 'GET', path: `/api/projects/${testProjectId}/risk/flags` },
      { method: 'POST', path: `/api/projects/${testProjectId}/risk/analyze` },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403, `Admin must receive 403 on ${ep.path}`);
      const body = await res.json();
      assert.equal(body.error?.code, 'ADMIN_ISOLATION');
    }
  });

  // 8. Security: Cross-jurisdiction isolation (403 FORBIDDEN_JURISDICTION)
  test('Cross-jurisdiction isolation: Collector of Dhar receives 403 on Indore project risk endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/risk`, {
      headers: { Authorization: `Bearer ${otherDaToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'FORBIDDEN_JURISDICTION');
  });

  // 9. Full Phase 9 Execution and persistence verification
  test('POST /api/projects/:projectId/risk/analyze executes risk pipeline and persists results', async () => {
    const originalCheckCost = aiClient.checkCostAnomaly;
    const originalCheckDup = aiClient.checkDuplicates;
    const originalCheckSpec = aiClient.checkSpecComparison;
    const originalCheckDelay = aiClient.checkDelay;
    const originalCheckPay = aiClient.checkPaymentProgress;
    const originalExplain = aiClient.generateExplanation;

    aiClient.checkCostAnomaly = async () => ({
      available: true,
      data: {
        signal_type: 'COST_ANOMALY',
        severity: 'HIGH',
        score: 88,
        status: 'OK',
        message: 'Proposed cost +186.4% above historical peer median. Review recommended.',
        evidence: { proposed_cost: 6300000, peer_median: 2200000, deviation_percent: 186.4 },
        model_or_rule: 'PEER_IQR_V1',
      },
    });

    aiClient.checkDuplicates = async () => ({
      available: true,
      data: {
        signal_type: 'DUPLICATE_RISK',
        severity: 'HIGH',
        score: 92,
        status: 'OK',
        message: 'Possible repeated or overlapping work detected (92.0% match). Ground verification recommended.',
        evidence: { top_matches: [{ project_id: 'PRJ-EXISTING', similarity_score: 92.0 }] },
        model_or_rule: 'TFIDF_COSINE_V1',
      },
    });

    aiClient.checkSpecComparison = async () => ({
      available: true,
      data: {
        signal_type: 'SPECIFICATION_DEVIATION',
        severity: 'HIGH',
        score: 85,
        status: 'OK',
        message: 'Detailed engineering estimate deviates +80.0% above outlay. Review recommended.',
        evidence: { cost_drift_percent: 80.0 },
        model_or_rule: 'SPEC_VARIANCE_V1',
      },
    });

    aiClient.checkDelay = async () => ({
      available: true,
      data: {
        signal_type: 'DELAY_RISK',
        severity: 'HIGH',
        score: 85,
        status: 'OK',
        message: '190 days elapsed without progress update. Review recommended.',
        evidence: { days_since_last_progress: 190 },
        model_or_rule: 'DELAY_RULES_V1',
      },
    });

    aiClient.checkPaymentProgress = async () => ({
      available: true,
      data: {
        signal_type: 'PAYMENT_PROGRESS_ANOMALY',
        severity: 'HIGH',
        score: 87,
        status: 'OK',
        message: 'Disbursement substantially exceeds physical execution. Ground verification recommended.',
        evidence: { discrepancy_gap_percent: 49.4 },
        model_or_rule: 'PAYMENT_PROGRESS_GAP_V1',
      },
    });

    aiClient.generateExplanation = async () => ({
      available: true,
      data: {
        status: 'AI_ANALYSIS_COMPLETE',
        explanation:
          'Overall Risk: HIGH — 80\n\nMain contributing signals:\n• Cost anomaly — HIGH: Proposed cost exceeds category peer median by 186.4%.\n• Duplicate risk — HIGH: 92% similarity with nearby project.\n\nReview recommended by authorized administrative official.',
        provider: 'gemini',
        model: 'gemini-1.5-flash',
      },
    });

    try {
      // 1. POST /api/projects/:projectId/risk/analyze
      const resAnalyze = await fetch(`${baseUrl}/api/projects/${testProjectId}/risk/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${daToken}` },
      });

      assert.equal(resAnalyze.status, 200);
      const bodyAnalyze = await resAnalyze.json();
      assert.equal(bodyAnalyze.success, true);
      assert.ok(bodyAnalyze.data?.overall_score >= 75);
      assert.equal(bodyAnalyze.data?.risk_level, 'HIGH');
      assert.ok(bodyAnalyze.data?.top_contributors.length >= 4);
      assert.ok(bodyAnalyze.data?.explanation.includes('Overall Risk: HIGH'));

      // 2. GET /api/projects/:projectId/risk returns current score
      const resGetRisk = await fetch(`${baseUrl}/api/projects/${testProjectId}/risk`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(resGetRisk.status, 200);
      const bodyGetRisk = await resGetRisk.json();
      assert.equal(bodyGetRisk.data?.evaluated, true);
      assert.equal(bodyGetRisk.data?.level, 'HIGH');
      assert.ok(bodyGetRisk.data?.top_contributors.length >= 4);

      // 3. GET /api/projects/:projectId/risk/history returns timeline
      const resGetHistory = await fetch(`${baseUrl}/api/projects/${testProjectId}/risk/history`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(resGetHistory.status, 200);
      const bodyGetHistory = await resGetHistory.json();
      assert.ok(bodyGetHistory.data?.history.length >= 1);

      // 4. GET /api/projects/:projectId/risk/flags returns individual findings
      const resGetFlags = await fetch(`${baseUrl}/api/projects/${testProjectId}/risk/flags`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(resGetFlags.status, 200);
      const bodyGetFlags = await resGetFlags.json();
      assert.ok(bodyGetFlags.data?.flags.length >= 5);

      // 5. GET /api/projects/:projectId includes current_risk in Project 360 view
      const res360 = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${daToken}` },
      });
      assert.equal(res360.status, 200);
      const body360 = await res360.json();
      assert.ok(body360.data?.current_risk, 'Project 360 must include current_risk');
      assert.equal(body360.data?.current_risk?.risk_level, 'HIGH');
    } finally {
      aiClient.checkCostAnomaly = originalCheckCost;
      aiClient.checkDuplicates = originalCheckDup;
      aiClient.checkSpecComparison = originalCheckSpec;
      aiClient.checkDelay = originalCheckDelay;
      aiClient.checkPaymentProgress = originalCheckPay;
      aiClient.generateExplanation = originalExplain;
    }
  });
});
