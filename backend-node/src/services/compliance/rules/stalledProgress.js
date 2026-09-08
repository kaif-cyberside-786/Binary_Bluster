/**
 * Rule: STALLED_PROGRESS
 * Deterministic check for execution delays, stale progress updates, and completion target adherence
 * Category: TIMELINE
 */
const config = require('../config');

function evaluateStalledProgress(project, progressHistory = []) {
  const status = project.status;

  // Completed or non-active works do not get flagged for stalled execution
  if (status === 'COMPLETED' || status === 'MP_RECOMMENDED' || status === 'DISTRICT_REVIEW' || status === 'HELD') {
    return {
      rule_id: 'STALLED_PROGRESS',
      rule_category: 'TIMELINE',
      status: 'COMPLIANT',
      severity: 'LOW',
      title: 'Timeline & Execution Staleness',
      message: `Project is in status '${status}'; active execution monitoring does not apply.`,
      evidence: { current_status: status },
    };
  }

  const now = Date.now();
  const latestProgress = progressHistory.length > 0 ? progressHistory[0] : null;
  const lastActiveDate = latestProgress?.created_at || project.sanction_date || project.created_at || new Date();
  const daysSinceUpdate = Math.max(0, Math.floor((now - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)));

  let overdueCompletionDays = 0;
  if (project.target_completion_date) {
    const targetTime = new Date(project.target_completion_date).getTime();
    if (now > targetTime && (Number(latestProgress?.percent_complete) || 0) < 100) {
      overdueCompletionDays = Math.floor((now - targetTime) / (1000 * 60 * 60 * 24));
    }
  }

  if (daysSinceUpdate > config.stalledProgressErrorDays) {
    return {
      rule_id: 'STALLED_PROGRESS',
      rule_category: 'TIMELINE',
      status: 'NON_COMPLIANT',
      severity: 'HIGH',
      title: 'Timeline & Execution Staleness',
      message: `Execution stalled: No physical progress update logged for ${daysSinceUpdate} days (exceeds ${config.stalledProgressErrorDays}-day threshold).`,
      evidence: {
        days_since_update: daysSinceUpdate,
        threshold_days: config.stalledProgressErrorDays,
        last_update_date: lastActiveDate,
        overdue_completion_days: overdueCompletionDays,
      },
    };
  }

  if (daysSinceUpdate > config.stalledProgressWarnDays || overdueCompletionDays > 30) {
    const reasons = [];
    if (daysSinceUpdate > config.stalledProgressWarnDays) {
      reasons.push(`no progress update for ${daysSinceUpdate} days`);
    }
    if (overdueCompletionDays > 30) {
      reasons.push(`past target completion date by ${overdueCompletionDays} days`);
    }

    return {
      rule_id: 'STALLED_PROGRESS',
      rule_category: 'TIMELINE',
      status: 'REVIEW_REQUIRED',
      severity: 'MEDIUM',
      title: 'Timeline & Execution Staleness',
      message: `Execution timeline attention: ${reasons.join(', ')}.`,
      evidence: {
        days_since_update: daysSinceUpdate,
        overdue_completion_days: overdueCompletionDays,
        target_completion_date: project.target_completion_date,
      },
    };
  }

  return {
    rule_id: 'STALLED_PROGRESS',
    rule_category: 'TIMELINE',
    status: 'COMPLIANT',
    severity: 'LOW',
    title: 'Timeline & Execution Staleness',
    message: `Project execution active and within schedule norms (last progress logged ${daysSinceUpdate} days ago).`,
    evidence: {
      days_since_update: daysSinceUpdate,
      current_percent: Number(latestProgress?.percent_complete) || 0,
      target_completion_date: project.target_completion_date || null,
    },
  };
}

module.exports = {
  evaluateStalledProgress,
};

