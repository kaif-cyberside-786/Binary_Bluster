import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';

export function MinistryWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'National Dashboard', key: 'dashboard' },
    { label: 'Pan-India Overview', key: 'overview' },
    { label: 'State Distributions', key: 'states' },
    { label: 'Supervision & Policy', key: 'policy' },
  ];

  const fetchMinistryData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/ministry');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ministry dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchMinistryData();
  }, [fetchMinistryData]);

  const scale = data?.national_scale || {};
  const counts = data?.counts || {};
  const stateBreakdown = data?.state_breakdown || [];

  return (
    <WorkspaceLayout roleTitle="Ministry of Statistics & Programme Implementation" navItems={navItems}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
            National Jurisdiction • DIID / MoSPI Central Supervision
          </div>
          <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
            National MPLADS Monitoring & Supervision
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
            Supervisory Officer: <strong>{user?.full_name}</strong> ({user?.designation || 'Director, DIID'})
          </div>
        </div>
      </div>

      {/* National Scale Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Card title="Total Parliamentary Constituencies" subtitle="Official Government Database">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {scale.total_mps || 542}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Real MoSPI Government Records Ingested
          </div>
        </Card>

        <Card title="National Fund Allocation" subtitle="Cumulative Outlay">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-secondary)' }}>
            ₹{((scale.total_allocated_funds || 0) / 10000000).toFixed(0)} <span style={{ fontSize: '14px' }}>Cr</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Sanctioned: ₹{((scale.total_sanctioned_funds || 0) / 10000000).toFixed(2)} Cr
          </div>
        </Card>

        <Card title="Total Monitored Works" subtitle="Platform-wide">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {counts.total_projects || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Under Review: <strong>{counts.under_review || 0}</strong> • Sanctioned: <strong>{counts.sanctioned || 0}</strong>
          </div>
        </Card>

        <Card title="Completed Works" subtitle="National Delivery">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
            {counts.completed || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            In Progress: <strong>{counts.in_progress || 0}</strong>
          </div>
        </Card>
      </div>

      {/* State-by-State Distribution */}
      <Card title="State & UT Implementation Distribution" subtitle="Consolidated status counts across states">
        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading national data...
          </div>
        ) : stateBreakdown.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No state-level project distributions found yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>State / UT</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Total Projects</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Sanctioned Projects</th>
                </tr>
              </thead>
              <tbody>
                {stateBreakdown.map((s) => (
                  <tr key={s.state} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.state}</td>
                    <td style={{ padding: '10px 12px' }}>{s.total_projects}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-success)', fontWeight: 600 }}>{s.sanctioned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </WorkspaceLayout>
  );
}

export default MinistryWorkspace;
