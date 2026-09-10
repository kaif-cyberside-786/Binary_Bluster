import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import AgencyConcentrationPanel from '../components/AgencyConcentrationPanel';

export function StateWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  const state = user?.jurisdiction?.state || 'Madhya Pradesh';

  const navItems = [
    { label: 'State Dashboard', key: 'dashboard' },
    { label: 'Agency Concentration', key: 'concentration' },
    { label: 'State-wide Projects', key: 'projects' },
    { label: '1% Physical Inspection', key: 'inspections' },
    { label: 'District Comparisons', key: 'districts' },
  ];

  const fetchStateData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/state');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch state dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStateData();
  }, [fetchStateData]);

  const counts = data?.counts || {};
  const inspections = data?.inspections || {};
  const districtRollups = data?.district_rollups || [];

  return (
    <WorkspaceLayout
      roleTitle="State Nodal Authority"
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
            State Jurisdiction • Planning Department
          </div>
          <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
            State of {state}
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
            State Nodal Officer: <strong>{user?.full_name}</strong> • Mandatory 1% Physical Inspection Oversight
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      {(activeSection === 'dashboard' || activeSection === 'projects' || activeSection === 'inspections') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Card title="Total Works" subtitle="State-wide">
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {counts.total || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              Across all districts in {state}
            </div>
          </Card>

          <Card title="Sanctioned Outlay" subtitle="Approved works">
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
              ₹{((data?.total_sanctioned_cost || 0) / 10000000).toFixed(2)} <span style={{ fontSize: '14px' }}>Cr</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              Active Sanctioned: <strong>{counts.sanctioned || 0}</strong>
            </div>
          </Card>

          <Card title="Completed Works" subtitle="Physical completion">
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-secondary)' }}>
              {counts.completed || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              In Progress: <strong>{counts.in_progress || 0}</strong>
            </div>
          </Card>

          <Card title="1% Physical Inspection Quota" subtitle="State Mandate (§5.2)">
            <div style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '4px' }}>
              Completed: <strong>{inspections.completed || 0} of {inspections.target_1_percent || 1}</strong>
            </div>
            <div style={{ height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${inspections.percentage || 0}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-secondary)',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '6px' }}>
              State Nodal Team annual inspection target
            </div>
          </Card>
        </div>
      )}

      {/* 1% Inspection Mandate Panel */}
      {activeSection === 'inspections' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="1% Physical Inspection Quota Details" subtitle="State Nodal Authority Oversight (§5.2)">
            <div style={{ padding: 'var(--space-4)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A', lineHeight: 1.6 }}>
              <strong>Statutory Requirement (Guidelines §5.2):</strong> State Nodal Department officers are required to physically inspect at least 1% of works implemented in each district annually. Field inspections by state teams benchmark quality, adherence to administrative approvals, and coordinate with District Collectors to resolve bottleneck issues.
            </div>
          </Card>
        </div>
      )}

      {/* Agency Concentration Systemic Analytics Panel (Phase 12, PRD §12.7) */}
      {(activeSection === 'concentration' || activeSection === 'dashboard') && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <AgencyConcentrationPanel
            district="Indore"
            state={state}
            year="2026"
            authFetch={authFetch}
          />
        </div>
      )}

      {/* District Comparisons Table */}
      <Card
        title={
          activeSection === 'districts'
            ? 'District-wise Implementation Comparisons'
            : activeSection === 'projects'
            ? 'State-wide Projects by District'
            : 'District-wise Implementation Breakdown'
        }
        subtitle={`Distribution of projects across ${state} districts`}
      >
        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading state data...
          </div>
        ) : districtRollups.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No project records found for districts in {state}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>District</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Total Works</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Under Review</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Sanctioned</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {districtRollups.map((d) => (
                  <tr key={d.district} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{d.district}</td>
                    <td style={{ padding: '10px 12px' }}>{d.total}</td>
                    <td style={{ padding: '10px 12px', color: '#B8860B', fontWeight: 600 }}>{d.pending}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-success)', fontWeight: 600 }}>{d.sanctioned}</td>
                    <td style={{ padding: '10px 12px' }}>{d.completed}</td>
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

export default StateWorkspace;
