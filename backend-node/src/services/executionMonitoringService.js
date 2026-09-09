/**
 * Continuous Execution Monitoring Service (Phase 11)
 * Evaluates post-sanction project execution telemetry:
 * - Payment vs Physical Progress consistency & discrepancy gaps (§12.5)
 * - Abnormal progress jumps and evidence staleness
 * - Timeline overrun and delay monitoring (§12.6)
 * - Engineering estimate drift
 * - Hierarchical multi-tier notification dispatch (District -> State -> Ministry)
 * Strictly advisory per rules.md §12 — never makes autonomous sanction/close decisions.
 */
const crypto = require('crypto');
const logger = require('../utils/logger');
const {
  Project,
  ProjectProgress,
  ProjectPayment,
  EngineeringReport,
  ComplianceFinding,
  AiRiskFlag,
  AiRiskScore,
  Notification,
  User,
  AuditLog,
} = require('../models');
const riskEngine = require('./riskEngine');

class ExecutionMonitoringService {
  /**
   * Evaluate full execution telemetry for an active project
   * @param {string} projectId
   * @param {Object} actingUser - User context for role/jurisdiction
   * @param {Object} options - Optional flags (e.g. skipNotifications)
   * @returns {Promise<Object>} Execution monitoring evaluation report
   */
  async evaluateProjectExecution(projectId, actingUser = null, options = {}) {
    const pId = String(projectId).trim().toUpperCase();

    const [project, progressList, payments, engineeringReports, complianceFindings, currentRisk] =
      await Promise.all([
        Project.findOne({ project_id: pId }).lean(),
        ProjectProgress.find({ project_id: pId }).sort({ reported_at: -1 }).lean(),
        ProjectPayment.find({ project_id: pId }).sort({ installment_number: 1, payment_date: -1 }).lean(),
        EngineeringReport.find({ project_id: pId }).sort({ version: -1 }).lean(),
        ComplianceFinding.find({ project_id: pId }).lean(),
        AiRiskScore.findOne({ project_id: pId }).lean(),
      ]);

    if (!project) {
      throw new Error(`Project '${pId}' not found for execution monitoring`);
    }

    const now = Date.now();
    const sanctionedCost = Number(project.sanctioned_cost || project.estimated_cost || 0);

    // 1. FINANCIAL DISBURSEMENT METRICS
    const disbursedPayments = payments.filter((p) => p.status === 'DISBURSED' || p.status === 'APPROVED');
    const totalDisbursed = disbursedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const financialDisbursedPercent =
      sanctionedCost > 0 ? Math.min(100, Number(((totalDisbursed / sanctionedCost) * 100).toFixed(1))) : 0.0;

    // 2. PHYSICAL PROGRESS METRICS
    const latestProgress = progressList.length > 0 ? progressList[0] : null;
    const physicalProgressPercent = latestProgress ? Number(latestProgress.percent_complete) : 0.0;
    const currentStage = latestProgress ? latestProgress.stage : (project.status === 'SANCTIONED' ? 'NOT_STARTED' : 'SITE_PREPARATION');

    // 3. PAYMENT VS PROGRESS MISMATCH ANALYSIS (PRD §12.5)
    const discrepancyGapPercent = Number((financialDisbursedPercent - physicalProgressPercent).toFixed(1));
    let mismatchSeverity = 'LOW';
    let mismatchScore = 5;
    let mismatchMessage = `Financial disbursement (${financialDisbursedPercent}%) and physical execution (${physicalProgressPercent}%) are proportionately aligned.`;

    if (discrepancyGapPercent >= 35.0) {
      mismatchSeverity = 'HIGH';
      mismatchScore = Math.min(95, Math.max(75, Math.round(75 + (discrepancyGapPercent - 35.0) * 0.6)));
      mismatchMessage = `Financial disbursement (${financialDisbursedPercent}%) substantially exceeds reported physical execution (${physicalProgressPercent}%). Discrepancy gap of ${discrepancyGapPercent}%. Ground verification recommended before further fund release.`;
    } else if (discrepancyGapPercent >= 15.0) {
      mismatchSeverity = 'MEDIUM';
      mismatchScore = Math.min(74, Math.max(40, Math.round(40 + discrepancyGapPercent * 1.2)));
      mismatchMessage = `Financial disbursement (${financialDisbursedPercent}%) moderately outpaces reported physical execution (${physicalProgressPercent}%). Verification recommended.`;
    } else if (discrepancyGapPercent < -25.0) {
      mismatchSeverity = 'MEDIUM';
      mismatchScore = 45;
      mismatchMessage = `Reported physical progress (${physicalProgressPercent}%) significantly exceeds disbursed payments (${financialDisbursedPercent}%). Verify execution milestones and pending invoices.`;
    }

    // 4. ABNORMAL PROGRESS JUMPS & EVIDENCE INCONSISTENCIES
    let hasAbnormalJump = false;
    let jumpPercent = 0;
    let jumpSeverity = 'LOW';
    let jumpMessage = 'Progress trajectory follows expected incremental milestones.';

    if (progressList.length >= 2) {
      const prevProgress = progressList[1];
      jumpPercent = Number((latestProgress.percent_complete - prevProgress.percent_complete).toFixed(1));
      const daysBetween = Math.max(
        0,
        Math.floor((new Date(latestProgress.reported_at) - new Date(prevProgress.reported_at)) / (1000 * 60 * 60 * 24))
      );

      if (jumpPercent >= 40.0 && daysBetween <= 30) {
        hasAbnormalJump = true;
        jumpSeverity = 'HIGH';
        jumpMessage = `Abnormal physical progress surge detected: reported completion jumped from ${prevProgress.percent_complete}% to ${latestProgress.percent_complete}% (+${jumpPercent}%) in only ${daysBetween} day(s). Administrative verification recommended.`;
      } else if (jumpPercent < 0) {
        hasAbnormalJump = true;
        jumpSeverity = 'MEDIUM';
        jumpMessage = `Negative progress update reported: completion decreased from ${prevProgress.percent_complete}% to ${latestProgress.percent_complete}%. Scrutiny required for revision.`;
      } else if (latestProgress.percent_complete === 100 && (latestProgress.photos_count || 0) === 0) {
        hasAbnormalJump = true;
        jumpSeverity = 'MEDIUM';
        jumpMessage = `100% completion claimed with 0 uploaded photographic verifications. Verification inspection recommended.`;
      }
    }

    // 5. TIMELINE DELAY & STALENESS ANALYSIS (PRD §12.6)
    let daysSinceLastProgress = null;
    if (latestProgress && latestProgress.reported_at) {
      daysSinceLastProgress = Math.max(0, Math.floor((now - new Date(latestProgress.reported_at).getTime()) / (1000 * 60 * 60 * 24)));
    } else if (project.sanction_date) {
      daysSinceLastProgress = Math.max(0, Math.floor((now - new Date(project.sanction_date).getTime()) / (1000 * 60 * 60 * 24)));
    }

    let daysSinceSanction = null;
    if (project.sanction_date) {
      daysSinceSanction = Math.max(0, Math.floor((now - new Date(project.sanction_date).getTime()) / (1000 * 60 * 60 * 24)));
    } else if (project.created_at) {
      daysSinceSanction = Math.max(0, Math.floor((now - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    }

    const expectedDurationDays = 180; // Standard 6-month norm
    let overdueDays = 0;
    let isDelayed = false;
    let delaySeverity = 'LOW';
    let delayScore = 10;
    let delayMessage = 'Project execution timeline is active and within normal reporting intervals.';

    if (physicalProgressPercent < 100) {
      if (daysSinceLastProgress !== null && daysSinceLastProgress >= 180) {
        isDelayed = true;
        delaySeverity = 'HIGH';
        delayScore = 85;
        delayMessage = `Substantial project delay: ${daysSinceLastProgress} days have elapsed without progress update. Ground verification recommended.`;
      } else if (daysSinceSanction !== null && daysSinceSanction > expectedDurationDays) {
        overdueDays = daysSinceSanction - expectedDurationDays;
        isDelayed = true;
        if (overdueDays >= 90) {
          delaySeverity = 'HIGH';
          delayScore = 78;
          delayMessage = `Work is ${overdueDays} days past scheduled duration (${expectedDurationDays} days) with ${physicalProgressPercent}% completed. Ground verification recommended.`;
        } else {
          delaySeverity = 'MEDIUM';
          delayScore = 55;
          delayMessage = `Work has exceeded expected duration by ${overdueDays} days (current progress ${physicalProgressPercent}%). Execution pace delayed; review recommended.`;
        }
      } else if (daysSinceLastProgress !== null && daysSinceLastProgress >= 60) {
        isDelayed = true;
        delaySeverity = 'MEDIUM';
        delayScore = 50;
        delayMessage = `Execution pace delayed: ${daysSinceLastProgress} days since last reported progress update.`;
      } else if (project.status === 'SANCTIONED' && daysSinceSanction !== null && daysSinceSanction >= 60 && physicalProgressPercent === 0) {
        isDelayed = true;
        delaySeverity = 'MEDIUM';
        delayScore = 45;
        delayMessage = `Work sanctioned ${daysSinceSanction} days ago with no physical mobilization recorded.`;
      }
    } else {
      delayMessage = 'Work has achieved completion. No ongoing execution delays present.';
    }

    // 6. ENGINEERING ESTIMATE DRIFT ANALYSIS (PRD §12.4)
    const latestDpr = engineeringReports.length > 0 ? engineeringReports[0] : null;
    let engineeringDriftPercent = 0;
    let engineeringSeverity = 'LOW';
    let engineeringMessage = latestDpr ? 'Engineering estimates match sanctioned financial parameters.' : 'No detailed engineering DPR filed.';

    if (latestDpr && latestDpr.detailed_estimate && sanctionedCost > 0) {
      const dprEstimate = Number(latestDpr.detailed_estimate);
      engineeringDriftPercent = Number((((dprEstimate - sanctionedCost) / sanctionedCost) * 100).toFixed(1));
      if (engineeringDriftPercent > 15.0) {
        engineeringSeverity = 'MEDIUM';
        engineeringMessage = `DPR estimate (₹${dprEstimate.toLocaleString('en-IN')}) exceeds sanctioned outlay (₹${sanctionedCost.toLocaleString('en-IN')}) by ${engineeringDriftPercent}%.`;
      }
    }

    // 7. ASSEMBLE EXECUTION SIGNALS FOR RISK ENGINE
    const rawSignals = [
      {
        signal_type: 'PAYMENT_PROGRESS_ANOMALY',
        score: mismatchScore,
        severity: mismatchSeverity,
        message: mismatchMessage,
        model_or_rule: 'DISBURSEMENT_PROGRESS_GAP_V1',
        evidence: {
          sanctioned_cost: sanctionedCost,
          total_disbursed: totalDisbursed,
          financial_disbursed_percent: financialDisbursedPercent,
          physical_percent_complete: physicalProgressPercent,
          discrepancy_gap_percent: discrepancyGapPercent,
        },
      },
      {
        signal_type: 'DELAY_RISK',
        score: delayScore,
        severity: delaySeverity,
        message: delayMessage,
        model_or_rule: 'DELAY_RULES_V1',
        evidence: {
          project_status: project.status,
          days_since_last_progress: daysSinceLastProgress,
          days_since_sanction: daysSinceSanction,
          percent_complete: physicalProgressPercent,
          expected_duration_days: expectedDurationDays,
          overdue_days: overdueDays,
        },
      },
    ];

    if (hasAbnormalJump) {
      rawSignals.push({
        signal_type: 'HISTORICAL_PATTERN',
        score: jumpSeverity === 'HIGH' ? 80 : 50,
        severity: jumpSeverity,
        message: jumpMessage,
        model_or_rule: 'PROGRESS_JUMP_HEURISTIC_V1',
        evidence: {
          jump_percent: jumpPercent,
          latest_progress_percent: physicalProgressPercent,
          previous_progress_percent: progressList[1]?.percent_complete || 0,
          photos_count: latestProgress?.photos_count || 0,
        },
      });
    }

    // 8. UPDATE RISK ENGINE ASSESSMENT (Phase 9 Integration)
    const aggregatedRisk = riskEngine.aggregateRisk(project, rawSignals, complianceFindings);

    // 9. PERSIST REFRESHED AI RISK FLAGS & SCORE
    const analysisId = `ANALYSIS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const storedFlags = [];

    for (const sig of rawSignals) {
      if (sig.severity === 'HIGH' || sig.severity === 'MEDIUM' || sig.score >= 40) {
        const flagDoc = {
          flag_id: `FLAG-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          analysis_id: analysisId,
          project_id: pId,
          flag_type: sig.signal_type,
          risk_score: sig.score,
          severity: sig.severity,
          explanation: sig.message,
          model_or_rule: sig.model_or_rule,
          signals: sig.evidence || {},
          evidence: sig.evidence || {},
          source: 'EXECUTION_MONITORING_ENGINE',
          status: 'ACTIVE',
          is_real_government_data: Boolean(project.is_real_government_data),
          is_synthetic: Boolean(project.is_synthetic),
        };
        await AiRiskFlag.create(flagDoc);
        storedFlags.push(flagDoc);
      }
    }

    await AiRiskScore.findOneAndUpdate(
      { project_id: pId },
      {
        project_id: pId,
        overall_score: aggregatedRisk.overall_score,
        risk_level: aggregatedRisk.risk_level,
        component_scores: aggregatedRisk.component_scores,
        signals: aggregatedRisk.signals,
        top_contributors: aggregatedRisk.top_contributors,
        contributing_signals: aggregatedRisk.evaluated_signals.map((s) => ({
          signal_name: s.type,
          weight: s.weight,
          score: s.score,
          explanation: s.reason,
        })),
        explanation:
          aggregatedRisk.top_contributors.length > 0
            ? aggregatedRisk.top_contributors[0].reason
            : 'Execution monitoring parameters within acceptable baseline.',
        ai_status: 'AI_ANALYSIS_COMPLETE',
        analysis_id: analysisId,
        computed_at: new Date(),
        is_real_government_data: Boolean(project.is_real_government_data),
        is_synthetic: Boolean(project.is_synthetic),
      },
      { upsert: true, new: true }
    );

    // 10. HIERARCHICAL NOTIFICATION DISPATCH (District -> State -> Ministry)
    const notificationsDispatched = [];
    if (!options.skipNotifications) {
      try {
        const isHighSeverity = mismatchSeverity === 'HIGH' || delaySeverity === 'HIGH' || jumpSeverity === 'HIGH';
        const isMediumSeverity = mismatchSeverity === 'MEDIUM' || delaySeverity === 'MEDIUM' || jumpSeverity === 'MEDIUM';

        // 1. Notify District Authority if medium or high
        if (isHighSeverity || isMediumSeverity) {
          const districtUsers = await User.find({
            role: 'DISTRICT_AUTHORITY',
            'jurisdiction.district': { $regex: new RegExp(`^${project.district}$`, 'i') },
            is_active: true,
          }).select('user_id official_email').lean();

          for (const da of districtUsers) {
            const notif = await Notification.create({
              notification_id: `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
              recipient_user_id: da.user_id,
              type: 'RISK_ALERT',
              title: `Execution Alert: ${project.project_id} (${project.title})`,
              message: mismatchSeverity === 'HIGH' ? mismatchMessage : (delaySeverity === 'HIGH' ? delayMessage : jumpMessage),
              project_id: pId,
            });
            notificationsDispatched.push({ recipient: da.user_id, role: 'DISTRICT_AUTHORITY', notif_id: notif.notification_id });
          }
        }

        // 2. Notify State Nodal Authority if HIGH severity
        if (isHighSeverity) {
          const stateUsers = await User.find({
            role: 'STATE_NODAL_AUTHORITY',
            'jurisdiction.state': { $regex: new RegExp(`^${project.state}$`, 'i') },
            is_active: true,
          }).select('user_id official_email').lean();

          for (const sa of stateUsers) {
            const notif = await Notification.create({
              notification_id: `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
              recipient_user_id: sa.user_id,
              type: 'ESCALATION',
              title: `State Escalation: Severe Execution Discrepancy on ${project.project_id}`,
              message: `High execution risk in ${project.district}: ${mismatchMessage}`,
              project_id: pId,
            });
            notificationsDispatched.push({ recipient: sa.user_id, role: 'STATE_NODAL_AUTHORITY', notif_id: notif.notification_id });
          }
        }

        // 3. Notify Ministry if systemic (overall score >= 75 or multiple high flags)
        if (aggregatedRisk.overall_score >= 75) {
          const ministryUsers = await User.find({
            role: 'MINISTRY',
            is_active: true,
          }).select('user_id official_email').limit(3).lean();

          for (const min of ministryUsers) {
            const notif = await Notification.create({
              notification_id: `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
              recipient_user_id: min.user_id,
              type: 'ESCALATION',
              title: `Ministry Oversight Alert: High Composite Execution Risk (${project.project_id})`,
              message: `Critical execution indicators on project ${project.project_id} (${project.state}/${project.district}). Score: ${aggregatedRisk.overall_score}. Scrutiny required.`,
              project_id: pId,
            });
            notificationsDispatched.push({ recipient: min.user_id, role: 'MINISTRY', notif_id: notif.notification_id });
          }
        }
      } catch (notifErr) {
        logger.warn(`Notification dispatch error during execution monitoring for ${pId}: ${notifErr.message}`);
      }
    }

    // 11. COMPOSE ADVISORY RECOMMENDATION
    let advisoryAction = 'NORMAL_MONITORING';
    let advisoryRecommendation = 'Project execution telemetry is balanced. Routine progress monitoring recommended.';

    if (mismatchSeverity === 'HIGH') {
      advisoryAction = 'GROUND_VERIFICATION_RECOMMENDED';
      advisoryRecommendation = `Financial disbursement substantially exceeds physical progress (gap ${discrepancyGapPercent}%). Independent physical inspection recommended prior to releasing further funds.`;
    } else if (delaySeverity === 'HIGH') {
      advisoryAction = 'EXPEDITE_OR_VERIFY_RECOMMENDED';
      advisoryRecommendation = `Critical execution delay detected (${daysSinceLastProgress} days since update). Administrative notice to executing agency recommended.`;
    } else if (hasAbnormalJump && jumpSeverity === 'HIGH') {
      advisoryAction = 'MILESTONE_AUDIT_RECOMMENDED';
      advisoryRecommendation = `Sudden progress jump of +${jumpPercent}% reported without intermediate verification. Physical verification of reported stages recommended.`;
    } else if (mismatchSeverity === 'MEDIUM' || delaySeverity === 'MEDIUM') {
      advisoryAction = 'SCRUTINY_RECOMMENDED';
      advisoryRecommendation = 'Moderate execution divergence observed. Close monitoring and milestone verification advised.';
    }

    return {
      project_id: pId,
      status: project.status,
      category: project.category,
      district: project.district,
      state: project.state,
      sanctioned_cost: sanctionedCost,
      execution_metrics: {
        physical_progress_percent: physicalProgressPercent,
        current_stage: currentStage,
        financial_disbursed_amount: totalDisbursed,
        financial_disbursed_percent: financialDisbursedPercent,
        discrepancy_gap_percent: discrepancyGapPercent,
        is_mismatched: mismatchSeverity !== 'LOW',
        mismatch_severity: mismatchSeverity,
        mismatch_message: mismatchMessage,
        timeline: {
          days_since_last_progress: daysSinceLastProgress,
          days_since_sanction: daysSinceSanction,
          expected_duration_days: expectedDurationDays,
          overdue_days: overdueDays,
          is_delayed: isDelayed,
          delay_severity: delaySeverity,
          delay_message: delayMessage,
        },
        progress_jumps: {
          has_abnormal_jump: hasAbnormalJump,
          jump_percent: jumpPercent,
          jump_severity: jumpSeverity,
          jump_message: jumpMessage,
        },
        engineering_drift: {
          drift_percent: engineeringDriftPercent,
          severity: engineeringSeverity,
          message: engineeringMessage,
        },
      },
      risk: {
        overall_score: aggregatedRisk.overall_score,
        risk_level: aggregatedRisk.risk_level,
        component_scores: aggregatedRisk.component_scores,
        top_contributors: aggregatedRisk.top_contributors,
        analysis_id: analysisId,
        computed_at: new Date(),
      },
      advisory_recommendation: {
        is_advisory: true,
        action: advisoryAction,
        text: advisoryRecommendation,
        disclaimer: 'Advisory Only — Administrative Discretion Required per Rules §12. AI findings never execute automated sanction, suspension, or closure.',
      },
      signals: rawSignals,
      new_flags_created: storedFlags.length,
      notifications_dispatched: notificationsDispatched,
      latest_progress: latestProgress,
      total_payments_count: payments.length,
      disbursed_payments_count: disbursedPayments.length,
    };
  }
}

module.exports = new ExecutionMonitoringService();

