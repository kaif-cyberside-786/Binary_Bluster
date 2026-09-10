import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import AgencyConcentrationPanel from '../components/AgencyConcentrationPanel';
import SystemicOverviewPanel from '../components/SystemicOverviewPanel';
import SystemicGeographicPanel from '../components/SystemicGeographicPanel';
import SystemicCategoryPanel from '../components/SystemicCategoryPanel';
import SystemicInspectionHealthPanel from '../components/SystemicInspectionHealthPanel';
import SystemicAttentionList from '../components/SystemicAttentionList';

export function MinistryWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  const navItems = [
    { label: 'National Dashboard', key: 'dashboard' },
    { label: 'Portfolio Overview', key: 'overview' },
    { label: 'Geographic Breakdown', key: 'geographic' },
    { label: 'Sectoral & Categories', key: 'categories' },
    { label: 'Agency Concentration', key: 'agency-concentration' },
    { label: 'State Distributions', key: 'states' },
    { label: 'Inspection System Health', key: 'inspections' },
    { label: 'Supervisory Attention List', key: 'attention' },
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
    <WorkspaceLayout
      roleTitle="Ministry of Statistics & Programme Implementation"
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
      {(activeSection === 'dashboard' || activeSection === 'overview') && (
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
              {loading ? '...' : (counts.total_projects || 0)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              {loading ? (
                'Syncing national portfolio...'
              ) : counts.total_projects === 0 ? (
                <span style={{ fontStyle: 'italic' }}>No projects currently logged across state databases</span>
              ) : (
                <>Under Review: <strong>{counts.under_review || 0}</strong> • Sanctioned: <strong>{counts.sanctioned || 0}</strong></>
              )}
            </div>
          </Card>

          <Card title="Completed Works" subtitle="National Delivery">
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
              {loading ? '...' : (counts.completed || 0)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              {loading ? (
                'Loading status...'
              ) : counts.total_projects === 0 ? (
                <span style={{ fontStyle: 'italic' }}>Awaiting initial project completions</span>
              ) : (
                <>In Progress: <strong>{counts.in_progress || 0}</strong></>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Policy & Supervision Guidelines Panel */}
      {activeSection === 'policy' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="Central Supervision & Policy Framework" subtitle="MoSPI DIID Oversight Protocols">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>10% District Authority Quota</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>Mandatory field verification of at least 10% sanctioned works by District Collector (§5.2).</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>1% State Nodal Quota</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>State planning department annual physical inspection quota across districts (§5.2).</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>Advisory AI Governance</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>Strict adherence to Rule §12: AI risk scores advise, only authorized human officers decide.</div>
              </div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A' }}>
              ✓ Central Supervision Active: DIID maintains continuous oversight of fund flow, execution milestones, and audit compliance across all States and Union Territories.
            </div>
          </Card>
        </div>
      )}

      {/* Portfolio Overview & Value-at-Risk */}
      {(activeSection === 'overview' || activeSection === 'dashboard') && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicOverviewPanel authFetch={authFetch} scope="ministry" />
        </div>
      )}

      {/* Geographic Breakdown Panel */}
      {activeSection === 'geographic' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicGeographicPanel authFetch={authFetch} scope="ministry" />
        </div>
      )}

      {/* Sectoral & Category Patterns */}
      {activeSection === 'categories' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicCategoryPanel authFetch={authFetch} />
        </div>
      )}

      {/* Inspection System Health */}
      {activeSection === 'inspections' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicInspectionHealthPanel authFetch={authFetch} />
        </div>
      )}

      {/* Supervisory Attention List */}
      {activeSection === 'attention' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SystemicAttentionList authFetch={authFetch} />
        </div>
      )}

      {/* Agency Concentration Systemic Analytics Panel (Phase 12, PRD §12.7) */}
      {(activeSection === 'agency-concentration' || activeSection === 'concentration' || activeSection === 'dashboard') && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <AgencyConcentrationPanel
            district="Indore"
            state="Madhya Pradesh"
            year="2026"
            authFetch={authFetch}
          />
        </div>
      )}

      {/* State-by-State Distribution */}
      {(activeSection === 'dashboard' || activeSection === 'states') && (
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
      )}
    </WorkspaceLayout>
  );
}

export default MinistryWorkspace;
