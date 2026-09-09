import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RiskBadge } from './Badge';
import Button from './Button';

/**
 * RiskBreakdown Component (Phase 9)
 * Renders the ranked contributors to the overall risk assessment.
 */
export function RiskBreakdown({ contributors = [], topContributors = [], componentScores = {} }) {
  const items = (contributors && contributors.length > 0) ? contributors : (topContributors || []);
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          fontSize: '13px',
          color: 'var(--color-muted)',
        }}
      >
        ✓ No significant risk contributors detected for this project.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((c, idx) => {
        const typeName = (c.type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                  {typeName}
                </span>
                <RiskBadge level={c.severity || 'LOW'} score={c.score} />
                {c.weighted_contribution !== undefined && c.weight !== undefined && (
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    Weight: {Math.round(c.weight * 100)}% ({c.weighted_contribution} pts)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text)', lineHeight: 1.4 }}>
                {c.reason || 'Elevated indicator detected. Administrative scrutiny recommended.'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * AI-Assisted Review Panel (Phase 9)
 * Displays project-level combined risk, AI Gateway natural-language explanation,
 * ranked contributors breakdown, explicit AI status labels, and structured evidence drawer.
 * Adheres strictly to design.md and rules.md §10, §12.
 */
export function AiReviewPanel({
  projectId,
  initialRisk = null,
  onAnalysisCompleted = null,
}) {
  const { authFetch } = useAuth();
  const [risk, setRisk] = useState(initialRisk);
  const [analyzing, setAnalyzing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRisk(initialRisk);
  }, [initialRisk]);

  const handleRunAnalysis = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await authFetch(`/api/projects/${projectId}/risk/analyze`, {
        method: 'POST',
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to trigger risk analysis');
      }

      const updated = body.data;
      setRisk(updated);
      if (onAnalysisCompleted) {
        onAnalysisCompleted(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const overallScore = risk?.overall_score ?? risk?.score ?? null;
  const riskLevel = risk?.risk_level ?? risk?.level ?? 'PENDING';
  const contributors = risk?.top_contributors || [];
  const explanation = risk?.explanation || '';
  const aiStatus = risk?.ai_status || (risk ? 'AI_ANALYSIS_COMPLETE' : 'AI_ANALYSIS_PENDING');

  // Status badge styling per Section 19
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'AI_ANALYSIS_COMPLETE':
        return { label: 'AI ANALYSIS COMPLETE', bg: '#EAF6EC', color: '#1E7A34', border: '#B3DFBA' };
      case 'AI_ANALYSIS_UNAVAILABLE':
        return { label: 'AI ANALYSIS UNAVAILABLE', bg: '#FFF8E6', color: '#8A6100', border: '#F2DC9B' };
      case 'AI_ANALYSIS_PENDING':
      default:
        return { label: 'AI ANALYSIS PENDING', bg: '#F5F6F8', color: '#5A616B', border: '#D8DCE1' };
    }
  };

  const statusBadge = getStatusBadgeStyle(aiStatus);

  return (
    <div
      className="ai-review-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-surface)',
        padding: '20px',
      }}
    >
      {/* 1. Header Bar with Explicit AI Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '16px' }}>
              AI-Assisted Review
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: statusBadge.bg,
                color: statusBadge.color,
                border: `1px solid ${statusBadge.border}`,
                letterSpacing: '0.04em',
              }}
            >
              {statusBadge.label}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Explainable attention priority & risk assessment • Human official retains final decision authority
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleRunAnalysis}
          disabled={analyzing}
        >
          {analyzing ? 'Evaluating Risk Pipeline...' : '⚡ Re-evaluate Risk'}
        </Button>
      </div>

      {/* Error alert banner */}
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

      {/* Explicit AI Unavailable Banner */}
      {aiStatus === 'AI_ANALYSIS_UNAVAILABLE' && (
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
            <strong>AI Explanation Service Unavailable:</strong> Natural language generation is temporarily offline.
            The deterministic risk score and underlying evidence remain fully available for administrative review.
          </div>
        </div>
      )}

      {/* 2. Overall Risk Assessment Summary Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Combined Project Risk
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {overallScore !== null ? overallScore : '—'}
            </span>
            <RiskBadge level={riskLevel} score={overallScore} />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              (0–39 Low • 40–74 Medium • 75–100 High)
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-muted)' }}>
          <div>Evaluation Type: <strong>Deterministic Weighted Scoring</strong></div>
          <div>Advisory Target: <strong>Pre-Sanction Decision Support</strong></div>
        </div>
      </div>

      {/* 3. Natural-Language Advisory Explanation Box */}
      {explanation && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
            Advisory Explanation & Findings
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-text)',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}
          >
            {explanation}
          </div>
        </div>
      )}

      {/* 4. Contributing Signals Breakdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '14px' }}>
            Main Contributing Signals
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
            Ranked by Weighted Contribution
          </span>
        </div>
        <RiskBreakdown contributors={contributors} />
      </div>

      {/* 5. Expandable Structured Evidence Drawer */}
      <div style={{ marginTop: '4px' }}>
        <button
          type="button"
          onClick={() => setShowEvidence(!showEvidence)}
          aria-expanded={showEvidence}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{showEvidence ? '▾ Hide Evidence' : '▸ View Structured Evidence'}</span>
        </button>

        {showEvidence && (
          <div
            style={{
              marginTop: '10px',
              padding: '14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
              De-Identified Evidence Parameters (Data-Minimized)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Component Breakdown:</span>
                <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                  <li>Cost Anomaly: <strong>{risk?.component_scores?.cost_anomaly ?? 0} / 100</strong></li>
                  <li>Duplicate Risk: <strong>{risk?.component_scores?.duplicate ?? 0} / 100</strong></li>
                  <li>Specification Drift: <strong>{risk?.component_scores?.specification ?? 0} / 100</strong></li>
                  <li>Payment vs Progress: <strong>{risk?.component_scores?.payment_mismatch ?? 0} / 100</strong></li>
                  <li>Execution Delay: <strong>{risk?.component_scores?.delay ?? 0} / 100</strong></li>
                  <li>Statutory Compliance: <strong>{risk?.component_scores?.compliance ?? 0} / 100</strong></li>
                </ul>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Governance Standards:</span>
                <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                  <li>Sole Auth Boundary: <strong>Express Backend</strong></li>
                  <li>In-Process Duplicate: <strong>TF-IDF Cosine</strong></li>
                  <li>LLM Data Privacy: <strong>Zero PII Transmitted</strong></li>
                  <li>Officer Authority: <strong>Sole Final Decision</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Human-in-the-Loop Advisory Disclaimer */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '12px',
          fontSize: '11px',
          color: 'var(--color-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          <strong>Advisory Governance:</strong> AI risk scores identify works requiring attention. The final administrative decision belongs strictly to the authorized officer.
        </span>
        {risk?.analysis_id && (
          <span style={{ fontFamily: 'monospace' }}>
            ID: {risk.analysis_id}
          </span>
        )}
      </div>
    </div>
  );
}

export default AiReviewPanel;

