import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import { StatusBadge } from '../components/Badge';
import ProjectDetailModal from '../components/ProjectDetailModal';
import AiHistoricalIntelligencePanel from '../components/AiHistoricalIntelligencePanel';

export function DistrictWorkspace() {
  const { user, authFetch } = useAuth();
  const { tablePageSize } = usePreferences();

  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Status filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 360 view modal state
  const [selected360ProjectId, setSelected360ProjectId] = useState(null);

  // Decision modal state
  const [reviewProject, setReviewProject] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [assignedAgencyId, setAssignedAgencyId] = useState('PWD-INDORE-01');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const district = user?.jurisdiction?.district || 'Indore';
  const state = user?.jurisdiction?.state || 'Madhya Pradesh';

  const navItems = [
    { label: 'District Dashboard', key: 'dashboard' },
    { label: 'Pending Review Queue', key: 'queue' },
    { label: 'Sanctioned Projects', key: 'sanctioned' },
    { label: '10% Inspection Quota', key: 'inspections' },
    { label: 'Works Inventory', key: 'inventory' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/district');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setDashboardData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch district dashboard:', err);
    }
  }, [authFetch]);

  const fetchProjects = useCallback(async () => {
    try {
      let url = `/api/projects?limit=50`;
      if (statusFilter && statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setProjects(body.data.items || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch district projects:', err);
    }
  }, [authFetch, statusFilter]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchDashboardData(), fetchProjects()]);
      } catch (err) {
        setError('Failed to load district data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [fetchDashboardData, fetchProjects]);

  const handleOpenReview = (p) => {
    setReviewProject(p);
    setDecisionReason('');
    setAssignedAgencyId(p.implementing_agency_id || 'PWD-INDORE-01');
    setModalError(null);
  };

  const handleDecision = async (decisionType) => {
    if (!decisionReason || decisionReason.trim().length < 5) {
      setModalError('Substantive administrative reason is required (minimum 5 characters).');
      return;
    }

    try {
      setDecisionSubmitting(true);
      setModalError(null);

      const res = await authFetch(`/api/projects/${reviewProject.project_id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision: decisionType,
          reason: decisionReason.trim(),
          implementing_agency_id: assignedAgencyId,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to record decision.');
      }

      // Close modal and notify
      setReviewProject(null);
      setSuccessMessage(`Decision '${decisionType}' recorded for ${reviewProject.project_id}. Status updated.`);
      setTimeout(() => setSuccessMessage(null), 6000);

      // Refresh data
      await Promise.all([fetchDashboardData(), fetchProjects()]);
    } catch (err) {
      setModalError(err.message || 'Error recording decision.');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const counts = dashboardData?.counts || {};
  const financial = dashboardData?.financial || {};
  const inspections = dashboardData?.inspections || {};
  const pendingQueue = dashboardData?.pending_queue || [];

  return (
    <WorkspaceLayout roleTitle="District Authority" navItems={navItems}>
      {/* Alert Notices */}
      {successMessage && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#EAF6EC',
            color: 'var(--color-success)',
            border: '1px solid #B3DFBA',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-4)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FDECEB',
            color: 'var(--color-error)',
            border: '1px solid #F8B4AF',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* District Authority Header Card */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
              District Jurisdiction • {user?.designation || 'District Collector & Magistrate'}
            </div>
            <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
              {user?.full_name}
            </h2>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
              District: <strong>{district}</strong> • State: <strong>{state}</strong> • Operational Authority
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                const queueElem = document.getElementById('review-queue-section');
                if (queueElem) queueElem.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Review Pending Queue ({counts.pending_review || 0})
            </Button>
          </div>
        </div>
      </div>

      {/* Workload Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Card title="Awaiting Review" subtitle="MP Recommendations">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-warning)' }}>
            {counts.pending_review || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Pending Value: ₹{((financial.pending_estimated_cost || 0) / 100000).toFixed(2)} Lakh
          </div>
        </Card>

        <Card title="Sanctioned Active" subtitle="Execution phase">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
            {counts.sanctioned || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Sanctioned Value: ₹{((financial.total_sanctioned_cost || 0) / 100000).toFixed(2)} Lakh
          </div>
        </Card>

        <Card title="Needs Clarification / Held" subtitle="Exceptions requiring response">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-error)' }}>
            {counts.clarification_or_held || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Flagged for MP response
          </div>
        </Card>

        <Card title="10% Statutory Inspection" subtitle="DA Mandatory Quota">
          <div style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '4px' }}>
            Completed: <strong>{inspections.completed || 0} of {inspections.target_10_percent || 1}</strong>
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
            Target: 10% of total sanctioned works
          </div>
        </Card>
      </div>

      {/* Pending Recommendations Queue Section */}
      <div id="review-queue-section" style={{ marginBottom: 'var(--space-6)' }}>
        <Card title="Pending Recommendations Queue" subtitle="New proposals awaiting administrative review and sanction">
          {pendingQueue.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
              ✓ No pending recommendations requiring District review at this time.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Project ID</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Work Title</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Category</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Estimated Cost</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Recommended Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.map((p) => (
                    <tr key={p.project_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{p.project_id}</td>
                      <td style={{ padding: '12px', maxWidth: '300px', fontWeight: 500 }}>{p.title}</td>
                      <td style={{ padding: '12px' }}>{p.category}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        ₹{(p.estimated_cost || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenReview(p)}
                          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                        >
                          Review & Decide
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* District Works Inventory with Filter */}
      <Card
        title="District Works Inventory"
        subtitle={`All projects within ${district} District`}
      >
        {/* Status Filter Bar */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {['ALL', 'DISTRICT_REVIEW', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'HELD', 'CLARIFICATION_REQUIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: statusFilter === st ? 'var(--color-primary)' : 'var(--color-surface)',
                color: statusFilter === st ? '#FFFFFF' : 'var(--color-text)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading district inventory...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No projects found matching filter '{statusFilter}'.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Project ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Title</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Cost</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
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
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelected360ProjectId(p.project_id)}
                      >
                        View 360°
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* District Decision Action Modal */}
      {reviewProject && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>District Review & Sanction</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Project: <code>{reviewProject.project_id}</code> • Current Status: <StatusBadge status={reviewProject.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewProject(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 'var(--space-5)' }}>
              {modalError && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: '#FDECEB',
                    color: 'var(--color-error)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  ⚠ {modalError}
                </div>
              )}

              {/* Project Brief */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div>
                  <strong>Title:</strong> {reviewProject.title}
                </div>
                <div>
                  <strong>Category:</strong> {reviewProject.category} • <strong>MP ID:</strong> <code>{reviewProject.mp_id}</code>
                </div>
                <div>
                  <strong>Estimated Outlay:</strong> ₹{(reviewProject.estimated_cost || 0).toLocaleString('en-IN')}
                </div>
                <div>
                  <strong>Location:</strong> {district} District, {state}
                </div>
              </div>

              {/* AI Historical Intelligence & Risk Signals */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <AiHistoricalIntelligencePanel
                  projectId={reviewProject.project_id}
                  initialFlags={[]}
                  onAnalysisCompleted={() => {
                    fetchProjects();
                  }}
                />
              </div>

              {/* Implementing Agency Assignment */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
                  Assign Implementing Agency (On Sanction)
                </label>
                <select
                  value={assignedAgencyId}
                  onChange={(e) => setAssignedAgencyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="PWD-INDORE-01">Public Works Department (PWD-INDORE-01 / AG-PWD-01)</option>
                  <option value="RES-INDORE-01">Rural Engineering Services (RES-INDORE-01)</option>
                  <option value="CPWD-INDORE-01">Central Public Works Department (CPWD)</option>
                  <option value="MP-RDC-01">MP Road Development Corporation (MP-RDC)</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  Designated public agency responsible for technical sanction, physical progress milestones, and utilization certificates.
                </div>
              </div>

              {/* Mandatory Reason Input */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
                  Official Administrative Reason (Mandatory per Rules §4) <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={4}
                  placeholder="Enter substantive administrative justification, technical scrutiny remarks, or clarification details..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  All decisions are cryptographically recorded in the permanent append-only audit trail with official timestamp and actor ID.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReviewProject(null)}
                  disabled={decisionSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleDecision('REQUEST_CLARIFICATION')}
                  disabled={decisionSubmitting}
                  style={{
                    color: 'var(--color-secondary)',
                    borderColor: 'var(--color-secondary)',
                  }}
                >
                  Request Clarification
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleDecision('HOLD')}
                  disabled={decisionSubmitting}
                  style={{
                    color: '#B8860B',
                    borderColor: '#B8860B',
                  }}
                >
                  Hold Recommendation
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleDecision('SANCTION')}
                  disabled={decisionSubmitting}
                  style={{
                    backgroundColor: 'var(--color-success)',
                    borderColor: 'var(--color-success)',
                  }}
                >
                  {decisionSubmitting ? 'Processing...' : '✓ Sanction Work'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project 360 & Disbursements Modal */}
      {selected360ProjectId && (
        <ProjectDetailModal
          projectId={selected360ProjectId}
          isOpen={Boolean(selected360ProjectId)}
          onClose={() => setSelected360ProjectId(null)}
          onProjectUpdated={() => {
            fetchDashboardData();
            fetchProjects();
          }}
        />
      )}
    </WorkspaceLayout>
  );
}

export default DistrictWorkspace;
