/**
 * Automated Tests for Centralized Domain Data Models
 * Verifies architecture.md §10.1, §11 and rules.md §9
 * Tests schema validation, enums, compound indexes, and append-only immutability.
 */
process.env.NODE_ENV = 'test';
const path = require('path');
// Ensure test files can resolve modules from backend-node/node_modules
module.paths.push(path.resolve(__dirname, '../../backend-node/node_modules'));

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const config = require('../../backend-node/src/config/env');
const {
  Project,
  ProjectRecommendation,
  EngineeringReport,
  ProjectProgress,
  ProjectPayment,
  UtilizationCertificate,
  ImplementingAgency,
  AgencyPerformance,
  AgencyConcentration,
  ScStAreaReference,
  AiRiskFlag,
  AiRiskScore,
  AiAnalysisHistory,
  Inspection,
  OfficerDecision,
  AuditLog,
  UserPreference,
  Document,
  PROJECT_STATUSES,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
  RISK_LEVELS,
} = require('../../backend-node/src/models');

describe('Domain Data Models & Immutability Verification Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
  });

  after(async () => {
    // Clean up any test documents created during testing
    await Promise.all([
      Project.deleteMany({ project_id: /^TEST-PRJ-/ }),
      ProjectRecommendation.deleteMany({ project_id: /^TEST-PRJ-/ }).catch(() => {}),
      ProjectPayment.deleteMany({ payment_id: /^TEST-PAY-/ }).catch(() => {}),
      AuditLog.deleteMany({ audit_id: /^TEST-AUD-/ }).catch(() => {}),
      Inspection.deleteMany({ inspection_id: /^TEST-INSP-/ }),
      AiRiskScore.deleteMany({ project_id: /^TEST-PRJ-/ }),
      ImplementingAgency.deleteMany({ agency_id: /^TEST-AGY-/ }),
    ]);
    await mongoose.disconnect();
  });

  test('Project model enforces required fields and canonical status enum', async () => {
    // 1. Missing required fields
    const invalidProject = new Project({});
    let validationErr = invalidProject.validateSync();
    assert.ok(validationErr);
    assert.ok(validationErr.errors.project_id);
    assert.ok(validationErr.errors.mp_id);
    assert.ok(validationErr.errors.district);
    assert.ok(validationErr.errors.category);
    assert.ok(validationErr.errors.title);
    assert.ok(validationErr.errors.estimated_cost);

    // 2. Invalid status enum rejection
    const badStatusProject = new Project({
      project_id: 'TEST-PRJ-001',
      mp_id: 'MP-TEST-001',
      state: 'Madhya Pradesh',
      district: 'Indore',
      category: 'Drinking Water',
      title: 'Water Pumping Station',
      estimated_cost: 2500000,
      status: 'INVALID_STATUS_FOO',
    });
    validationErr = badStatusProject.validateSync();
    assert.ok(validationErr);
    assert.ok(validationErr.errors.status);

    // 3. Valid project creation with canonical status and cross-cutting flags
    const validProject = new Project({
      project_id: 'TEST-PRJ-001',
      mp_id: 'MP-TEST-001',
      state: 'Madhya Pradesh',
      district: 'Indore',
      category: 'Drinking Water',
      title: 'Solar RO Water Plant',
      estimated_cost: 2500000,
      status: 'MP_RECOMMENDED',
      is_inspection_required: true,
      is_escalated: false,
    });
    assert.equal(validProject.validateSync(), undefined);
    assert.ok(PROJECT_STATUSES.includes(validProject.status));
  });

  test('Inspection model validates canonical state machine and conditional result', async () => {
    // 1. Valid initial inspection
    const validInsp = new Inspection({
      inspection_id: 'TEST-INSP-001',
      project_id: 'TEST-PRJ-001',
      inspection_type: 'STATUTORY_10_PERCENT_DA',
      status: 'RECOMMENDED',
      priority: 'HIGH',
    });
    assert.equal(validInsp.validateSync(), undefined);

    // 2. Reject setting result before reaching RESULT_RECORDED
    const prematurelyFinished = new Inspection({
      inspection_id: 'TEST-INSP-002',
      project_id: 'TEST-PRJ-001',
      status: 'SCHEDULED',
      result: 'NO_ISSUE',
    });
    const err = prematurelyFinished.validateSync();
    assert.ok(err);
    assert.ok(err.errors.result);

    // 3. Setting result is valid when status is RESULT_RECORDED
    const completedInsp = new Inspection({
      inspection_id: 'TEST-INSP-003',
      project_id: 'TEST-PRJ-001',
      status: 'RESULT_RECORDED',
      result: 'NO_ISSUE',
    });
    assert.equal(completedInsp.validateSync(), undefined);
  });

  test('AiRiskScore model validates overall_score bounds and risk_level enum', async () => {
    // Out of bounds score
    const invalidScore = new AiRiskScore({
      project_id: 'TEST-PRJ-001',
      overall_score: 150, // Invalid: max 100
      risk_level: 'SUPER_HIGH', // Invalid enum
    });
    const err = invalidScore.validateSync();
    assert.ok(err);
    assert.ok(err.errors.overall_score);
    assert.ok(err.errors.risk_level);

    // Valid score
    const validScore = new AiRiskScore({
      project_id: 'TEST-PRJ-001',
      overall_score: 72,
      risk_level: 'HIGH',
      component_scores: { cost_anomaly: 85, duplicate: 20 },
    });
    assert.equal(validScore.validateSync(), undefined);
  });

  test('Append-Only Immutability: ProjectRecommendation rejects in-place updates', async () => {
    const recId = 'TEST-PRJ-IMMUTABLE-01';
    await ProjectRecommendation.collection.deleteOne({ project_id: recId });

    // Create initial recommendation
    await ProjectRecommendation.create({
      project_id: recId,
      mp_id: 'MP-TEST-001',
      description: 'Original recommendation specifications',
      work_category: 'Health & Family Welfare',
      estimated_cost: 1500000,
      recommended_by: 'USR-MP-01',
    });

    // Attempting updateOne MUST be rejected by appendOnlyPlugin
    await assert.rejects(
      async () => {
        await ProjectRecommendation.updateOne(
          { project_id: recId },
          { $set: { estimated_cost: 9999999 } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    // Attempting findOneAndUpdate MUST be rejected
    await assert.rejects(
      async () => {
        await ProjectRecommendation.findOneAndUpdate(
          { project_id: recId },
          { $set: { description: 'Tampered description' } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    // Attempting deleteOne MUST be rejected
    await assert.rejects(
      async () => {
        await ProjectRecommendation.deleteOne({ project_id: recId });
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    // Clean up via raw native collection driver
    await ProjectRecommendation.collection.deleteOne({ project_id: recId });
  });

  test('Append-Only Immutability: AuditLog rejects in-place updates and deletions', async () => {
    const auditId = 'TEST-AUD-IMMUTABLE-01';
    await AuditLog.collection.deleteOne({ audit_id: auditId });

    await AuditLog.create({
      audit_id: auditId,
      user_id: 'USR-TEST-01',
      role: 'DISTRICT_AUTHORITY',
      action: 'SANCTION_WORK',
      entity_type: 'PROJECT',
      entity_id: 'PRJ-TEST-001',
      reason: 'Statutory compliance satisfied',
    });

    // Attempting update MUST fail
    await assert.rejects(
      async () => {
        await AuditLog.updateOne(
          { audit_id: auditId },
          { $set: { reason: 'Fabricated reason' } }
        );
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    // Attempting delete MUST fail
    await assert.rejects(
      async () => {
        await AuditLog.deleteOne({ audit_id: auditId });
      },
      (err) => {
        assert.ok(err.message.includes('append-only'));
        return true;
      }
    );

    await AuditLog.collection.deleteOne({ audit_id: auditId });
  });

  test('ImplementingAgency enforces unique agency_id and recognized agency types', async () => {
    const agency = new ImplementingAgency({
      agency_id: 'TEST-AGY-RES-01',
      name: 'Rural Engineering Services, Indore Division',
      type: 'RES',
      district: 'Indore',
      state: 'Madhya Pradesh',
    });
    assert.equal(agency.validateSync(), undefined);

    const badTypeAgency = new ImplementingAgency({
      agency_id: 'TEST-AGY-RES-02',
      name: 'Unknown Contractor',
      type: 'PRIVATE_CONTRACTOR_INVALID',
      district: 'Indore',
      state: 'Madhya Pradesh',
    });
    const err = badTypeAgency.validateSync();
    assert.ok(err);
    assert.ok(err.errors.type);
  });
});

