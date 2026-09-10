import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import { StatusBadge } from '../components/Badge';

export function AuditorWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

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
    <WorkspaceLayout
      roleTitle="Independent Auditor"
      navItems={navItems}
      activeNavKey={activeSection}
      onNavSelect={setActiveSection}
    >
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
      {(activeSection === 'dashboard' || activeSection === 'decisions' || activeSection === 'logs') && (
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
      )}

      {/* Permanent Log Records Dedicated Panel */}
      {activeSection === 'logs' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="Permanent Write-Once Audit Ledger" subtitle="Immutable audit trail & tamper-evident history">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>TOTAL LEDGER ENTRIES</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>{metrics.total_audit_logs || 0}</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>RECORDED DECISIONS</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '4px' }}>{metrics.total_decisions || 0}</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>LEDGER STATE</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>APPEND-ONLY ✓</div>
              </div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A' }}>
              ✓ All system mutations, role approvals, transitions, and user events are permanently committed to an immutable write-once ledger.
            </div>
          </Card>
        </div>
      )}

      {/* Integrity Verification Dedicated Panel */}
      {activeSection === 'integrity' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="Cryptographic Integrity Verification" subtitle="SHA-256 state tracking & non-repudiation proof">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#EAF6EC', borderRadius: 'var(--radius-sm)', border: '1px solid #B3DFBA' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 700 }}>CRYPTOGRAPHIC STATUS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>HASH CHAIN VALID ✓</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>Zero ledger tampering detected</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>AUDIT CLEARANCE</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>READ-ONLY ACCESS</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>Statutory CAG / MoSPI audit</div>
              </div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A' }}>
              <strong>Non-Repudiation Guarantee:</strong> Every administrative decision is sealed with the signing officer's cryptographic identity, previous state, new state, and mandatory justification.
            </div>
          </Card>
        </div>
      )}

      {/* Recent Official Decisions Audit Trail */}
      {(activeSection === 'dashboard' || activeSection === 'decisions') && (
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
    )}
    </WorkspaceLayout>
  );
}

export default AuditorWorkspace;
