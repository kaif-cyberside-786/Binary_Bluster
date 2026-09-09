import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './Badge';
import Button from './Button';
import AiHistoricalIntelligencePanel from './AiHistoricalIntelligencePanel';

export function ProjectDetailModal({
  projectId,
  isOpen,
  onClose,
  onProjectUpdated,
}) {
  const { user, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Sub-forms toggle
  const [showDprForm, setShowDprForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUcForm, setShowUcForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  // Form states
  const [dprData, setDprData] = useState({ detailed_estimate: '', remarks: '', technical_sanction_reference: '' });
  const [progressData, setProgressData] = useState({ percent_complete: '', stage: 'FOUNDATION', remarks: '' });
  const [paymentData, setPaymentData] = useState({ installment_number: 1, amount: '', voucher_number: '', description: '' });
  const [ucData, setUcData] = useState({ amount_certified: '', payment_id: '', file_ref: '' });
  const [docData, setDocData] = useState({ document_type: 'DETAILED_PROJECT_REPORT', notes: '' });
  const [docFile, setDocFile] = useState(null);

  // Payment approval modal state
  const [paymentApprovalTarget, setPaymentApprovalTarget] = useState(null); // { payment, action: 'APPROVED' | 'REJECTED' }
  const [approvalReason, setApprovalReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchProject360 = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/projects/${projectId}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to load project details');
      }
      setData(body.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProject360();
      setActiveTab('overview');
      setActionSuccess(null);
    }
  }, [isOpen, projectId, fetchProject360]);

  if (!isOpen) return null;

  const project = data?.project || {};
  const recommendation = data?.recommendation;
  const decisions = data?.decisions || [];
  const engineeringReports = data?.engineering_reports || [];
  const progressList = data?.progress || [];
  const payments = data?.payments || [];
  const ucs = data?.utilization_certificates || [];
  const documents = data?.documents || [];
  const aiFindings = data?.ai_findings || [];

  const isAgency = user?.role === 'IMPLEMENTING_AGENCY';
  const isDistrict = user?.role === 'DISTRICT_AUTHORITY';

  // 1. Submit Engineering Report
  const handleDprSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/projects/${projectId}/engineering-reports`, {
        method: 'POST',
        body: JSON.stringify(dprData),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to submit engineering report');
      }
      setActionSuccess('Engineering report submitted successfully.');
      setShowDprForm(false);
      setDprData({ detailed_estimate: '', remarks: '', technical_sanction_reference: '' });
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 2. Submit Physical Progress
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setError(null);
    try {
      const summaryText = (progressData.remarks || '').trim() || 'Site physical progress reported';
      const res = await authFetch(`/api/projects/${projectId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          ...progressData,
          physical_summary: summaryText,
          remarks: summaryText,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to record progress');
      }
      setActionSuccess('Physical progress recorded successfully.');
      setShowProgressForm(false);
      setProgressData({ percent_complete: '', stage: 'SUPERSTRUCTURE', remarks: '' });
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 3. Submit Payment Installment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/projects/${projectId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to raise payment installment');
      }
      setActionSuccess('Payment installment raised successfully (PENDING review).');
      setShowPaymentForm(false);
      setPaymentData({ installment_number: payments.length + 1, amount: '', voucher_number: '', description: '' });
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 4. Approve / Reject Payment (District Authority)
  const handlePaymentApprovalAction = async (e) => {
    e.preventDefault();
    if (!approvalReason || approvalReason.trim().length < 5) {
      setError('Administrative reason is required (minimum 5 characters).');
      return;
    }
    setActionSubmitting(true);
    setError(null);
    try {
      const { payment, action } = paymentApprovalTarget;
      const res = await authFetch(`/api/projects/${projectId}/payments/${payment.payment_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action, reason: approvalReason.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || `Failed to ${action.toLowerCase()} payment`);
      }
      setActionSuccess(`Payment installment ${payment.installment_number} ${action.toLowerCase()} successfully.`);
      setPaymentApprovalTarget(null);
      setApprovalReason('');
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 5. Submit Utilization Certificate
  const handleUcSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/projects/${projectId}/utilization-certificates`, {
        method: 'POST',
        body: JSON.stringify(ucData),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to file Utilization Certificate');
      }
      setActionSuccess('Utilization Certificate filed successfully.');
      setShowUcForm(false);
      setUcData({ amount_certified: '', payment_id: '', file_ref: '' });
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 6. Upload Document
  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setError('Please select a file to upload.');
      return;
    }
    setActionSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('document_type', docData.document_type);
      if (docData.notes) formData.append('notes', docData.notes);

      const res = await authFetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to upload document');
      }
      setActionSuccess(`Document '${docFile.name}' uploaded successfully.`);
      setShowDocForm(false);
      setDocFile(null);
      setDocData({ document_type: 'DETAILED_PROJECT_REPORT', notes: '' });
      await fetchProject360();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // 7. Secure Document Download via authFetch
  const handleDownloadDoc = async (doc) => {
    try {
      const res = await authFetch(`/api/documents/${doc.document_id}/download`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || 'Download forbidden or failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || `${doc.document_id}.bin`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download Error: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 35px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-secondary)' }}>
                {projectId}
              </span>
              <StatusBadge status={project.status} />
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                • {project.category || 'General'}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--color-primary)' }}>
              {project.title || 'Project Details'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
              District: <strong>{project.district || '—'}</strong> • State: <strong>{project.state || '—'}</strong> • MP: <strong>{project.mp_id || '—'}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: '#FFFFFF',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'ai_intelligence', label: `AI Intelligence (${aiFindings.length})` },
            { key: 'engineering', label: `Engineering DPR (${engineeringReports.length})` },
            { key: 'progress', label: `Physical Progress (${progressList.length})` },
            { key: 'payments', label: `Disbursements (${payments.length})` },
            { key: 'documents', label: `UCs & Docs (${ucs.length + documents.length})` },
            { key: 'decisions', label: `Audit Trail (${decisions.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setError(null);
                setActionSuccess(null);
              }}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1 }}>
          {error && (
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
              ⚠ {error}
            </div>
          )}

          {actionSuccess && (
            <div
              style={{
                padding: 'var(--space-3)',
                backgroundColor: '#EAF6EC',
                color: 'var(--color-success)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--space-4)',
              }}
            >
              ✓ {actionSuccess}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-muted)' }}>
              Loading complete Project 360 data...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Estimated Outlay</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                        ₹{(project.estimated_cost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Sanctioned Cost</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
                        ₹{(project.sanctioned_cost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Total Disbursed</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '4px' }}>
                        ₹{(project.total_disbursed || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Executing Agency</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '4px' }}>
                        {project.implementing_agency_id || 'Not assigned yet'}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#FAFAFA' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Original MP Recommendation</h4>
                    {recommendation ? (
                      <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong>Description:</strong> {recommendation.description}</div>
                        <div><strong>Justification:</strong> {recommendation.justification || '—'}</div>
                        <div><strong>Beneficiary Focus:</strong> {recommendation.beneficiary_count ? `${recommendation.beneficiary_count.toLocaleString()} citizens` : 'General Public'}</div>
                        <div><strong>Recommended Date:</strong> {new Date(recommendation.recommended_date).toLocaleDateString('en-IN')}</div>
                        <div><strong>MP ID:</strong> <code>{recommendation.mp_id}</code></div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
                        No initial recommendation record linked.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13px' }}>
                          AI Historical Intelligence & Risk Signals
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          • {aiFindings.length > 0 ? `${aiFindings.length} signals evaluated` : 'Analysis pending'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                        Peer cost benchmark, geographical duplicates, engineering deviation, and execution pace checks.
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setActiveTab('ai_intelligence')}>
                      View AI Signals ({aiFindings.length}) →
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB: AI HISTORICAL INTELLIGENCE */}
              {activeTab === 'ai_intelligence' && (
                <AiHistoricalIntelligencePanel
                  projectId={projectId}
                  initialFlags={aiFindings}
                  onAnalysisCompleted={() => {
                    fetchProject360();
                    if (onProjectUpdated) onProjectUpdated();
                  }}
                />
              )}

              {/* TAB 2: ENGINEERING REPORTS */}
              {activeTab === 'engineering' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Detailed Project Reports (DPR Versions)</h4>
                    {isAgency && !showDprForm && (
                      <Button size="sm" variant="primary" onClick={() => setShowDprForm(true)}>
                        + Submit New DPR Version
                      </Button>
                    )}
                  </div>

                  {showDprForm && (
                    <form onSubmit={handleDprSubmit} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#F8FAFC', marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 10px 0' }}>New Engineering Estimate Submission</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Detailed Estimate (₹) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={dprData.detailed_estimate}
                            onChange={(e) => setDprData({ ...dprData, detailed_estimate: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Technical Sanction Ref</label>
                          <input
                            type="text"
                            value={dprData.technical_sanction_reference}
                            onChange={(e) => setDprData({ ...dprData, technical_sanction_reference: e.target.value })}
                            placeholder="e.g. TS/PWD/2026/044"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Engineering Scope & Remarks</label>
                        <textarea
                          rows={2}
                          value={dprData.remarks}
                          onChange={(e) => setDprData({ ...dprData, remarks: e.target.value })}
                          placeholder="Scope of work, SOR schedules, material specifications..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={() => setShowDprForm(false)} disabled={actionSubmitting}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="primary" type="submit" disabled={actionSubmitting}>
                          {actionSubmitting ? 'Saving...' : 'Submit Version'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {engineeringReports.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      No engineering reports submitted yet.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Version</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Estimate (₹)</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>TS Ref</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Vetting Agency</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engineeringReports.map((r) => (
                          <tr key={r.report_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>v{r.version}</td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>₹{r.detailed_estimate.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.technical_sanction_reference || '—'}</td>
                            <td style={{ padding: '8px' }}>{r.vetting_agency || 'Implementing Agency'}</td>
                            <td style={{ padding: '8px', color: 'var(--color-muted)' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '8px', maxWidth: '200px' }}>{r.scope_remarks || r.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: PHYSICAL PROGRESS */}
              {activeTab === 'progress' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Physical Progress Records</h4>
                    {isAgency && !showProgressForm && (
                      <Button size="sm" variant="primary" onClick={() => setShowProgressForm(true)}>
                        + Record Progress Update
                      </Button>
                    )}
                  </div>

                  {showProgressForm && (
                    <form onSubmit={handleProgressSubmit} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#F8FAFC', marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 10px 0' }}>Record Execution Milestone</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Percent Complete (0 - 100) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={progressData.percent_complete}
                            onChange={(e) => setProgressData({ ...progressData, percent_complete: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Execution Stage *</label>
                          <select
                            value={progressData.stage}
                            onChange={(e) => setProgressData({ ...progressData, stage: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          >
                            <option value="SITE_PREPARATION">Site Preparation & Mobilization</option>
                            <option value="FOUNDATION">Foundation Stage</option>
                            <option value="SUPERSTRUCTURE">Superstructure / Main Construction</option>
                            <option value="FINISHING">Finishing & Services</option>
                            <option value="PHYSICALLY_COMPLETE">Physically Complete</option>
                            <option value="COMMISSIONED">Commissioned & Handed Over</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>On-Site Progress Remarks</label>
                        <textarea
                          rows={2}
                          value={progressData.remarks}
                          onChange={(e) => setProgressData({ ...progressData, remarks: e.target.value })}
                          placeholder="Current physical work done, site status, contractor activity..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={() => setShowProgressForm(false)} disabled={actionSubmitting}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="primary" type="submit" disabled={actionSubmitting}>
                          {actionSubmitting ? 'Recording...' : 'Record Progress'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {progressList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      No physical progress records logged yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {progressList.map((p, idx) => (
                        <div key={p.progress_id || idx} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)' }}>
                                {p.percent_complete}% Completed
                              </span>
                              <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#EDF4FC', color: '#2B6CB0', borderRadius: '4px' }}>
                                {p.stage}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                              {new Date(p.reported_date || p.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{ width: `${p.percent_complete}%`, height: '100%', backgroundColor: p.percent_complete === 100 ? '#10B981' : '#006699' }} />
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                            {p.remarks || 'No remarks noted.'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                            Reported by: <code>{p.reported_by || 'Agency'}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DISBURSEMENTS & PAYMENTS */}
              {activeTab === 'payments' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Payment Installments & Vouchers</h4>
                    {isAgency && !showPaymentForm && (
                      <Button size="sm" variant="primary" onClick={() => setShowPaymentForm(true)}>
                        + Raise Payment Installment
                      </Button>
                    )}
                  </div>

                  {showPaymentForm && (
                    <form onSubmit={handlePaymentSubmit} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#F8FAFC', marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 10px 0' }}>Raise New Payment Installment</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Installment # *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={paymentData.installment_number}
                            onChange={(e) => setPaymentData({ ...paymentData, installment_number: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Amount (₹) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Voucher Number</label>
                          <input
                            type="text"
                            value={paymentData.voucher_number}
                            onChange={(e) => setPaymentData({ ...paymentData, voucher_number: e.target.value })}
                            placeholder="VOUCH-2026-..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Description</label>
                        <input
                          type="text"
                          value={paymentData.description}
                          onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                          placeholder="e.g. First mobilization advance / Foundation work completion"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={() => setShowPaymentForm(false)} disabled={actionSubmitting}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="primary" type="submit" disabled={actionSubmitting}>
                          {actionSubmitting ? 'Raising...' : 'Raise Installment'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Payment Approval Dialog Modal */}
                  {paymentApprovalTarget && (
                    <form onSubmit={handlePaymentApprovalAction} style={{ padding: '14px', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#EFF6FF', marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 6px 0', color: 'var(--color-primary)' }}>
                        {paymentApprovalTarget.action === 'APPROVED' ? 'Approve Payment Installment' : 'Reject Payment Installment'} #{paymentApprovalTarget.payment.installment_number}
                      </h5>
                      <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                        Amount: <strong>₹{paymentApprovalTarget.payment.amount.toLocaleString('en-IN')}</strong> • Payment ID: <code>{paymentApprovalTarget.payment.payment_id}</code>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Official Administrative Reason (Mandatory) *</label>
                        <textarea
                          rows={2}
                          required
                          value={approvalReason}
                          onChange={(e) => setApprovalReason(e.target.value)}
                          placeholder="Enter administrative justification for this financial decision..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={() => { setPaymentApprovalTarget(null); setApprovalReason(''); }} disabled={actionSubmitting}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant={paymentApprovalTarget.action === 'APPROVED' ? 'primary' : 'sensitive'}
                          type="submit"
                          disabled={actionSubmitting}
                        >
                          {actionSubmitting ? 'Submitting...' : `Confirm ${paymentApprovalTarget.action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                        </Button>
                      </div>
                    </form>
                  )}

                  {payments.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      No payment installments recorded yet.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Payment ID</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Amount (₹)</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Voucher Ref</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Approved By</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.payment_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>#{p.installment_number}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>{p.payment_id}</td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '8px' }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: p.status === 'APPROVED' || p.status === 'DISBURSED' ? '#EAF6EC' : p.status === 'REJECTED' ? '#FDECEB' : '#FFF8E6',
                                  color: p.status === 'APPROVED' || p.status === 'DISBURSED' ? '#1E7A34' : p.status === 'REJECTED' ? '#B3261E' : '#8A6100',
                                }}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.voucher_number || '—'}</td>
                            <td style={{ padding: '8px', color: 'var(--color-muted)' }}>{p.approved_by || '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {isDistrict && p.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentApprovalTarget({ payment: p, action: 'APPROVED' })}
                                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentApprovalTarget({ payment: p, action: 'REJECTED' })}
                                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 5: UCS & DOCUMENTS */}
              {activeTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {/* Utilization Certificates Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Utilization Certificates (UC)</h4>
                      {isAgency && !showUcForm && (
                        <Button size="sm" variant="primary" onClick={() => setShowUcForm(true)}>
                          + File UC
                        </Button>
                      )}
                    </div>

                    {showUcForm && (
                      <form onSubmit={handleUcSubmit} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#F8FAFC', marginBottom: '14px' }}>
                        <h5 style={{ margin: '0 0 10px 0' }}>File Utilization Certificate</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Amount Certified (₹) *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={ucData.amount_certified}
                              onChange={(e) => setUcData({ ...ucData, amount_certified: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Reference (Optional)</label>
                            <input
                              type="text"
                              value={ucData.payment_id}
                              onChange={(e) => setUcData({ ...ucData, payment_id: e.target.value })}
                              placeholder="PAY-..."
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <Button size="sm" variant="secondary" onClick={() => setShowUcForm(false)} disabled={actionSubmitting}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="primary" type="submit" disabled={actionSubmitting}>
                            {actionSubmitting ? 'Filing...' : 'File Certificate'}
                          </Button>
                        </div>
                      </form>
                    )}

                    {ucs.length === 0 ? (
                      <div style={{ padding: '14px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        No Utilization Certificates filed yet.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>UC ID</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Certified (₹)</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Linked Payment</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Filed Date</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ucs.map((u) => (
                            <tr key={u.uc_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px' }}>{u.uc_id}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>₹{u.amount_certified.toLocaleString('en-IN')}</td>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{u.payment_id}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--color-muted)' }}>{new Date(u.filed_date || u.created_at).toLocaleDateString('en-IN')}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', backgroundColor: u.is_filed ? '#EAF6EC' : '#FFF8E6', color: u.is_filed ? '#1E7A34' : '#8A6100' }}>
                                  {u.is_filed ? 'FILED' : 'DRAFT'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Uploaded Documents Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Controlled Document Repository</h4>
                      {isAgency && !showDocForm && (
                        <Button size="sm" variant="primary" onClick={() => setShowDocForm(true)}>
                          + Upload Document
                        </Button>
                      )}
                    </div>

                    {showDocForm && (
                      <form onSubmit={handleDocUpload} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#F8FAFC', marginBottom: '14px' }}>
                        <h5 style={{ margin: '0 0 10px 0' }}>Upload Project Document</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Document Type *</label>
                            <select
                              value={docData.document_type}
                              onChange={(e) => setDocData({ ...docData, document_type: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                              <option value="DETAILED_PROJECT_REPORT">Detailed Project Report (DPR)</option>
                              <option value="TECHNICAL_SANCTION">Technical Sanction Order</option>
                              <option value="ADMINISTRATIVE_APPROVAL">Administrative Approval</option>
                              <option value="TENDER_NOTICE">Tender Notice</option>
                              <option value="WORK_ORDER">Work Order</option>
                              <option value="INVOICE_VOUCHER">Invoice / Voucher</option>
                              <option value="UTILIZATION_CERTIFICATE">Signed UC</option>
                              <option value="SITE_PHOTO">Site Geo-Tagged Photo</option>
                              <option value="INSPECTION_REPORT">Inspection Report</option>
                              <option value="COMPLETION_CERTIFICATE">Completion Certificate</option>
                              <option value="OTHER">Other Official Document</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Select File (PDF, PNG, JPG, Max 10MB) *</label>
                            <input
                              type="file"
                              required
                              onChange={(e) => setDocFile(e.target.files[0])}
                              style={{ width: '100%', padding: '4px', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Notes / Description</label>
                          <input
                            type="text"
                            value={docData.notes}
                            onChange={(e) => setDocData({ ...docData, notes: e.target.value })}
                            placeholder="e.g. Approved technical sanction drawings v1"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <Button size="sm" variant="secondary" onClick={() => setShowDocForm(false)} disabled={actionSubmitting}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="primary" type="submit" disabled={actionSubmitting}>
                            {actionSubmitting ? 'Uploading...' : 'Upload File'}
                          </Button>
                        </div>
                      </form>
                    )}

                    {documents.length === 0 ? (
                      <div style={{ padding: '14px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        No files uploaded for this project yet.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>File Name</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Size</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Checksum (SHA-256)</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Download</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((d) => (
                            <tr key={d.document_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '6px 8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-secondary)' }}>
                                  {d.document_type}
                                </span>
                              </td>
                              <td style={{ padding: '6px 8px', fontWeight: 500 }}>{d.file_name}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--color-muted)' }}>
                                {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}
                              </td>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--color-muted)' }}>
                                {d.sha256_hash ? `${d.sha256_hash.substring(0, 10)}...` : '—'}
                              </td>
                              <td style={{ padding: '6px 8px', color: 'var(--color-muted)' }}>
                                {new Date(d.uploaded_at || d.created_at).toLocaleDateString('en-IN')}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDoc(d)}
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--color-surface)',
                                    color: 'var(--color-primary)',
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ⬇ Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: DECISIONS & AUDIT TRAIL */}
              {activeTab === 'decisions' && (
                <div>
                  <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--color-primary)' }}>Administrative Audit Trail</h4>
                  {decisions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      No official administrative decisions logged on this project yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {decisions.map((d, idx) => (
                        <div key={d.decision_id || idx} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px', backgroundColor: '#FAFAFA' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13px' }}>
                                {d.decision}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                ({d.previous_state} → {d.new_state})
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                              {new Date(d.decided_at || d.created_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '4px' }}>
                            <strong>Official Reason:</strong> {d.reason}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                            Officer: <code>{d.officer_id}</code> ({d.role})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailModal;

