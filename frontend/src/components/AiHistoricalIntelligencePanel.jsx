import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RiskBadge } from './Badge';
import Button from './Button';

/**
 * AI Historical Intelligence Panel (Phase 8)
 * Displays advisory machine intelligence signals across:
 * - AI-01 Cost Anomaly Benchmark
 * - AI-02 Historical Duplicate & Overlap Candidates
 * - AI-03 Engineering DPR Scope & Cost Drift
 * - AI-04 Execution Timeline Staleness & Delay
 * - AI-05 Financial Disbursement vs Physical Progress Gap
 *
 * Adheres to rules.md §12:
 * Advisory only — never declares fraud or automatically sanctions/rejects.
 * Uses RiskBadge (pill) strictly separated from deterministic compliance badges.
 */
export function AiHistoricalIntelligencePanel({
  projectId,
  initialFlags = [],
  onAnalysisCompleted,
}) {
  const { authFetch } = useAuth();
  const [flags, setFlags] = useState(initialFlags);
  const [analyzing, setAnalyzing] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [error, setError] = useState(null);

  const handleRunAnalysis = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);
    setServiceUnavailable(false);

    try {
      const res = await authFetch(`/api/projects/${projectId}/ai/analyze`, {
        method: 'POST',
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to trigger AI analysis');
      }

      if (body.data?.status === 'AI_ANALYSIS_UNAVAILABLE' || body.data?.available === false) {
        setServiceUnavailable(true);
      } else {
        const newFlags = body.data?.flags || [];
        setFlags(newFlags);
        if (onAnalysisCompleted) {
          onAnalysisCompleted(newFlags);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper to extract specific signal
  const getFlag = (type) => flags.find((f) => f.flag_type === type);

  const costFlag = getFlag('COST_ANOMALY');
  const duplicateFlag = getFlag('DUPLICATE_OVERLAP');
  const specFlag = getFlag('SPEC_DEVIATION');
  const delayFlag = getFlag('DELAY_STALENESS');
  const paymentFlag = getFlag('PAYMENT_PROGRESS_MISMATCH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Panel Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>
              AI Historical Intelligence & Risk Signals
            </h4>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-secondary)',
                backgroundColor: '#EDF4FC',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #BDD7F5',
              }}
            >
              ADVISORY ONLY
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Independent statistical benchmarking and similarity detection • Human official retains sole decision authority.
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleRunAnalysis}
          disabled={analyzing}
        >
          {analyzing ? 'Evaluating Signals...' : '⚡ Re-run AI Analysis'}
        </Button>
      </div>

      {/* Error / Alert Banner */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FDECEB',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            border: '1px solid #F8B4AF',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Explicit AI Unavailable State (Never fakes LOW risk per rules.md §12) */}
      {serviceUnavailable && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFF8E6',
            color: '#8A6100',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            border: '1px solid #F2DC9B',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>ℹ</span>
          <div>
            <strong>AI Analysis Service Unavailable:</strong> Microservice connection timed out or is currently offline.
            Statutory review, administrative scrutiny, and officer sanctioning may proceed safely using standard engineering and compliance records.
          </div>
        </div>
      )}

      {/* Empty State / Not Evaluated Yet */}
      {flags.length === 0 && !serviceUnavailable && !analyzing && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>
            No Historical Risk Analysis Recorded
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', maxWidth: '500px', margin: '6px auto 14px' }}>
            Run live historical intelligence to evaluate cost benchmarks, detect geographical/textual duplicates, and analyze engineering deviation.
          </div>
          <Button size="sm" variant="primary" onClick={handleRunAnalysis}>
            Run Initial AI Evaluation
          </Button>
        </div>
      )}

      {/* Signal Cards Grid */}
      {flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* 1. Cost Anomaly Benchmark (AI-01) */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px' }}>
                  AI-01: Historical Cost Anomaly Benchmark
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>(Peer Median & IQR)</span>
              </div>
              {costFlag && <RiskBadge level={costFlag.severity} score={costFlag.risk_score} />}
            </div>

            {costFlag ? (
              <div>
                <p style={{ fontSize: '13px', margin: '0 0 12px 0', color: 'var(--color-text)' }}>
                  {costFlag.explanation}
                </p>
                {costFlag.signals && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                      backgroundColor: '#F8FAFC',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Proposed Cost</div>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>
                        ₹{(costFlag.signals.proposed_cost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Peer Median</div>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>
                        {costFlag.signals.peer_median
                          ? `₹${costFlag.signals.peer_median.toLocaleString('en-IN')}`
                          : 'Insufficient Data'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Cost Deviation</div>
                      <div
                        style={{
                          fontWeight: 700,
                          marginTop: '2px',
                          color:
                            (costFlag.signals.deviation_percent || 0) > 30
                              ? 'var(--color-error)'
                              : 'var(--color-success)',
                        }}
                      >
                        {costFlag.signals.deviation_percent !== null && costFlag.signals.deviation_percent !== undefined
                          ? `${costFlag.signals.deviation_percent > 0 ? '+' : ''}${costFlag.signals.deviation_percent}%`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Comparable Works</div>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>
                        {costFlag.signals.peer_count || 0} projects
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>Cost benchmark pending.</div>
            )}
          </div>

          {/* 2. Duplicate & Overlap Detection (AI-02) */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px' }}>
                  AI-02: Duplicate Work & Historical Overlap
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>(In-Process TF-IDF & Spatial Tokens)</span>
              </div>
              {duplicateFlag && <RiskBadge level={duplicateFlag.severity} score={duplicateFlag.risk_score} />}
            </div>

            {duplicateFlag ? (
              <div>
                <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--color-text)' }}>
                  {duplicateFlag.explanation}
                </p>

                {duplicateFlag.signals?.top_matches && duplicateFlag.signals.top_matches.length > 0 ? (
                  <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Candidate Project</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Location / Ward</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Similarity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateFlag.signals.top_matches.map((m) => (
                          <tr key={m.project_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                              <span style={{ color: 'var(--color-primary)' }}>{m.title}</span>
                              <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                                {m.project_id}
                              </div>
                            </td>
                            <td style={{ padding: '6px 8px' }}>{m.category || '—'}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--color-muted)' }}>{m.location || '—'}</td>
                            <td style={{ padding: '6px 8px' }}>{m.status || '—'}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: m.similarity_score > 60 ? '#FDECEB' : '#FFF8E6',
                                  color: m.similarity_score > 60 ? 'var(--color-error)' : '#8A6100',
                                }}
                              >
                                {m.similarity_score}% match
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: 'var(--color-muted)',
                    }}
                  >
                    ✓ No conflicting or overlapping works detected in comparable historical records.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>Duplicate check pending.</div>
            )}
          </div>

          {/* 3. Engineering Spec & Scope Comparison (AI-03) */}
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px' }}>
                  AI-03: Engineering DPR Specification & Cost Drift
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>(Recommendation vs DPR)</span>
              </div>
              {specFlag && <RiskBadge level={specFlag.severity} score={specFlag.risk_score} />}
            </div>

            {specFlag ? (
              <div>
                <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--color-text)' }}>
                  {specFlag.explanation}
                </p>
                {specFlag.signals && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                      backgroundColor: '#F8FAFC',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Recommended Outlay</div>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>
                        ₹{(specFlag.signals.recommended_cost || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>DPR Detailed Estimate</div>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>
                        ₹{(specFlag.signals.engineering_estimate || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-muted)' }}>Cost Drift</div>
                      <div
                        style={{
                          fontWeight: 700,
                          marginTop: '2px',
                          color:
                            (specFlag.signals.cost_drift_percent || 0) > 20
                              ? 'var(--color-error)'
                              : 'var(--color-text)',
                        }}
                      >
                        {specFlag.signals.cost_drift_percent !== undefined
                          ? `${specFlag.signals.cost_drift_percent > 0 ? '+' : ''}${specFlag.signals.cost_drift_percent}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>
                Engineering DPR not yet submitted for comparison.
              </div>
            )}
          </div>

          {/* 4. Execution Delay & Staleness (AI-04) and 5. Payment vs Progress Gap (AI-05) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Delay & Staleness */}
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13px' }}>
                  AI-04: Execution Pace & Staleness
                </span>
                {delayFlag && <RiskBadge level={delayFlag.severity} score={delayFlag.risk_score} />}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text)', margin: '0 0 8px 0' }}>
                {delayFlag ? delayFlag.explanation : 'Timeline analysis pending.'}
              </p>
              {delayFlag?.signals && (
                <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  Days without progress: <strong>{delayFlag.signals.days_since_last_progress ?? '—'}</strong> •
                  Physical progress: <strong>{delayFlag.signals.percent_complete ?? 0}%</strong>
                </div>
              )}
            </div>

            {/* Payment vs Progress */}
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13px' }}>
                  AI-05: Disbursement vs Progress Gap
                </span>
                {paymentFlag && <RiskBadge level={paymentFlag.severity} score={paymentFlag.risk_score} />}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text)', margin: '0 0 8px 0' }}>
                {paymentFlag ? paymentFlag.explanation : 'Financial disbursement check pending.'}
              </p>
              {paymentFlag?.signals && (
                <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  Disbursed: <strong>{paymentFlag.signals.financial_disbursed_percent ?? 0}%</strong> •
                  Physical: <strong>{paymentFlag.signals.physical_percent_complete ?? 0}%</strong> •
                  Gap: <strong>{paymentFlag.signals.discrepancy_gap_percent ?? 0}%</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiHistoricalIntelligencePanel;
