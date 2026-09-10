import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import AgencyConcentrationPanel from '../components/AgencyConcentrationPanel';
import InspectionQueueCard from '../components/InspectionQueueCard';
import SystemicOverviewPanel from '../components/SystemicOverviewPanel';
import SystemicGeographicPanel from '../components/SystemicGeographicPanel';
import SystemicCategoryPanel from '../components/SystemicCategoryPanel';
import SystemicInspectionHealthPanel from '../components/SystemicInspectionHealthPanel';
import SystemicAttentionList from '../components/SystemicAttentionList';

export function StateWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [quotaData, setQuotaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  const state = user?.jurisdiction?.state || 'Madhya Pradesh';

  const navItems = [
    { label: 'State Dashboard', key: 'dashboard' },
    { label: 'Portfolio Overview', key: 'overview' },
    { label: 'District Comparisons', key: 'districts' },
    { label: 'Sectoral Patterns', key: 'categories' },
    { label: 'Agency Concentration', key: 'concentration' },
    { label: '1% Physical Inspection', key: 'inspections' },
    { label: 'Supervisory Attention', key: 'attention' },
    { label: 'State-wide Projects', key: 'projects' },
    { label: '1% Physical Inspection', key: 'inspections' },
    { label: 'District Comparisons', key: 'districts' },
  ];

  const fetchStateData = useCallback(async () => {
    try {
      const [dashRes, quotaRes] = await Promise.all([
        authFetch('/api/dashboard/state'),
        authFetch('/api/inspections/quota?level=STATE'),
      ]);
      if (dashRes.ok) {
        const body = await dashRes.json();
        if (body.success) setData(body.data);
      }
      if (quotaRes.ok) {
        const qBody = await quotaRes.json();
        if (qBody.success) setQuotaData(qBody.data);
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

      {/* 1% Inspection Mandate Panel & Live Queue */}
      {activeSection === 'inspections' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="State 1% Physical Inspection Quota" subtitle="State Nodal Authority Oversight (Guidelines §5.2)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>ELIGIBLE WORKS (STATEWIDE)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {quotaData ? quotaData.eligible_works : counts.total || 0}
                </div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>1% STATUTORY TARGET</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '4px' }}>
                  {quotaData ? quotaData.target_count : inspections.target_1_percent || 1} works
                </div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>COMPLETED INSPECTIONS</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
                  {quotaData ? quotaData.completed_count : inspections.completed || 0}
                </div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>REMAINING TO INSPECT</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '4px' }}>
                  {quotaData ? quotaData.remaining_count : Math.max(0, (inspections.target_1_percent || 1) - (inspections.completed || 0))}
                </div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>QUOTA PROGRESS</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {quotaData ? quotaData.progress_percentage : inspections.percentage || 0}%
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${quotaData ? quotaData.progress_percentage : inspections.percentage || 0}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-secondary)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: 'var(--space-4)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A', lineHeight: 1.6 }}>
              <strong>Statutory Requirement (Guidelines §5.2):</strong> State Nodal Department officers are required to physically inspect at least 1% of works implemented in each district annually. Field inspections by state teams benchmark quality, adherence to administrative approvals, and coordinate with District Collectors to resolve bottleneck issues.
            </div>
          </Card>

          {/* Systemic Inspection Health Metrics */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <SystemicInspectionHealthPanel authFetch={authFetch} state={state} />
          </div>

          {/* Statewide Prioritized Field Inspection Queue */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <InspectionQueueCard
              title="Statewide Prioritized Field Inspection Queue"
              subtitle={`Supervisory inspection candidates across ${state} districts`}
              readOnly={true}
            />
          </div>
        </div>
      )}

      {/* State Portfolio Overview & Value-at-Risk */}
      {(activeSection === 'overview' || activeSection === 'dashboard') && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicOverviewPanel authFetch={authFetch} scope="state" state={state} />
        </div>
      )}

      {/* District Comparisons Geographic Panel */}
      {activeSection === 'districts' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicGeographicPanel authFetch={authFetch} scope="state" defaultState={state} />
        </div>
      )}

      {/* Sectoral & Category Patterns */}
      {activeSection === 'categories' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicCategoryPanel authFetch={authFetch} state={state} />
        </div>
      )}

      {/* Supervisory Attention List */}
      {activeSection === 'attention' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicAttentionList authFetch={authFetch} state={state} />
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
      {(activeSection === 'dashboard' || activeSection === 'projects' || activeSection === 'districts') && (
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
      )}
    </WorkspaceLayout>
  );
}

export default StateWorkspace;
