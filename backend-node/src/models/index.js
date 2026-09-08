/**
 * Central Models Barrel Export
 * Exports all Mongoose models and canonical domain enumerations.
 */
const { User, ROLES, JURISDICTION_LEVELS } = require('./User');
const { MpAllocation } = require('./MpAllocation');
const { FundUtilization } = require('./FundUtilization');
const { WorkCompletion } = require('./WorkCompletion');
const { CompletionRates } = require('./CompletionRates');
const {
  Project,
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
} = require('./Project');
const { ProjectRecommendation } = require('./ProjectRecommendation');
const { EngineeringReport } = require('./EngineeringReport');
const {
  ProjectProgress,
  PROGRESS_STAGES,
} = require('./ProjectProgress');
const {
  ProjectPayment,
  PAYMENT_STATUSES,
} = require('./ProjectPayment');
const { UtilizationCertificate } = require('./UtilizationCertificate');
const {
  ImplementingAgency,
  AGENCY_TYPES,
} = require('./ImplementingAgency');
const { AgencyPerformance } = require('./AgencyPerformance');
const { AgencyConcentration } = require('./AgencyConcentration');
const {
  ScStAreaReference,
  SC_ST_CLASSIFICATIONS,
} = require('./ScStAreaReference');
const {
  AiRiskFlag,
  RISK_FLAG_TYPES,
  SEVERITY_LEVELS,
} = require('./AiRiskFlag');
const { AiRiskScore, RISK_LEVELS } = require('./AiRiskScore');
const { AiAnalysisHistory } = require('./AiAnalysisHistory');
const {
  Inspection,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
  INSPECTION_TYPES,
  INSPECTION_PRIORITIES,
} = require('./Inspection');
const {
  OfficerDecision,
  DECISION_TYPES,
} = require('./OfficerDecision');
const {
  Notification,
  NOTIFICATION_TYPES,
} = require('./Notification');
const {
  AuditLog,
  AUDIT_ENTITY_TYPES,
} = require('./AuditLog');
const { UserPreference } = require('./UserPreference');
const { Document, DOCUMENT_TYPES } = require('./Document');
const {
  ComplianceFinding,
  COMPLIANCE_STATUSES,
  COMPLIANCE_SEVERITIES,
  COMPLIANCE_RULE_CATEGORIES,
} = require('./ComplianceFinding');

module.exports = {
  // Models
  User,
  MpAllocation,
  FundUtilization,
  WorkCompletion,
  CompletionRates,
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
  Notification,
  AuditLog,
  UserPreference,
  Document,
  ComplianceFinding,

  // Canonical Constants & Enums
  ROLES,
  JURISDICTION_LEVELS,
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
  PROGRESS_STAGES,
  PAYMENT_STATUSES,
  AGENCY_TYPES,
  SC_ST_CLASSIFICATIONS,
  RISK_FLAG_TYPES,
  SEVERITY_LEVELS,
  RISK_LEVELS,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
  INSPECTION_TYPES,
  INSPECTION_PRIORITIES,
  DECISION_TYPES,
  NOTIFICATION_TYPES,
  AUDIT_ENTITY_TYPES,
  DOCUMENT_TYPES,
  COMPLIANCE_STATUSES,
  COMPLIANCE_SEVERITIES,
  COMPLIANCE_RULE_CATEGORIES,
};

