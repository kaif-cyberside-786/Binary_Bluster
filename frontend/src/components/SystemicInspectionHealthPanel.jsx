import React, { useState, useEffect } from 'react';
import Card from './Card';

export function SystemicInspectionHealthPanel({ authFetch, state = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchInspectionHealth() {
      setLoading(true);
      setError(null);
      try {
        const query = state ? `?state=${encodeURIComponent(state)}` : '';
        const res = await authFetch(`/api/systemic/inspections${query}`);
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
    fetchInspectionHealth();
    return () => {
      isMounted = false;
    };
  }, [authFetch, state]);

  const lifecycle = data?.lifecycle_distribution || {};
  const results = data?.results_distribution || {};
  const priorities = data?.priority_distribution || {};
  const quota = data?.statutory_1_percent_quota || {};

  return (
    <div className="systemic-inspection-health-panel">
      {/* Statutory 1% Quota Banner */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Card
          title="State 1% Physical Inspection Quota Oversight"
          subtitle="Mandatory annual inspection quota under MPLADS Operational Guidelines §5.2"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Eligible Sanctioned Works</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                {quota.eligible_works || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>1% Statutory Target</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-secondary)' }}>
                {quota.statutory_target || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Completed Inspections</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>
                {quota.completed_count || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Quota Fulfillment Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                {quota.progress_percentage || 0}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              backgroundColor: '#E2E8F0',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, quota.progress_percentage || 0)}%`,
                height: '100%',
                backgroundColor: (quota.progress_percentage || 0) >= 100 ? 'var(--color-success)' : 'var(--color-secondary)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </Card>
      </div>

      {/* Grid of Inspection Lifecycle & Outcomes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Canonical 7-stage Lifecycle */}
        <Card title="Canonical Lifecycle Distribution" subtitle="Active field verification progression">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-2)' }}>
            {Object.entries(lifecycle).map(([stKey, count]) => (
              <div
                key={stKey}
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
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{stKey}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Inspection Results */}
        <Card title="Inspection Results & Outcomes" subtitle="Ground verification findings recorded by authorized officers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-2)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: '#EAF6EC',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#1E7A34' }}>NO ISSUE</span>
              <strong style={{ color: '#1E7A34' }}>{results.NO_ISSUE || 0} works</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: '#FFF8E6',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#8A6100' }}>REVIEW REQUIRED</span>
              <strong style={{ color: '#8A6100' }}>{results.REVIEW_REQUIRED || 0} works</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: '#FFF0ED',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#B3261E' }}>ESCALATE</span>
              <strong style={{ color: '#B3261E' }}>{results.ESCALATE || 0} works</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--color-muted)' }}>PENDING OUTCOME</span>
              <strong>{results.PENDING || 0} works</strong>
            </div>
          </div>
        </Card>

        {/* Priority Tiers */}
        <Card title="Inspection Priority Tiers" subtitle="Composite operational targeting (Risk + Compliance + Execution + Officer)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>URGENT (≥75)</span>
              <strong>{priorities.URGENT || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px' }}>
              <span style={{ color: '#C05621', fontWeight: 600 }}>HIGH (50–74)</span>
              <strong>{priorities.HIGH || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>MEDIUM (25–49)</span>
              <strong>{priorities.MEDIUM || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>ROUTINE (&lt;25)</span>
              <strong>{priorities.ROUTINE || 0}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SystemicInspectionHealthPanel;

