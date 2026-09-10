/**
 * Centralized Audit Service
 * Service: auditService.js
 * Implements Phase 15: Audit, Traceability & Quality Assurance
 * Standardizes event logging, request correlation, immutability, and Admin Isolation.
 */
const { randomBytes } = require('crypto');
const { AuditLog } = require('../models/AuditLog');
const { Project, OfficerDecision } = require('../models');

/**
 * Generate collision-resistant unique audit identifier
 */
function generateAuditId() {
  const timestamp = Date.now();
  const hex = randomBytes(4).toString('hex').toUpperCase();
  return `AUD-${timestamp}-${hex}`;
}

/**
 * Centralized helper to record an audit event into the append-only ledger
 * @param {Object} entry - Event data payload
 * @param {Object} [req] - Express request object for correlation (X-Request-Id, IP, UA)
 * @param {Object} [session] - Mongoose transaction session (optional)
 * @returns {Promise<Object>} Created immutable AuditLog document
 */
async function recordAuditEvent(entry, req = null, session = null) {
  if (!entry) {
    throw new Error('Audit entry data is required');
  }

  // Extract actor details
  const actorUserId =
    entry.actor_user_id ||
    entry.user_id ||
    req?.user?.user_id ||
    'SYSTEM';

  const role =
    entry.role ||
    req?.user?.role ||
    (actorUserId === 'SYSTEM' ? 'SYSTEM' : 'UNKNOWN');

  // Determine event_type: Human vs. System
  let eventType = entry.event_type;
  if (!eventType) {
    if (actorUserId === 'SYSTEM' || role === 'SYSTEM' || entry.action?.startsWith('AI_')) {
      eventType = 'SYSTEM';
    } else {
      eventType = 'HUMAN';
    }
  }

  // Traceability & correlation
  const requestId =
    entry.request_id ||
    req?.id ||
    req?.headers?.['x-request-id'] ||
    null;

  const ipAddress =
    entry.ip_address ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    null;

  const userAgent =
    entry.user_agent ||
    req?.get?.('user-agent') ||
    null;

  const auditData = {
    audit_id: entry.audit_id || generateAuditId(),
    user_id: actorUserId,
    actor_user_id: actorUserId,
    role: role,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: String(entry.entity_id),
    project_id: entry.project_id ? String(entry.project_id) : null,
    event_type: eventType,
    request_id: requestId,
    previous_state: entry.previous_state !== undefined ? entry.previous_state : null,
    new_state: entry.new_state !== undefined ? entry.new_state : null,
    reason: entry.reason || null,
    metadata: entry.metadata || {},
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: entry.timestamp || new Date(),
  };

  const auditDoc = new AuditLog(auditData);
  const saveOptions = session ? { session } : {};
  return await auditDoc.save(saveOptions);
}

/**
 * Retrieve complete chronological audit trail for a project
 * Strictly enforces Admin Isolation and Role/Jurisdiction boundaries
 */
async function getProjectAuditTrail(projectId, user, options = {}) {
  // 1. Admin Isolation: Admin receives 403 per rules.md §10
  if (user?.role === 'ADMIN') {
    const err = new Error('Administrators cannot access project audit trail per rules.md §10');
    err.code = 'ADMIN_ISOLATION';
    err.status = 403;
    throw err;
  }

  // 2. Locate project and verify existence
  const project = await Project.findOne({ project_id: projectId }).lean();
  if (!project) {
    const err = new Error(`Project '${projectId}' not found`);
    err.code = 'PROJECT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 3. Jurisdiction Scoping
  if (user?.role === 'DISTRICT_AUTHORITY') {
    if (
      user.jurisdiction?.district &&
      project.district &&
      user.jurisdiction.district.toLowerCase() !== project.district.toLowerCase()
    ) {
      const err = new Error(`Cross-jurisdiction access denied for district '${project.district}'`);
      err.code = 'FORBIDDEN_JURISDICTION';
      err.status = 403;
      throw err;
    }
  } else if (user?.role === 'STATE_NODAL_AUTHORITY') {
    if (
      user.jurisdiction?.state &&
      project.state &&
      user.jurisdiction.state.toLowerCase() !== project.state.toLowerCase()
    ) {
      const err = new Error(`Cross-jurisdiction access denied for state '${project.state}'`);
      err.code = 'FORBIDDEN_JURISDICTION';
      err.status = 403;
      throw err;
    }
  } else if (user?.role === 'IMPLEMENTING_AGENCY') {
    const isAssigned =
      project.assigned_agency_id === user.user_id ||
      project.assigned_agency_id === user.agency_id ||
      (user.jurisdiction?.district &&
        project.district &&
        user.jurisdiction.district.toLowerCase() === project.district.toLowerCase());
    if (!isAssigned) {
      const err = new Error('Implementing agency not assigned to this project');
      err.code = 'FORBIDDEN_JURISDICTION';
      err.status = 403;
      throw err;
    }
  } else if (user?.role === 'MP') {
    const isRecommended =
      project.mp_id === user.user_id ||
      (user.jurisdiction?.constituency &&
        project.constituency &&
        user.jurisdiction.constituency.toLowerCase() === project.constituency.toLowerCase());
    if (!isRecommended) {
      const err = new Error('MP can only view audit trail for own recommended projects');
      err.code = 'FORBIDDEN_JURISDICTION';
      err.status = 403;
      throw err;
    }
  }

  // 4. Fetch chronological audit log records
  const auditLogs = await AuditLog.find({ project_id: projectId })
    .sort({ timestamp: 1 })
    .lean();

  // 5. Fetch formal officer decisions
  const decisions = await OfficerDecision.find({ project_id: projectId })
    .sort({ decided_at: 1 })
    .lean();

  // Enrich logs with category labels for UI clarity
  const enrichedLogs = auditLogs.map((log) => ({
    ...log,
    is_human_decision: log.event_type === 'HUMAN',
    is_system_event: log.event_type === 'SYSTEM',
    category_label: log.event_type === 'HUMAN' ? 'Human Officer Decision' : 'System & AI Event',
  }));

  return {
    project_id: projectId,
    title: project.title,
    current_status: project.status,
    total_events: enrichedLogs.length,
    human_event_count: enrichedLogs.filter((l) => l.is_human_decision).length,
    system_event_count: enrichedLogs.filter((l) => l.is_system_event).length,
    audit_logs: enrichedLogs,
    decisions: decisions,
  };
}

/**
 * General Audit Log query for authorized oversight roles (Auditor, Ministry, State Nodal)
 */
async function queryAuditLogs(filters = {}, user, options = {}) {
  // 1. Admin Isolation: Admin receives 403 per rules.md §10
  if (user?.role === 'ADMIN') {
    const err = new Error('Administrators cannot access audit records per rules.md §10');
    err.code = 'ADMIN_ISOLATION';
    err.status = 403;
    throw err;
  }

  // 2. Authorized roles only
  const allowedRoles = ['AUDITOR', 'MINISTRY', 'STATE_NODAL_AUTHORITY', 'DISTRICT_AUTHORITY'];
  if (!allowedRoles.includes(user?.role)) {
    const err = new Error('Access to central audit records is restricted');
    err.code = 'FORBIDDEN_ROLE';
    err.status = 403;
    throw err;
  }

  const query = {};

  if (filters.project_id) {
    query.project_id = filters.project_id;
  }
  if (filters.event_type && ['HUMAN', 'SYSTEM'].includes(filters.event_type)) {
    query.event_type = filters.event_type;
  }
  if (filters.action) {
    query.action = filters.action;
  }
  if (filters.entity_type) {
    query.entity_type = filters.entity_type;
  }
  if (filters.user_id) {
    query.user_id = filters.user_id;
  }
  if (filters.from_date || filters.to_date) {
    query.timestamp = {};
    if (filters.from_date) query.timestamp.$gte = new Date(filters.from_date);
    if (filters.to_date) query.timestamp.$lte = new Date(filters.to_date);
  }

  const page = Math.max(1, parseInt(options.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(options.limit || 50, 10)));
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  const enrichedRecords = records.map((r) => ({
    ...r,
    is_human_decision: r.event_type === 'HUMAN',
    is_system_event: r.event_type === 'SYSTEM',
    category_label: r.event_type === 'HUMAN' ? 'Human Officer Decision' : 'System & AI Event',
  }));

  return {
    records: enrichedRecords,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

module.exports = {
  generateAuditId,
  recordAuditEvent,
  getProjectAuditTrail,
  queryAuditLogs,
};
