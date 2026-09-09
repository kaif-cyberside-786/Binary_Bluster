import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { RiskBadge } from './Badge';
import Button from './Button';

/**
 * ExecutionMonitoringCard Component (Phase 11)
 * Continuous post-sanction execution monitoring dashboard:
 * - Payment vs Physical Progress discrepancy gap comparison
 * - Abnormal progress jumps and timeline staleness
 * - Advisory recommendations and human-in-the-loop safeguards
 */
export default function ExecutionMonitoringCard({ projectId, onMonitoringUpdated = null }) {
  const { authFetch } = useAuth();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchMonitoring = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/projects/${projectId}/monitoring`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch execution monitoring telemetry');
      }
      setTelemetry(body.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch]);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  const handleReevaluate = async () => {
    if (!projectId) return;
    try {
      setEvaluating(true);
      setError(null);
      setActionMessage(null);
      const res = await authFetch(`/api/projects/${projectId}/monitoring/evaluate`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to re-evaluate execution monitoring');
      }
      setTelemetry(body.data);
      setActionMessage({ type: 'success', text: 'Execution monitoring evaluated successfully.' });
      if (onMonitoringUpdated) onMonitoringUpdated(body.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading && !telemetry) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
        Loading execution monitoring telemetry...
      </div>
    );
  }

  if (error && !telemetry) {
    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#FDE8E8',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          border: '1px solid #F98080',
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  const metrics = telemetry?.execution_metrics || {};
  const timeline = metrics.timeline || {};
  const jumps = metrics.progress_jumps || {};
  const risk = telemetry?.risk || {};
  const advisory = telemetry?.advisory_recommendation || {};

  const finPct = metrics.financial_disbursed_percent || 0.0;
  const physPct = metrics.physical_progress_percent || 0.0;
  const gap = metrics.discrepancy_gap_percent !== undefined ? metrics.discrepancy_gap_percent : (finPct - physPct);
  const isHighGap = metrics.mismatch_severity === 'HIGH' || gap >= 35.0;
  const isMediumGap = metrics.mismatch_severity === 'MEDIUM' || (gap >= 15.0 && gap < 35.0);

  const gapColor = isHighGap ? 'var(--color-error)' : isMediumGap ? 'var(--color-warning)' : 'var(--color-success)';
  const gapBg = isHighGap ? '#FDE8E8' : isMediumGap ? '#FEF08A' : '#DEF7EC';

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Phase 11 Continuous Execution Monitoring
          </div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', color: 'var(--color-primary)' }}>
            Physical Execution & Payment Consistency
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RiskBadge level={risk.risk_level || 'LOW'} score={risk.overall_score} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleReevaluate}
            loading={evaluating}
            disabled={evaluating}
            style={{ fontSize: '11px', padding: '2px 8px', height: '28px' }}
          >
            {evaluating ? 'Evaluating...' : '↻ Refresh Monitoring'}
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#DEF7EC',
            color: '#03543F',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            border: '1px solid #31C48D',
          }}
        >
          ✓ {actionMessage.text}
        </div>
      )}

      {/* Metric 1: Physical vs Financial Pace Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          backgroundColor: '#F8FAFC',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Physical Progress
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
            {physPct}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Stage: <strong>{metrics.current_stage || 'IN_PROGRESS'}</strong>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#E2E8F0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, physPct)}%`,
                height: '100%',
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Financial Disbursed
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '2px' }}>
            {finPct}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            ₹{(metrics.financial_disbursed_amount || 0).toLocaleString('en-IN')} of ₹{(telemetry?.sanctioned_cost || 0).toLocaleString('en-IN')}
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#E2E8F0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, finPct)}%`,
                height: '100%',
                backgroundColor: 'var(--color-secondary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Discrepancy Gap
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: gapColor }}>
              {gap > 0 ? `+${gap}%` : `${gap}%`}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: gapBg,
                color: gapColor,
              }}
            >
              {metrics.mismatch_severity || 'LOW'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
            {isHighGap
              ? 'Payment pace substantially outruns execution'
              : isMediumGap
              ? 'Moderate pace divergence'
              : 'Pace aligned within tolerances'}
          </div>
        </div>
      </div>

      {/* Abnormal Progress Jumps Alert */}
      {jumps.has_abnormal_jump && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FFF8E6',
            border: '1px solid #F2DC9B',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: '#8A6100',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>
            ⚠ Abnormal Progress Velocity Warning ({jumps.jump_severity || 'HIGH'})
          </div>
          <div>{jumps.jump_message}</div>
        </div>
      )}

      {/* Timeline & Staleness Status */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '10px 14px',
          backgroundColor: timeline.is_delayed ? '#FFF5F5' : '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${timeline.is_delayed ? '#FED7D7' : 'var(--color-border)'}`,
          fontSize: '12px',
          color: 'var(--color-text)',
        }}
      >
        <div>
          <span style={{ color: 'var(--color-muted)' }}>Days Since Last Report: </span>
          <strong>{timeline.days_since_last_progress !== null ? `${timeline.days_since_last_progress} days` : 'None logged'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-muted)' }}>Elapsed Since Sanction: </span>
          <strong>{timeline.days_since_sanction !== null ? `${timeline.days_since_sanction} days` : '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-muted)' }}>Timeline Status: </span>
          <strong style={{ color: timeline.is_delayed ? 'var(--color-error)' : 'var(--color-success)' }}>
            {timeline.is_delayed ? `Overdue (${timeline.overdue_days || 0} days)` : 'Within Scheduled Interval'}
          </strong>
        </div>
      </div>

      {/* Advisory Recommendation Card */}
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: isHighGap ? '#FDF2F2' : '#F0F9FF',
          border: `1px solid ${isHighGap ? '#F8B4B4' : '#BEE3F8'}`,
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: isHighGap ? '#9B1C1C' : '#2B6CB0' }}>
            Advisory Recommendation: {advisory.action?.replace(/_/g, ' ') || 'CONTINUE MONITORING'}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text)', lineHeight: 1.5, marginBottom: '6px' }}>
          {advisory.text || metrics.mismatch_message}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontStyle: 'italic' }}>
          {advisory.disclaimer || 'Advisory Only — Administrative Discretion Required per Rules §12.'}
        </div>
      </div>
    </div>
  );
}

