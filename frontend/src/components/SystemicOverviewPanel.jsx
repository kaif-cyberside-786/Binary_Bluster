import React, { useState, useEffect } from 'react';
import Card from './Card';
import { RiskBadge, StatusBadge } from './Badge';

export function SystemicOverviewPanel({ authFetch, scope = 'ministry', state = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        const query = state ? `?state=${encodeURIComponent(state)}` : '';
        const res = await authFetch(`/api/systemic/overview${query}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (isMounted) {
          setData(json.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, [authFetch, state]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading systemic portfolio overview...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          backgroundColor: '#FFF0ED',
          border: '1px solid #F7C6C1',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
        }}
      >
        <strong>Error loading portfolio overview:</strong> {error}
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const varData = metrics.value_at_risk || {};
  const riskDist = metrics.risk_distribution || {};
  const statusDist = metrics.status_distribution || {};

  const formatCurrency = (val = 0) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="systemic-overview-panel">
      {/* Supervisory Header Banner */}
      <div
        style={{
          padding: 'var(--space-4)',
          backgroundColor: '#EDF4FC',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
            {data?.scope === 'ministry' ? 'National Portfolio Intelligence • Pan-India Rollup' : `State Portfolio Intelligence • ${data?.state}`}
          </div>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-primary)', marginTop: '2px' }}>
            Systemic Risk & Value-at-Risk Supervisory Summary
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          Updated: {data?.updated_at ? new Date(data.updated_at).toLocaleTimeString() : 'Live'}
        </div>
      </div>

      {/* Top-line KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Card title="Total Monitored Outlay" subtitle="Cumulative Portfolio Value">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatCurrency(metrics.total_outlay_value)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Total Works: <strong>{metrics.total_projects || 0}</strong> (Active: <strong>{metrics.active_works || 0}</strong>)
          </div>
        </Card>

        <Card title="Portfolio Value-at-Risk" subtitle="HIGH Risk + Non-Compliant (Deduplicated)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-error)' }}>
            {formatCurrency(varData.total_at_risk_value)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Exposure Rate: <strong>{varData.at_risk_percentage || 0}%</strong> of total monitored outlay
          </div>
        </Card>

        <Card title="High-Risk Project Rate" subtitle="Authoritative Phase 9 Risk Signal">
          <div style={{ fontSize: '26px', fontWeight: 700, color: (metrics.high_risk_rate || 0) > 15 ? 'var(--color-error)' : 'var(--color-secondary)' }}>
            {metrics.high_risk_rate || 0}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            HIGH: <strong>{riskDist.HIGH || 0}</strong> • MEDIUM: <strong>{riskDist.MEDIUM || 0}</strong> • LOW: <strong>{riskDist.LOW || 0}</strong>
          </div>
        </Card>

        <Card title="Average AI Risk Score" subtitle="Portfolio Average (0–100)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {metrics.average_risk_score !== null ? `${metrics.average_risk_score}/100` : 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Assessed Works: <strong>{riskDist.assessed_count || 0}</strong> of {metrics.total_projects || 0}
          </div>
        </Card>
      </div>

      {/* Breakdown Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Risk Distribution Breakdown */}
        <Card title="Phase 9 Risk Distribution" subtitle="Authoritative project-level risk banding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RiskBadge level="HIGH" score={null} />
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>Critical / High Risk Exposure</span>
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--color-error)' }}>{riskDist.HIGH || 0} works</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RiskBadge level="MEDIUM" score={null} />
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>Moderate Monitoring Required</span>
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--color-warning)' }}>{riskDist.MEDIUM || 0} works</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RiskBadge level="LOW" score={null} />
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>Low Risk / Normal Progression</span>
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--color-success)' }}>{riskDist.LOW || 0} works</strong>
            </div>
            {riskDist.UNASSESSED > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Unassessed / Pending Analysis</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{riskDist.UNASSESSED} works</strong>
              </div>
            )}
          </div>
        </Card>

        {/* Project Lifecycle Distribution */}
        <Card title="Project Lifecycle Distribution" subtitle="Canonical status breakdown across monitored works">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {Object.entries(statusDist).map(([statusKey, count]) => (
              <div
                key={statusKey}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                }}
              >
                <StatusBadge status={statusKey} />
                <span style={{ fontWeight: 700, marginLeft: '6px' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SystemicOverviewPanel;

