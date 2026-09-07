import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import { StatusBadge } from '../components/Badge';

export function AuditorWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Audit Dashboard', key: 'dashboard' },
    { label: 'Decision Audit Trail', key: 'decisions' },
    { label: 'Permanent Log Records', key: 'logs' },
    { label: 'Integrity Verification', key: 'integrity' },
  ];

  const fetchAuditorData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/auditor');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auditor dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAuditorData();
  }, [fetchAuditorData]);

  const metrics = data?.audit_metrics || {};
  const recentDecisions = data?.recent_decisions || [];

  return (
    <WorkspaceLayout roleTitle="Independent Auditor" navItems={navItems}>
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
            Independent Oversight • Statutory CAG / MoSPI Internal Audit
          </div>
          <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
            {user?.full_name}
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
            Designation: <strong>{user?.designation || 'Senior Audit Officer'}</strong> • Read-Only Audit Clearance
          </div>
        </div>
      </div>

      {/* Audit Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Card title="Projects Monitored" subtitle="Permanent registry">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {metrics.total_projects || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Total project lifecycles
          </div>
        </Card>

        <Card title="Decisions Recorded" subtitle="Official actions">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-secondary)' }}>
            {metrics.total_decisions || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Append-only decision records
          </div>
        </Card>

        <Card title="Audit Log Entries" subtitle="Immutable security trail">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
            {metrics.total_audit_logs || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Write-once ledger entries
          </div>
        </Card>

        <Card title="Inspections Logged" subtitle="Physical verification">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {metrics.total_inspections || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Ground inspections tracked
          </div>
        </Card>
      </div>

      {/* Recent Official Decisions Audit Trail */}
      <Card title="Recent Administrative Decisions Log" subtitle="Cryptographically captured administrative decisions with mandatory reasoning">
        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading audit records...
          </div>
        ) : recentDecisions.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No administrative decisions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Decision ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Project ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Decision</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Reason</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Transition</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Officer</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((d) => (
                  <tr key={d.decision_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{d.decision_id}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{d.project_id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-secondary)' }}>{d.decision}</td>
                    <td style={{ padding: '10px 12px', maxWidth: '240px', fontSize: '12px' }}>{d.reason}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{d.previous_state}</span>
                      <span style={{ margin: '0 4px' }}>→</span>
                      <StatusBadge status={d.new_state} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>{d.officer_id}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(d.decided_at).toLocaleString('en-IN')}
                    </td>
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

export default AuditorWorkspace;
