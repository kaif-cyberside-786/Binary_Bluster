import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import { StatusBadge } from '../components/Badge';
import Button from '../components/Button';
import ProjectDetailModal from '../components/ProjectDetailModal';

export function AgencyWorkspace() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [performanceData, setPerformanceData] = useState(null);

  const navItems = [
    { label: 'Agency Dashboard', key: 'dashboard' },
    { label: 'Performance Track Record', key: 'performance' },
    { label: 'Assigned Works', key: 'assigned' },
    { label: 'Physical Progress', key: 'progress' },
    { label: 'Utilization Certificates', key: 'ucs' },
  ];

  const fetchAgencyData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/agency');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
          const targetAgencyId =
            body.data?.agency_info?.agency_id ||
            user?.jurisdiction?.agency_id ||
            'PWD-INDORE-01';
          try {
            const perfRes = await authFetch(`/api/agencies/${targetAgencyId}/performance`);
            if (perfRes.ok) {
              const perfBody = await perfRes.json();
              if (perfBody.success) {
                setPerformanceData(perfBody.data);
              }
            }
          } catch (pErr) {
            console.warn('Could not fetch agency performance metrics:', pErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch agency dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    fetchAgencyData();
  }, [fetchAgencyData]);

  const agencyInfo = data?.agency_info || {};
  const counts = data?.counts || {};
  const assignedWorks = data?.assigned_works || [];

  return (
    <WorkspaceLayout
      roleTitle="Implementing Agency"
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
            Execution Agency • Operational Jurisdiction
          </div>
          <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
            {agencyInfo.agency_name || 'Public Works / Rural Engineering Services'}
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
            Officer: <strong>{user?.full_name}</strong> • District: <strong>{agencyInfo.district || 'Indore'}</strong>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      {(activeSection === 'dashboard' || activeSection === 'progress' || activeSection === 'ucs') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {activeSection !== 'ucs' && (
            <Card title="Assigned Works" subtitle="Active district works">
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
                {counts.assigned || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                Works in jurisdiction
              </div>
            </Card>
          )}

          {activeSection !== 'ucs' && (
            <Card title="In Progress" subtitle="Physical execution">
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-secondary)' }}>
                {counts.in_progress || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                Under construction
              </div>
            </Card>
          )}

          {activeSection !== 'ucs' && (
            <Card title="Completed Works" subtitle="Finished infrastructure">
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
                {counts.completed || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                Ready for closure
              </div>
            </Card>
          )}

          <Card title="UC Pending" subtitle="Utilization Certificate (Phase 5)">
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-muted)' }}>
              {counts.pending_uc || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              UC submission pipeline (Phase 5)
            </div>
          </Card>
        </div>
      )}

      {/* UC Submission Pipeline Dedicated Panel */}
      {activeSection === 'ucs' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="Utilization Certificates (UC) Pipeline" subtitle="Statutory compliance & expenditure accounting">
            <div style={{ padding: 'var(--space-4)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A', lineHeight: 1.6 }}>
              <strong>Phase 5 UC Submission Mandate:</strong> The Implementing Agency must furnish Utilization Certificates (UCs) to the District Authority verifying that released instalments were utilized strictly for approved project work items. Below is the list of works requiring or processing UCs.
            </div>
          </Card>
        </div>
      )}

      {/* Performance Track Record Dedicated Panel (Phase 12) */}
      {activeSection === 'performance' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card
            title={`Agency Performance Scorecard — ${agencyInfo.agency_name || 'Implementing Agency'}`}
            subtitle="Historical delivery benchmarks, cost deviations, and adverse inspection records (Phase 12)"
          >
            {performanceData?.performance ? (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Performance Score
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)', marginTop: '2px' }}>
                      {performanceData.performance.performance_score} <span style={{ fontSize: '12px', fontWeight: 500 }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                      Composite benchmark score
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Work Completion Rate
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                      {performanceData.performance.completion_rate?.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                      {performanceData.performance.completed_works} of {performanceData.performance.total_assigned_works} completed
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Average Delay
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: performanceData.performance.avg_delay_days > 45 ? 'var(--color-warning)' : 'var(--color-primary)', marginTop: '2px' }}>
                      {performanceData.performance.avg_delay_days} <span style={{ fontSize: '12px', fontWeight: 500 }}>days</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                      Average schedule variance
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Adverse Inspections
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: performanceData.performance.adverse_inspection_count > 0 ? 'var(--color-error)' : 'var(--color-success)', marginTop: '2px' }}>
                      {performanceData.performance.adverse_inspection_count}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                      Critical quality flags recorded
                    </div>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', backgroundColor: '#EDF4FC', borderRadius: '4px', fontSize: '12px', color: '#1E3A8A' }}>
                  ℹ <strong>Performance Period:</strong> {performanceData.performance.period} • Track record is factored into pre-sanction advisory rankings for District Authorities per rules.md §12.
                </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
                Loading agency performance benchmarks...
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Assigned Works Table */}
      <Card
        title={
          activeSection === 'progress'
            ? 'Physical Progress Tracking'
            : activeSection === 'ucs'
            ? 'Works Requiring Utilization Certificates'
            : 'Assigned Works List'
        }
        subtitle={
          activeSection === 'progress'
            ? 'Monitor ground progress milestones and completion status'
            : 'Works currently assigned to agency for execution'
        }
      >
        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading assigned works...
          </div>
        ) : assignedWorks.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No works currently assigned in this agency's jurisdiction.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Project ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Title</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Sanctioned Cost</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedWorks.map((p) => (
                  <tr key={p.project_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{p.project_id}</td>
                    <td style={{ padding: '10px 12px', maxWidth: '300px' }}>{p.title}</td>
                    <td style={{ padding: '10px 12px' }}>{p.category}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      ₹{(p.sanctioned_cost || p.estimated_cost || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedProjectId(p.project_id)}
                      >
                        Manage 360°
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Project 360 & Execution Modal */}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          isOpen={Boolean(selectedProjectId)}
          onClose={() => setSelectedProjectId(null)}
          onProjectUpdated={fetchAgencyData}
        />
      )}
    </WorkspaceLayout>
  );
}

export default AgencyWorkspace;
