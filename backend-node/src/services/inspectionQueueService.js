/**
 * Inspection Queue Service (Phase 13)
 * Provides canonical field verification & inspection management per architecture.md §10.1 & rules.md §12:
 * 1. Prioritized inspection candidate queue combining Phase 9 Risk, Phase 6 Compliance,
 *    Phase 11 Execution discrepancy gaps, and Phase 10 Officer recommendations.
 * 2. Canonical 7-stage lifecycle state machine with validation:
 *    RECOMMENDED -> PENDING_DECISION -> ASSIGNED -> SCHEDULED -> IN_PROGRESS -> COMPLETED -> RESULT_RECORDED
 * 3. Result recording: NO_ISSUE | REVIEW_REQUIRED | ESCALATE
 * 4. Human-in-the-loop guarantees: AI only recommends & ranks; officers assign, schedule, & record results.
 * 5. Statutory quota tracking (1% State, 10% District) from live database records.
 * 6. Strict Admin Isolation and RBAC enforcement.
 */
const {
  Inspection,
  Project,
  ProjectProgress,
  ProjectPayment,
  ComplianceFinding,
  AiRiskScore,
  AuditLog,
  Notification,
  User,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
} = require('../models');
const logger = require('../utils/logger');

// Canonical allowed transitions map
const VALID_TRANSITIONS = {
  RECOMMENDED: ['PENDING_DECISION', 'ASSIGNED'],
  PENDING_DECISION: ['ASSIGNED'],
  ASSIGNED: ['SCHEDULED', 'ASSIGNED'], // Allow re-assign
  SCHEDULED: ['IN_PROGRESS', 'SCHEDULED'], // Allow re-schedule
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['RESULT_RECORDED'],
  RESULT_RECORDED: [], // Terminal inspection state
};

// Active statuses that prevent duplicate case creation
const ACTIVE_STATUSES = [
  'RECOMMENDED',
  'PENDING_DECISION',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
];

class InspectionQueueService {
  /**
   * Helper: check Admin Isolation and RBAC
   */
  _validateAccess(user, requiredAction = 'VIEW') {
    if (!user) {
      const err = new Error('Authentication required');
      err.code = 'UNAUTHENTICATED';
      err.status = 401;
      throw err;
    }

    if (user.role === 'ADMIN') {
      const err = new Error('Access denied: Admin isolation prohibits access to inspection business data per rules.md §10');
      err.code = 'ADMIN_ISOLATION';
      err.status = 403;
      throw err;
    }

    if (['ASSIGN', 'SCHEDULE', 'TRANSITION', 'RECORD_RESULT'].includes(requiredAction)) {
      if (user.role === 'AUDITOR') {
        const err = new Error('Access denied: Auditor has read-only access and cannot modify inspection records');
        err.code = 'FORBIDDEN_ROLE';
        err.status = 403;
        throw err;
      }
      if (user.role === 'MP' || user.role === 'IMPLEMENTING_AGENCY') {
        const err = new Error(`Access denied: Role '${user.role}' cannot execute inspection administrative action '${requiredAction}'`);
        err.code = 'FORBIDDEN_ROLE';
        err.status = 403;
        throw err;
      }
    }
  }

  /**
   * Helper: check jurisdiction for an inspection or project
   */
  _validateJurisdiction(user, projectOrInspection) {
    if (user.role === 'DISTRICT_AUTHORITY') {
      const userDistrict = (user.jurisdiction?.district || '').toLowerCase();
      const targetDistrict = (projectOrInspection.district || '').toLowerCase();
      if (userDistrict && targetDistrict && userDistrict !== targetDistrict) {
        const err = new Error(`Access denied: Target belongs to ${projectOrInspection.district} District, outside your jurisdiction (${user.jurisdiction?.district})`);
        err.code = 'FORBIDDEN_JURISDICTION';
        err.status = 403;
        throw err;
      }
    } else if (user.role === 'STATE_NODAL_AUTHORITY') {
      const userState = (user.jurisdiction?.state || '').toLowerCase();
      const targetState = (projectOrInspection.state || '').toLowerCase();
      if (userState && targetState && userState !== targetState) {
        const err = new Error(`Access denied: Target belongs to ${projectOrInspection.state}, outside your state jurisdiction (${user.jurisdiction?.state})`);
        err.code = 'FORBIDDEN_JURISDICTION';
        err.status = 403;
        throw err;
      }
    }
  }

  /**
   * Compute composite inspection priority score and tier
   */
  calculateInspectionPriority({ riskScore, complianceFindings, discrepancyGap, recommendationSource, projectStatus }) {
    // 1. Phase 9 Risk Score (40% weight)
    const baseRisk = Number(riskScore?.overall_score ?? riskScore?.composite_score ?? 0);
    const riskPart = Math.min(40, (baseRisk / 100) * 40);

    // 2. Phase 6 Compliance Severity (25% weight)
    let compliancePart = 0;
    const nonCompliant = complianceFindings?.some((f) => f.status === 'NON_COMPLIANT' || f.severity === 'CRITICAL');
    const reviewRequired = complianceFindings?.some((f) => f.status === 'REVIEW_REQUIRED' || f.severity === 'WARNING');
    if (nonCompliant) {
      compliancePart = 25;
    } else if (reviewRequired) {
      compliancePart = 15;
    }

    // 3. Phase 11 Execution Discrepancy Gap (20% weight)
    let executionPart = 0;
    const gap = Math.abs(Number(discrepancyGap || 0));
    if (gap >= 25) {
      executionPart = 20;
    } else if (gap >= 15) {
      executionPart = 15;
    } else if (gap >= 10) {
      executionPart = 10;
    }

    // 4. Officer Trigger / Source (15% weight)
    let triggerPart = 0;
    if (recommendationSource === 'OFFICER_RECOMMENDATION' || projectStatus === 'INSPECTION_REQUESTED') {
      triggerPart = 15;
    } else if (recommendationSource === 'COMPLIANCE_TRIGGER') {
      triggerPart = 10;
    } else if (recommendationSource === 'AI_RISK_TRIGGER') {
      triggerPart = 10;
    } else if (recommendationSource === 'STATUTORY_QUOTA') {
      triggerPart = 5;
    }

    const priorityScore = Math.min(100, Math.round(riskPart + compliancePart + executionPart + triggerPart));

    let priorityTier = 'ROUTINE';
    if (priorityScore >= 75) {
      priorityTier = 'URGENT';
    } else if (priorityScore >= 50) {
      priorityTier = 'HIGH';
    } else if (priorityScore >= 25) {
      priorityTier = 'MEDIUM';
    }

    return { priorityScore, priorityTier };
  }

  /**
   * Build Risk-Ranked Inspection Queue
   */
  async buildInspectionQueue({ jurisdiction, filters = {}, user }) {
    this._validateAccess(user, 'VIEW');

    const state = filters.state || jurisdiction?.state || user.jurisdiction?.state || 'Madhya Pradesh';
    const district = filters.district || (user.role === 'DISTRICT_AUTHORITY' ? user.jurisdiction?.district : jurisdiction?.district);

    // Build project filter
    const projectFilter = {};
    if (state) projectFilter.state = new RegExp(`^${state}$`, 'i');
    if (district) projectFilter.district = new RegExp(`^${district}$`, 'i');

    // Never show cancelled or rejected works in active queue unless explicitly requested
    if (filters.status && filters.status !== 'ALL') {
      // Inspection status filter handled on inspections
    } else {
      projectFilter.status = { $nin: ['CANCELLED', 'REJECTED'] };
    }

    // Role-specific constraints
    if (user.role === 'IMPLEMENTING_AGENCY') {
      if (user.agency_id) projectFilter.implementing_agency_id = user.agency_id;
    } else if (user.role === 'MP') {
      projectFilter.mp_id = user.user_id;
    }

    const projects = await Project.find(projectFilter).lean();
    if (projects.length === 0) {
      return { items: [], total: 0, pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
    }

    const projectIds = projects.map((p) => p.project_id);

    // Concurrently fetch inspections, risk scores, compliance findings, payments, and progress
    const [inspections, riskScores, complianceFindings, payments, progressList] = await Promise.all([
      Inspection.find({ project_id: { $in: projectIds } }).lean(),
      AiRiskScore.find({ project_id: { $in: projectIds } }).lean(),
      ComplianceFinding.find({ project_id: { $in: projectIds } }).lean(),
      ProjectPayment.find({ project_id: { $in: projectIds }, status: { $in: ['DISBURSED', 'APPROVED'] } }).lean(),
      ProjectProgress.find({ project_id: { $in: projectIds } }).sort({ reported_at: -1 }).lean(),
    ]);

    // Map helpers
    const inspectionByProject = {};
    for (const insp of inspections) {
      if (!inspectionByProject[insp.project_id] || (insp.status !== 'RESULT_RECORDED' && inspectionByProject[insp.project_id].status === 'RESULT_RECORDED')) {
        inspectionByProject[insp.project_id] = insp;
      }
    }

    const riskByProject = {};
    for (const r of riskScores) riskByProject[r.project_id] = r;

    const complianceByProject = {};
    for (const c of complianceFindings) {
      if (!complianceByProject[c.project_id]) complianceByProject[c.project_id] = [];
      complianceByProject[c.project_id].push(c);
    }

    const paymentSumByProject = {};
    for (const p of payments) {
      paymentSumByProject[p.project_id] = (paymentSumByProject[p.project_id] || 0) + (Number(p.amount) || 0);
    }

    const latestProgressByProject = {};
    for (const p of progressList) {
      if (!latestProgressByProject[p.project_id]) latestProgressByProject[p.project_id] = p;
    }

    // Assemble queue items
    const queueItems = [];

    for (const p of projects) {
      const existingInsp = inspectionByProject[p.project_id];
      const risk = riskByProject[p.project_id];
      const compliance = complianceByProject[p.project_id] || [];

      // Calculate execution gap
      const sanctionedCost = Number(p.sanctioned_cost || p.estimated_cost || 0);
      const totalDisbursed = paymentSumByProject[p.project_id] || 0;
      const financialPercent = sanctionedCost > 0 ? (totalDisbursed / sanctionedCost) * 100 : 0;
      const physicalPercent = Number(latestProgressByProject[p.project_id]?.percent_complete || 0);
      const discrepancyGap = Math.abs(financialPercent - physicalPercent);

      // Determine recommendation source
      const recSource = existingInsp?.recommendation_source ||
        (p.is_inspection_required || p.status === 'INSPECTION_REQUESTED' ? 'OFFICER_RECOMMENDATION' :
        (risk?.risk_level === 'HIGH' || risk?.risk_level === 'CRITICAL' ? 'AI_RISK_TRIGGER' : 'STATUTORY_QUOTA'));

      const { priorityScore, priorityTier } = this.calculateInspectionPriority({
        riskScore: risk,
        complianceFindings: compliance,
        discrepancyGap,
        recommendationSource: recSource,
        projectStatus: p.status,
      });

      const complianceSeverity = compliance.some((c) => c.status === 'NON_COMPLIANT' || c.severity === 'CRITICAL')
        ? 'NON_COMPLIANT'
        : (compliance.some((c) => c.status === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : 'COMPLIANT');

      const item = {
        inspection_id: existingInsp?.inspection_id || null,
        project_id: p.project_id,
        project_title: p.title,
        district: p.district,
        state: p.state,
        project_status: p.status,
        inspection_status: existingInsp?.status || 'RECOMMENDED',
        inspection_type: existingInsp?.inspection_type || 'STATUTORY_10_PERCENT_DA',
        priority: existingInsp?.priority || priorityTier,
        priority_score: typeof existingInsp?.priority_score === 'number' && existingInsp.priority_score > 0
          ? existingInsp.priority_score
          : priorityScore,
        recommendation_source: recSource,
        risk_score: Number(risk?.overall_score ?? risk?.composite_score ?? 0),
        risk_level: risk?.risk_level || 'LOW',
        compliance_severity: complianceSeverity,
        discrepancy_gap: Number(discrepancyGap.toFixed(1)),
        physical_percent: Number(physicalPercent.toFixed(1)),
        financial_percent: Number(financialPercent.toFixed(1)),
        assigned_officer_id: existingInsp?.assigned_officer_id || null,
        assigned_officer_name: existingInsp?.assigned_officer_name || null,
        scheduled_date: existingInsp?.scheduled_date || null,
        completed_date: existingInsp?.completed_date || null,
        result: existingInsp?.result || null,
        findings_summary: existingInsp?.findings_summary || null,
        evidence_document_ids: existingInsp?.evidence_document_ids || [],
        created_at: existingInsp?.created_at || p.created_at,
        has_active_inspection: Boolean(existingInsp),
      };

      // Filter check
      if (filters.status && filters.status !== 'ALL' && item.inspection_status !== filters.status) {
        continue;
      }
      if (filters.priority && filters.priority !== 'ALL' && item.priority !== filters.priority) {
        continue;
      }

      queueItems.push(item);
    }

    // Sort by priority_score descending, then latest created
    queueItems.sort((a, b) => b.priority_score - a.priority_score || new Date(b.created_at) - new Date(a.created_at));

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50));
    const startIndex = (page - 1) * limit;
    const paginatedItems = queueItems.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total: queueItems.length,
      pagination: {
        total: queueItems.length,
        page,
        limit,
        pages: Math.ceil(queueItems.length / limit),
      },
    };
  }

  /**
   * Recommend an Inspection (Create or Upsert)
   * Prevents duplicate active inspection creation.
   */
  async recommendInspection(projectId, source = 'OFFICER_RECOMMENDATION', user, payload = {}) {
    this._validateAccess(user, 'RECOMMEND');

    const cleanProjectId = String(projectId).trim().toUpperCase();
    const project = await Project.findOne({ project_id: cleanProjectId }).lean();

    if (!project) {
      const err = new Error(`Project '${cleanProjectId}' not found`);
      err.code = 'PROJECT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    this._validateJurisdiction(user, project);

    // Duplicate Protection: check if active inspection already exists
    const existingActive = await Inspection.findOne({
      project_id: cleanProjectId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingActive) {
      logger.info(`Duplicate inspection recommendation prevented for project ${cleanProjectId}`, {
        existing_inspection_id: existingActive.inspection_id,
        current_status: existingActive.status,
      });
      return {
        inspection: existingActive,
        is_duplicate: true,
        message: `An active inspection (${existingActive.inspection_id}) is already in status '${existingActive.status}'. Duplicate case creation prevented.`,
      };
    }

    // Calculate priority from telemetry
    const [risk, compliance] = await Promise.all([
      AiRiskScore.findOne({ project_id: cleanProjectId }).lean(),
      ComplianceFinding.find({ project_id: cleanProjectId }).lean(),
    ]);

    const { priorityScore, priorityTier } = this.calculateInspectionPriority({
      riskScore: risk,
      complianceFindings: compliance,
      discrepancyGap: 0,
      recommendationSource: source,
      projectStatus: project.status,
    });

    const chosenPriority = payload.priority && ['ROUTINE', 'MEDIUM', 'HIGH', 'URGENT'].includes(payload.priority)
      ? payload.priority
      : priorityTier;

    const inspectionId = `INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newInspection = new Inspection({
      inspection_id: inspectionId,
      project_id: cleanProjectId,
      state: project.state,
      district: project.district,
      inspection_type: payload.inspection_type || (user.role === 'STATE_NODAL_AUTHORITY' ? 'STATUTORY_1_PERCENT_STATE' : 'STATUTORY_10_PERCENT_DA'),
      status: 'RECOMMENDED',
      priority: chosenPriority,
      priority_score: priorityScore,
      recommendation_source: source,
      quota_year: payload.quota_year || new Date().getFullYear(),
      findings_summary: payload.reason || payload.findings_summary || 'Inspection recommended for physical field verification',
      remarks: payload.remarks || null,
      adverse_flags_count: risk?.risk_level === 'HIGH' || risk?.risk_level === 'CRITICAL' ? 1 : 0,
      audit_trail: [
        {
          from_status: 'NONE',
          to_status: 'RECOMMENDED',
          transitioned_by: user.user_id,
          transitioned_at: new Date(),
          reason: payload.reason || 'Initial inspection recommendation filed',
        },
      ],
      is_real_government_data: Boolean(project.is_real_government_data),
      is_synthetic: Boolean(project.is_synthetic),
    });

    await newInspection.save();

    // Create AuditLog
    await AuditLog.create({
      audit_id: `AUD-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      user_id: user.user_id,
      role: user.role,
      action: 'INSPECTION_RECOMMENDED',
      entity_type: 'PROJECT',
      entity_id: cleanProjectId,
      project_id: cleanProjectId,
      new_state: { inspection_id: inspectionId, status: 'RECOMMENDED', priority: chosenPriority },
      reason: payload.reason || 'Inspection recommendation filed',
      metadata: { inspection_id: inspectionId, source, priorityScore },
      timestamp: new Date(),
    });

    logger.info(`Inspection recommendation created: ${inspectionId} on ${cleanProjectId} by ${user.user_id}`);

    return {
      inspection: newInspection,
      is_duplicate: false,
      message: 'Inspection recommendation created successfully',
    };
  }

  /**
   * Assign an Officer to an Inspection
   * Strictly human-in-the-loop action.
   */
  async assignInspection(inspectionId, assignedOfficerId, assignedOfficerName, user) {
    this._validateAccess(user, 'ASSIGN');

    const cleanId = String(inspectionId).trim().toUpperCase();
    const inspection = await Inspection.findOne({ inspection_id: cleanId });

    if (!inspection) {
      const err = new Error(`Inspection '${cleanId}' not found`);
      err.code = 'INSPECTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    this._validateJurisdiction(user, inspection);

    if (!['RECOMMENDED', 'PENDING_DECISION', 'ASSIGNED'].includes(inspection.status)) {
      const err = new Error(`Cannot assign officer to inspection in status '${inspection.status}'. Allowed in: RECOMMENDED, PENDING_DECISION, ASSIGNED`);
      err.code = 'INVALID_STATE_TRANSITION';
      err.status = 409;
      throw err;
    }

    if (!assignedOfficerId || !String(assignedOfficerId).trim()) {
      const err = new Error('assigned_officer_id is required');
      err.code = 'OFFICER_REQUIRED';
      err.status = 400;
      throw err;
    }

    const prevStatus = inspection.status;
    inspection.assigned_officer_id = String(assignedOfficerId).trim();
    inspection.assigned_officer_name = assignedOfficerName ? String(assignedOfficerName).trim() : inspection.assigned_officer_id;
    inspection.assigned_by = user.user_id;
    inspection.assigned_at = new Date();
    inspection.status = 'ASSIGNED';

    inspection.audit_trail.push({
      from_status: prevStatus,
      to_status: 'ASSIGNED',
      transitioned_by: user.user_id,
      transitioned_at: new Date(),
      reason: `Assigned to field officer: ${inspection.assigned_officer_name} (${inspection.assigned_officer_id})`,
    });

    await inspection.save();

    await AuditLog.create({
      audit_id: `AUD-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      user_id: user.user_id,
      role: user.role,
      action: 'INSPECTION_ASSIGNED',
      entity_type: 'PROJECT',
      entity_id: inspection.project_id,
      project_id: inspection.project_id,
      previous_state: { status: prevStatus },
      new_state: { status: 'ASSIGNED', assigned_officer_id: inspection.assigned_officer_id },
      reason: `Assigned to ${inspection.assigned_officer_name}`,
      metadata: { inspection_id: cleanId, assigned_officer_id: inspection.assigned_officer_id },
      timestamp: new Date(),
    });

    return inspection;
  }

  /**
   * Schedule Inspection Date
   * Strictly officer-controlled.
   */
  async scheduleInspection(inspectionId, scheduledDate, user, notes = '') {
    this._validateAccess(user, 'SCHEDULE');

    const cleanId = String(inspectionId).trim().toUpperCase();
    const inspection = await Inspection.findOne({ inspection_id: cleanId });

    if (!inspection) {
      const err = new Error(`Inspection '${cleanId}' not found`);
      err.code = 'INSPECTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    this._validateJurisdiction(user, inspection);

    if (!['ASSIGNED', 'SCHEDULED'].includes(inspection.status)) {
      const err = new Error(`Cannot schedule inspection in status '${inspection.status}'. Must be ASSIGNED or SCHEDULED`);
      err.code = 'INVALID_STATE_TRANSITION';
      err.status = 409;
      throw err;
    }

    if (!scheduledDate || isNaN(new Date(scheduledDate).getTime())) {
      const err = new Error('Valid scheduled_date is required');
      err.code = 'INVALID_DATE';
      err.status = 400;
      throw err;
    }

    const prevStatus = inspection.status;
    inspection.scheduled_date = new Date(scheduledDate);
    inspection.scheduled_by = user.user_id;
    inspection.scheduled_at = new Date();
    inspection.status = 'SCHEDULED';
    if (notes) inspection.remarks = notes.trim();

    inspection.audit_trail.push({
      from_status: prevStatus,
      to_status: 'SCHEDULED',
      transitioned_by: user.user_id,
      transitioned_at: new Date(),
      reason: `Field inspection scheduled for ${inspection.scheduled_date.toISOString().split('T')[0]}. ${notes}`.trim(),
    });

    await inspection.save();

    await AuditLog.create({
      audit_id: `AUD-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      user_id: user.user_id,
      role: user.role,
      action: 'INSPECTION_SCHEDULED',
      entity_type: 'PROJECT',
      entity_id: inspection.project_id,
      project_id: inspection.project_id,
      previous_state: { status: prevStatus },
      new_state: { status: 'SCHEDULED', scheduled_date: inspection.scheduled_date },
      reason: `Scheduled for ${inspection.scheduled_date.toISOString().split('T')[0]}`,
      metadata: { inspection_id: cleanId, scheduled_date: inspection.scheduled_date },
      timestamp: new Date(),
    });

    return inspection;
  }

  /**
   * Transition Inspection Lifecycle
   * Validates canonical sequence.
   */
  async transitionInspection(inspectionId, toStatus, user, payload = {}) {
    this._validateAccess(user, 'TRANSITION');

    const cleanId = String(inspectionId).trim().toUpperCase();
    const inspection = await Inspection.findOne({ inspection_id: cleanId });

    if (!inspection) {
      const err = new Error(`Inspection '${cleanId}' not found`);
      err.code = 'INSPECTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    this._validateJurisdiction(user, inspection);

    const fromStatus = inspection.status;
    const allowed = VALID_TRANSITIONS[fromStatus] || [];

    if (!allowed.includes(toStatus)) {
      const err = new Error(`Cannot transition inspection from '${fromStatus}' to '${toStatus}'. Valid next states: [${allowed.join(', ')}]`);
      err.code = 'INVALID_STATE_TRANSITION';
      err.status = 409;
      throw err;
    }

    inspection.status = toStatus;

    if (toStatus === 'IN_PROGRESS') {
      // Visit started
    } else if (toStatus === 'COMPLETED') {
      inspection.completed_date = new Date();
      inspection.completed_by = user.user_id;
      inspection.completed_at = new Date();
      if (payload.findings_summary) inspection.findings_summary = payload.findings_summary.trim();
    }

    inspection.audit_trail.push({
      from_status: fromStatus,
      to_status: toStatus,
      transitioned_by: user.user_id,
      transitioned_at: new Date(),
      reason: payload.reason || `Status updated from ${fromStatus} to ${toStatus}`,
    });

    await inspection.save();

    await AuditLog.create({
      audit_id: `AUD-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      user_id: user.user_id,
      role: user.role,
      action: `INSPECTION_${toStatus}`,
      entity_type: 'PROJECT',
      entity_id: inspection.project_id,
      project_id: inspection.project_id,
      previous_state: { status: fromStatus },
      new_state: { status: toStatus },
      reason: payload.reason || `Inspection transitioned to ${toStatus}`,
      metadata: { inspection_id: cleanId, from_status: fromStatus, to_status: toStatus },
      timestamp: new Date(),
    });

    return inspection;
  }

  /**
   * Record Inspection Result
   * Requires status COMPLETED -> RESULT_RECORDED.
   * Strictly human-controlled and NEVER auto-closes the project.
   */
  async recordResult(inspectionId, result, findings, evidenceDocumentIds = [], user, payload = {}) {
    this._validateAccess(user, 'RECORD_RESULT');

    const cleanId = String(inspectionId).trim().toUpperCase();
    const inspection = await Inspection.findOne({ inspection_id: cleanId });

    if (!inspection) {
      const err = new Error(`Inspection '${cleanId}' not found`);
      err.code = 'INSPECTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    this._validateJurisdiction(user, inspection);

    if (!INSPECTION_RESULTS.includes(result)) {
      const err = new Error(`Invalid inspection result '${result}'. Allowed values: ${INSPECTION_RESULTS.join(', ')}`);
      err.code = 'INVALID_RESULT';
      err.status = 400;
      throw err;
    }

    if (inspection.status !== 'COMPLETED') {
      const err = new Error(`Cannot record inspection result in status '${inspection.status}'. Must be in 'COMPLETED' status first.`);
      err.code = 'INVALID_STATE_TRANSITION';
      err.status = 409;
      throw err;
    }

    const prevStatus = inspection.status;
    inspection.result = result;
    inspection.status = 'RESULT_RECORDED';
    inspection.findings_summary = (findings || '').trim() || 'No specific findings noted.';
    inspection.evidence_document_ids = Array.isArray(evidenceDocumentIds) ? evidenceDocumentIds : [];
    inspection.result_recorded_by = user.user_id;
    inspection.result_recorded_at = new Date();
    if (payload.remarks) inspection.remarks = payload.remarks.trim();

    inspection.audit_trail.push({
      from_status: prevStatus,
      to_status: 'RESULT_RECORDED',
      transitioned_by: user.user_id,
      transitioned_at: new Date(),
      reason: `Result recorded: ${result}. Findings: ${inspection.findings_summary}`,
    });

    await inspection.save();

    await AuditLog.create({
      audit_id: `AUD-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      user_id: user.user_id,
      role: user.role,
      action: 'INSPECTION_RESULT_RECORDED',
      entity_type: 'PROJECT',
      entity_id: inspection.project_id,
      project_id: inspection.project_id,
      previous_state: { status: prevStatus, result: null },
      new_state: { status: 'RESULT_RECORDED', result },
      reason: `Inspection result recorded: ${result}`,
      metadata: {
        inspection_id: cleanId,
        result,
        findings: inspection.findings_summary,
        evidence_document_ids: inspection.evidence_document_ids,
      },
      timestamp: new Date(),
    });

    logger.info(`Inspection result recorded: ${cleanId} -> ${result} by ${user.user_id}`);

    return inspection;
  }

  /**
   * Quota Statistics from Real Database Records
   * Calculates 1% State quota or 10% District quota without hardcoded numbers.
   */
  async quotaStats({ level = 'DISTRICT', state, district, year, user }) {
    this._validateAccess(user, 'VIEW');

    const cleanYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const queryState = state || user.jurisdiction?.state || 'Madhya Pradesh';
    const queryDistrict = district || (user.role === 'DISTRICT_AUTHORITY' ? user.jurisdiction?.district : null);

    let eligibleWorks = 0;
    let target = 0;
    let completed = 0;

    if (level.toUpperCase() === 'STATE') {
      const stateRegex = new RegExp(`^${queryState}$`, 'i');
      eligibleWorks = await Project.countDocuments({ state: stateRegex });
      target = Math.max(1, Math.ceil(eligibleWorks * 0.01)); // Statutory 1%

      completed = await Inspection.countDocuments({
        state: stateRegex,
        status: { $in: ['COMPLETED', 'RESULT_RECORDED'] },
        quota_year: cleanYear,
      });
    } else {
      // DISTRICT
      const targetDistrict = queryDistrict || 'Indore';
      const districtRegex = new RegExp(`^${targetDistrict}$`, 'i');
      const stateRegex = new RegExp(`^${queryState}$`, 'i');

      eligibleWorks = await Project.countDocuments({
        district: districtRegex,
        state: stateRegex,
      });
      target = Math.max(1, Math.ceil(eligibleWorks * 0.10)); // Statutory 10%

      completed = await Inspection.countDocuments({
        district: districtRegex,
        state: stateRegex,
        status: { $in: ['COMPLETED', 'RESULT_RECORDED'] },
        quota_year: cleanYear,
      });
    }

    const remaining = Math.max(0, target - completed);
    const progressPercentage = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 100;

    return {
      level: level.toUpperCase(),
      state: queryState,
      district: queryDistrict,
      year: cleanYear,
      eligible_works: eligibleWorks,
      target_count: target,
      completed_count: completed,
      remaining_count: remaining,
      progress_percentage: progressPercentage,
    };
  }
}

module.exports = new InspectionQueueService();
