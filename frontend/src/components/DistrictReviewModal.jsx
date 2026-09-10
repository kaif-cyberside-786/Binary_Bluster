import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from './Card';
import Button from './Button';
import { StatusBadge, RiskBadge, ComplianceBadge } from './Badge';
import { RiskBreakdown } from './AiReviewPanel';
import AgencySuitabilityCard from './AgencySuitabilityCard';

/**
 * DistrictReviewModal Component — Phase 10
 * Connects AI risk intelligence to the authorized District Authority administrative review
 * and human decision workflow.
 * Follows the review hierarchy defined in Phase 10 §25 and strict human-in-the-loop governance.
 */
export function DistrictReviewModal({ projectId, isOpen, onClose, onDecisionRecorded }) {
  const { user, authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);
  const [riskActionMessage, setRiskActionMessage] = useState(null);

  // Decision Confirmation Modal State
  const [pendingDecision, setPendingDecision] = useState(null); // 'SANCTION' | 'HOLD' | 'REQUEST_CLARIFICATION' | 'ORDER_INSPECTION' | 'ESCALATE'
  const [decisionReason, setDecisionReason] = useState('');
  const [supportingNote, setSupportingNote] = useState('');
  const [assignedAgencyId, setAssignedAgencyId] = useState('PWD-INDORE-01');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState(null);

  const fetchReviewPackage = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/projects/${projectId}/review`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to load district review package');
      }
      setReviewData(body.data);
      if (body.data?.project?.implementing_agency_id) {
        setAssignedAgencyId(body.data.project.implementing_agency_id);
      }
    } catch (err) {
      setError(err.message || 'Error fetching review package');
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchReviewPackage();
      setPendingDecision(null);
      setDecisionReason('');
      setSupportingNote('');
      setDecisionError(null);
    }
  }, [isOpen, projectId, fetchReviewPackage]);

  if (!isOpen) return null;

  const isDistrictAuthority = user?.role === 'DISTRICT_AUTHORITY';
  const isAuditor = user?.role === 'AUDITOR';
  const isAdmin = user?.role === 'ADMIN';

  const project = reviewData?.project || {};
  const recommendation = reviewData?.recommendation;
  const compliance = reviewData?.compliance || {};
  const historical = reviewData?.historical || {};
  const costBenchmark = reviewData?.cost_benchmark || {};
  const engineering = reviewData?.engineering || {};
  const risk = reviewData?.risk || {};
  const aiRecommendation = reviewData?.ai_recommendation || {};
  const decisions = reviewData?.decisions || [];

  // Synchronously trigger AI risk re-evaluation and refresh review data
  const handleReevaluateRisk = async () => {
    if (!projectId || analyzingRisk) return;
    setAnalyzingRisk(true);
    setRiskActionMessage(null);
    try {
      const res = await authFetch(`/api/projects/${projectId}/risk/analyze`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to re-evaluate AI risk');
      }
      await fetchReviewPackage();
      setRiskActionMessage({ type: 'success', text: 'AI Risk re-evaluation completed successfully.' });
      setTimeout(() => setRiskActionMessage(null), 5000);
    } catch (err) {
      setRiskActionMessage({ type: 'error', text: err.message || 'Failed to re-evaluate AI risk' });
    } finally {
      setAnalyzingRisk(false);
    }
  };

  // Open confirmation modal for selected action
  const handleInitiateDecision = (decisionType) => {
    setPendingDecision(decisionType);
    setDecisionReason('');
    setSupportingNote('');
    setDecisionError(null);
  };

  // Submit authorized decision to backend
  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!decisionReason || decisionReason.trim().length < 5) {
      setDecisionError('Substantive administrative reason is required (minimum 5 characters).');
      return;
    }

    setSubmittingDecision(true);
    setDecisionError(null);

    try {
      const payload = {
        decision: pendingDecision,
        reason: decisionReason.trim(),
        supporting_note: supportingNote.trim() || undefined,
        implementing_agency_id: pendingDecision === 'SANCTION' ? assignedAgencyId : undefined,
      };

      const res = await authFetch(`/api/projects/${projectId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to record administrative decision');
      }

      setPendingDecision(null);
      if (onDecisionRecorded) {
        onDecisionRecorded(body.data);
      }
      onClose();
    } catch (err) {
      setDecisionError(err.message || 'Error recording decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const getDecisionActionMeta = (type) => {
    switch (type) {
      case 'SANCTION':
        return {
          title: 'Approve & Sanction Work',
          targetStatus: 'SANCTIONED',
          badgeColor: 'var(--color-success)',
          buttonVariant: 'primary',
          confirmText: 'Confirm Work Sanction',
        };
      case 'HOLD':
        return {
          title: 'Place Recommendation on Hold',
          targetStatus: 'HELD',
          badgeColor: '#B8860B',
          buttonVariant: 'secondary',
          confirmText: 'Confirm Place on Hold',
        };
      case 'REQUEST_CLARIFICATION':
        return {
          title: 'Request Clarification from MP / Proposer',
          targetStatus: 'CLARIFICATION_REQUIRED',
          badgeColor: 'var(--color-secondary)',
          buttonVariant: 'secondary',
          confirmText: 'Confirm Clarification Request',
        };
      case 'ORDER_INSPECTION':
        return {
          title: 'Send for Physical Field Inspection',
          targetStatus: 'INSPECTION_REQUESTED',
          badgeColor: '#6B46C1',
          buttonVariant: 'secondary',
          confirmText: 'Confirm Inspection Request',
        };
      case 'ESCALATE':
        return {
          title: 'Escalate to State Nodal Authority',
          targetStatus: 'ESCALATED',
          badgeColor: 'var(--color-error)',
          buttonVariant: 'secondary',
          confirmText: 'Confirm Escalation',
        };
      default:
        return {
          title: type,
          targetStatus: type,
          badgeColor: 'var(--color-primary)',
          buttonVariant: 'primary',
          confirmText: 'Confirm Decision',
        };
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="district-review-modal-title"
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
        zIndex: 9999,
        padding: 'var(--space-4)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-border)',
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
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
              Official Administrative Review • District Authority
            </div>
            <h3 id="district-review-modal-title" style={{ margin: '2px 0 0 0', color: 'var(--color-primary)', fontSize: '18px' }}>
              Project Review & Sanction Package
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-muted)' }}>
              Loading complete project review package...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: '#FDECEB',
                color: 'var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                border: '1px solid #F8B4AF',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* 1. PROJECT SUMMARY CARD (§4) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  1. Project Summary & Outlay
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Project ID: <code>{project.project_id}</code>
                    </div>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', color: 'var(--color-primary)' }}>
                      {project.title}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <StatusBadge status={project.status} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #EEF2F6',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px' }}>WORK CATEGORY</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{project.category}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px' }}>LOCATION & WARD</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{project.location || '—'} {project.ward ? `(${project.ward})` : ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px' }}>PROPOSED OUTLAY</span>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>₹{(project.estimated_cost || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px' }}>RECOMMENDING MP</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{project.mp_id}</strong>
                  </div>
                </div>

                {recommendation && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', fontSize: '12px', color: 'var(--color-text)' }}>
                    <strong>Original Recommendation Narrative:</strong> {recommendation.description}
                  </div>
                )}
              </div>

              {/* 2. DETERMINISTIC COMPLIANCE SECTION (§7) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
                    Rule-Based Compliance (Deterministic — Separate from AI Risk)
                    Deterministic Compliance Findings (Rule-Based — Separate from AI Risk)
                  </div>
                  <ComplianceBadge status={compliance.status || 'COMPLIANT'} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '8px' }}>
                  Evaluates MPLADS Guidelines rules (Category eligibility, SC/ST quota earmarking, and technical threshold constraints).
                </div>
                {compliance.findings && compliance.findings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {compliance.findings.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          backgroundColor: f.status === 'NON_COMPLIANT' ? '#FDECEB' : '#F8FAFC',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong>{f.rule_name || f.category}:</strong> {f.message}
                        </div>
                        <ComplianceBadge status={f.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                    ✓ All statutory MPLADS guideline compliance checks passed.
                  </div>
                )}
              </div>

              {/* 3. HISTORICAL INTELLIGENCE & DUPLICATE CHECKS (§4) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Historical Duplicates & Overlap Detection (Phase 8 TF-IDF Cosine Match)
                </div>
                {historical.duplicate_flags && historical.duplicate_flags.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {historical.duplicate_flags.map((flag, idx) => {
                      const topMatches = flag.evidence?.top_matches || flag.signals?.top_matches || [];
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: '#FFF8E6',
                            border: '1px solid #F2DC9B',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#8A6100', marginBottom: '4px' }}>
                            <span>Duplicate Signal: {flag.severity}</span>
                            <span>Score: {flag.risk_score}/100</span>
                          </div>
                          <div>{flag.explanation}</div>

                          {topMatches && topMatches.length > 0 && (
                            <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#664D00', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Potential Duplicate Match Candidates ({topMatches.length})
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', backgroundColor: '#FFFFFF', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E2D9C8' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#FBF5E8', color: '#5A4A28', borderBottom: '1px solid #E2D9C8', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px' }}>Candidate Project</th>
                                    <th style={{ padding: '6px 8px' }}>Category</th>
                                    <th style={{ padding: '6px 8px' }}>Location / Ward</th>
                                    <th style={{ padding: '6px 8px' }}>Status</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Similarity Match</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {topMatches.map((m, mIdx) => {
                                    const simScore = m.similarity_score !== undefined ? m.similarity_score : Math.round((m.score || 0) * 100);
                                    const badgeBg = simScore >= 70 ? '#FDE8E8' : simScore >= 45 ? '#FEF08A' : '#F1F5F9';
                                    const badgeColor = simScore >= 70 ? '#9B1C1C' : simScore >= 45 ? '#854D0E' : '#475569';
                                    return (
                                      <tr key={mIdx} style={{ borderBottom: mIdx < topMatches.length - 1 ? '1px solid #F3EDE0' : 'none' }}>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{m.project_id}</span>
                                          <div style={{ fontSize: '11px', color: 'var(--color-text)', marginTop: '2px' }}>{m.title}</div>
                                        </td>
                                        <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{m.category || '—'}</td>
                                        <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{m.ward ? `Ward ${m.ward}` : (m.location || m.district || '—')}</td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#E2E8F0', color: '#334155', fontWeight: 600 }}>
                                            {m.status || 'UNKNOWN'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              padding: '2px 7px',
                                              borderRadius: '10px',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              backgroundColor: badgeBg,
                                              color: badgeColor,
                                            }}
                                          >
                                            {simScore}% match
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>
                    No significant historical overlap detected.
                  </div>
                )}
              </div>

              {/* 4. COST BENCHMARK SECTION (§5) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Cost Benchmark Analysis (Peer-Group IQR Deviation)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>PROPOSED COST</span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>
                      ₹{(costBenchmark.proposed_cost || project.estimated_cost || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>PEER GROUP MEDIAN</span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>
                      {costBenchmark.peer_median_cost ? `₹${Number(costBenchmark.peer_median_cost).toLocaleString('en-IN')}` : 'Insufficient Data'}
                    </strong>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>DEVIATION %</span>
                    <strong
                      style={{
                        fontSize: '14px',
                        color: (costBenchmark.deviation_percent || 0) > 30 ? 'var(--color-error)' : 'var(--color-primary)',
                      }}
                    >
                      {costBenchmark.deviation_percent !== null && costBenchmark.deviation_percent !== undefined
                        ? `${costBenchmark.deviation_percent > 0 ? '+' : ''}${costBenchmark.deviation_percent}%`
                        : '—'}
                    </strong>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>COST ANOMALY</span>
                    <RiskBadge level={costBenchmark.severity || 'LOW'} />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text)', backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '4px' }}>
                  {costBenchmark.explanation}
                </div>
              </div>

              {/* 5. ENGINEERING COMPARISON (§6) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Engineering Comparison (Recommended Outlay vs Detailed Project Report)
                </div>
                {engineering.available ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>RECOMMENDED COST</span>
                        <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>₹{(engineering.recommended_cost || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>ENGINEERING REPORT ESTIMATE</span>
                        <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>₹{(engineering.dpr_estimate || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>SCOPE / COST DRIFT</span>
                        <strong style={{ fontSize: '14px', color: engineering.cost_drift_percent > 15 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                          {engineering.cost_drift_percent !== null ? `${engineering.cost_drift_percent > 0 ? '+' : ''}${engineering.cost_drift_percent}%` : '0%'}
                        </strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                      <strong>Status:</strong> {engineering.explanation}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    Engineering comparison not available. Detailed Project Report (DPR) has not yet been submitted by an executing agency.
                  </div>
                )}
              </div>

              {/* 6. PHASE 9 AI RISK ASSESSMENT (§8) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
                    AI Composite Risk Assessment (Phase 9 Explainable Risk Engine)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RiskBadge level={risk.risk_level} score={risk.overall_score} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReevaluateRisk}
                      loading={analyzingRisk}
                      disabled={analyzingRisk}
                      style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                    >
                      {analyzingRisk ? 'Analyzing...' : '↻ Re-evaluate AI Risk'}
                    </Button>
                  </div>
                </div>

                {riskActionMessage && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '10px',
                      backgroundColor: riskActionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                      color: riskActionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
                      border: `1px solid ${riskActionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
                    }}
                  >
                    {riskActionMessage.text}
                  </div>
                )}

                {risk.overall_score !== null && risk.overall_score !== undefined ? (
                  <RiskBreakdown
                    componentScores={risk.component_scores}
                    topContributors={risk.top_contributors}
                    contributors={risk.top_contributors}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-muted)',
                      padding: '10px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span>AI analysis pending or unavailable. Showing baseline structured telemetry.</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleReevaluateRisk}
                      loading={analyzingRisk}
                      disabled={analyzingRisk}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      {analyzingRisk ? 'Evaluating...' : 'Run AI Analysis Now'}
                    </Button>
                  </div>
                )}
              </div>

              {/* 7. AI REVIEW RECOMMENDATION CARD (§10) */}
              <div
                style={{
                  border: '1px solid #BEE3F8',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#EBF8FF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px' }}>💡</span>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#2B6CB0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    AI Advisory Recommendation
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#BEE3F8', color: '#2C5282', padding: '1px 6px', borderRadius: '3px' }}>
                    Non-binding Advisory (Advisory only)
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#1A365D', lineHeight: 1.5, marginBottom: '6px' }}>
                  {aiRecommendation.text}
                </div>
                <div style={{ fontSize: '11px', color: '#4A5568', fontStyle: 'italic' }}>
                  {aiRecommendation.disclaimer}
                </div>
              </div>

              {/* 8. ACCESSIBLE STRUCTURED EVIDENCE DRAWER (§9) */}
              <div>
                <button
                  type="button"
                  aria-expanded={evidenceOpen}
                  onClick={() => setEvidenceOpen(!evidenceOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-secondary)',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <span>{evidenceOpen ? '▼ Hide De-Identified Telemetry Evidence' : '▶ Inspect Underlying Telemetry Evidence'}</span>
                </button>
                {evidenceOpen && (
                  <pre
                    style={{
                      margin: '8px 0 0 0',
                      padding: '10px 12px',
                      backgroundColor: '#1E293B',
                      color: '#F8FAFC',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      overflowX: 'auto',
                      maxHeight: '160px',
                    }}
                  >
                    {JSON.stringify(
                      {
                        project_id: project.project_id,
                        category: project.category,
                        estimated_cost: project.estimated_cost,
                        cost_benchmark: costBenchmark,
                        engineering: engineering,
                        risk_scores: risk.component_scores,
                        analysis_id: risk.analysis_id,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>

              {/* 9. DECISION HISTORY TIMELINE (§26) */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Prior Administrative Decision History (Append-Only Audit)
                  Prior Decisions & Administrative History (Append-Only Audit)
                </div>
                {decisions.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '6px 8px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                    No administrative decision recorded yet. Awaiting authorized District Authority action.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {decisions.map((dec, idx) => (
                      <div
                        key={dec.decision_id || idx}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          backgroundColor: '#F8FAFC',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: 'var(--color-primary)' }}>{dec.decision}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                              by {dec.role} ({dec.officer_id})
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                            {new Date(dec.decided_at || dec.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text)', marginBottom: '4px' }}>
                          <strong>Reason:</strong> {dec.reason}
                        </div>
                        {dec.supporting_note && (
                          <div style={{ color: 'var(--color-muted)', fontStyle: 'italic', marginBottom: '4px' }}>
                            <strong>Note:</strong> {dec.supporting_note}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--color-secondary)' }}>
                          Transition: <code>{dec.previous_state}</code> → <code>{dec.new_state}</code>
                          {dec.risk_level_at_decision && (
                            <span style={{ marginLeft: '12px' }}>
                              Risk at decision: <strong>{dec.risk_level_at_decision}</strong> {dec.risk_score_at_decision !== null ? `(${dec.risk_score_at_decision})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 10. DISTRICT AUTHORITY HUMAN DECISION ACTIONS (§11, §25) */}
              <div
                style={{
                  border: '2px solid #CBD5E1',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#F8FAFC',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                      Human Decision Action Panel (Administrative Decision Panel)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      Authorized District Authority action. AI recommendations are advisory only; the officer makes and signs the final decision.
                    </div>
                  </div>
                </div>

                {isDistrictAuthority ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleInitiateDecision('SANCTION')}
                      style={{
                        backgroundColor: 'var(--color-success)',
                        borderColor: 'var(--color-success)',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Approve / Sanction
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleInitiateDecision('HOLD')}
                      style={{
                        color: '#8A6100',
                        borderColor: '#F2DC9B',
                        backgroundColor: '#FFF8E6',
                        fontWeight: 600,
                      }}
                    >
                      ⏸ Hold
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleInitiateDecision('REQUEST_CLARIFICATION')}
                      style={{
                        color: 'var(--color-secondary)',
                        borderColor: 'var(--color-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      ❓ Request Clarification
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleInitiateDecision('ORDER_INSPECTION')}
                      style={{
                        color: '#553C9A',
                        borderColor: '#D6BCFA',
                        backgroundColor: '#FAF5FF',
                        fontWeight: 600,
                      }}
                    >
                      🔍 Send for Inspection
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleInitiateDecision('ESCALATE')}
                      style={{
                        color: 'var(--color-error)',
                        borderColor: '#F8B4AF',
                        backgroundColor: '#FDECEB',
                        fontWeight: 600,
                      }}
                    >
                      ⬆ Escalate
                    </Button>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '6px 0' }}>
                    {isAuditor
                      ? 'Read-only Auditor context: Administrative decision actions are restricted to District Authority.'
                      : 'Administrative decision actions are restricted to authorized District Authority officials.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F8FAFC',
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* DECISION CONFIRMATION MODAL (§12) */}
      {pendingDecision && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-decision-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: pendingDecision === 'SANCTION' ? '700px' : '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-5)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--color-border)',
            }}
          >
            {(() => {
              const meta = getDecisionActionMeta(pendingDecision);
              return (
                <form onSubmit={handleSubmitDecision}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 id="confirm-decision-title" style={{ margin: 0, color: 'var(--color-primary)', fontSize: '18px' }}>
                      Confirm Administrative Decision
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPendingDecision(null)}
                      style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-4)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>SELECTED ACTION</span>
                      <strong style={{ color: meta.badgeColor, fontSize: '15px' }}>{meta.title}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block' }}>NEW PROJECT STATE</span>
                      <StatusBadge status={meta.targetStatus} />
                    </div>
                  </div>

                  {/* Statutory Human-in-the-loop Disclaimer (§12) */}
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: '#1E3A8A',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    ⚖ <strong>Statutory Governance Notice:</strong> This is an official administrative decision made by the authorized officer. AI findings are advisory only.
                  </div>

                  {decisionError && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#FDECEB',
                        color: 'var(--color-error)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      ⚠ {decisionError}
                    </div>
                  )}

                  {pendingDecision === 'SANCTION' && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <div style={{ marginBottom: 'var(--space-3)' }}>
                        <AgencySuitabilityCard
                          category={project?.category}
                          estimatedCost={project?.sanctioned_cost || project?.estimated_cost}
                          district={project?.district || 'Indore'}
                          state={project?.state || 'Madhya Pradesh'}
                          selectedAgencyId={assignedAgencyId}
                          onSelectAgency={(id) => setAssignedAgencyId(id)}
                          authFetch={authFetch}
                        />
                      </div>

                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Assign Implementing Agency *
                        Selected Implementing Agency (Administrative Assignment) *
                      </label>
                      <select
                        value={assignedAgencyId}
                        onChange={(e) => setAssignedAgencyId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          fontSize: '13px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="PWD-INDORE-01">Public Works Department (PWD-INDORE-01)</option>
                        <option value="RES-INDORE-01">Rural Engineering Services (RES-INDORE-01)</option>
                        <option value="CPWD-INDORE-01">Central Public Works Department (CPWD)</option>
                        <option value="MP-RDC-01">MP Road Development Corporation (MP-RDC)</option>
                        <option value="IMC-INDORE-01">Indore Municipal Corporation (IMC-INDORE-01)</option>
                      </select>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                        * Advisory suggestion pre-fills this selection. You may choose any eligible agency before signing sanction approval.
                      </div>
                    </div>
                  )}

                  {/* Mandatory Substantive Reason */}
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Official Administrative Reason (Mandatory, min 5 chars) <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Enter substantive justification, technical scrutiny observations, or clarification instructions..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Optional Supporting Note */}
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Supporting Note / Internal File Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={supportingNote}
                      onChange={(e) => setSupportingNote(e.target.value)}
                      placeholder="e.g. File No. DA/MPLADS/2026/412; Technical Sanction Memo attached"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPendingDecision(null)}
                      disabled={submittingDecision}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submittingDecision}
                      style={{
                        backgroundColor: meta.badgeColor,
                        borderColor: meta.badgeColor,
                        fontWeight: 700,
                      }}
                    >
                      {submittingDecision ? 'Recording Decision...' : meta.confirmText}
                    </Button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DistrictReviewModal;

