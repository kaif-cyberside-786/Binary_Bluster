import React from 'react';

/**
 * StatusBadge per design.md §5.39
 * Maps canonical lifecycle states from architecture.md §10.1:
 * MP_RECOMMENDED -> RECOMMENDED
 * DISTRICT_REVIEW -> UNDER REVIEW
 * CLARIFICATION_REQUIRED / HELD -> CLARIFICATION
 * SANCTIONED -> SANCTIONED
 * IN_PROGRESS -> IN PROGRESS
 * COMPLETED -> COMPLETED
 * INSPECTION_REQUIRED -> INSPECTION REQUIRED
 * ESCALATED -> ESCALATED
 */
export function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toUpperCase().replace(/\s+/g, '_');

  const statusConfig = {
    MP_RECOMMENDED: { label: 'RECOMMENDED', bg: '#EBF3FB', color: '#1D3A5F', border: '#B8D5F2' },
    RECOMMENDED: { label: 'RECOMMENDED', bg: '#EBF3FB', color: '#1D3A5F', border: '#B8D5F2' },
    DISTRICT_REVIEW: { label: 'UNDER REVIEW', bg: '#FFF8E6', color: '#8A6100', border: '#F2DC9B' },
    UNDER_REVIEW: { label: 'UNDER REVIEW', bg: '#FFF8E6', color: '#8A6100', border: '#F2DC9B' },
    CLARIFICATION_REQUIRED: { label: 'CLARIFICATION', bg: '#FFF0ED', color: '#B3261E', border: '#F7C6C1' },
    CLARIFICATION: { label: 'CLARIFICATION', bg: '#FFF0ED', color: '#B3261E', border: '#F7C6C1' },
    HELD: { label: 'HELD', bg: '#FFF0ED', color: '#B3261E', border: '#F7C6C1' },
    SANCTIONED: { label: 'SANCTIONED', bg: '#EAF6EC', color: '#1E7A34', border: '#B3DFBA' },
    IN_PROGRESS: { label: 'IN PROGRESS', bg: '#EDF4FC', color: '#2B6CB0', border: '#BDD7F5' },
    COMPLETED: { label: 'COMPLETED', bg: '#EAF6EC', color: '#1E7A34', border: '#B3DFBA' },
    INSPECTION_REQUIRED: { label: 'INSPECTION REQUIRED', bg: '#FFF8E6', color: '#8A6100', border: '#F2DC9B' },
    ESCALATED: { label: 'ESCALATED', bg: '#FFF0ED', color: '#B3261E', border: '#F7C6C1' },
  };

  const current = statusConfig[normalized] || {
    label: status || 'UNKNOWN',
    bg: '#F5F6F8',
    color: '#5A616B',
    border: '#D8DCE1',
  };

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
      }}
    >
      {current.label}
    </span>
  );
}

/**
 * RiskBadge per design.md §5.16 & §5.39
 * Shape: Rounded pill shape for AI-derived risk findings.
 * Levels: HIGH (75-100), MEDIUM (40-74), LOW (0-39).
 * Always includes text + numeric score or level (never color alone).
 */
export function RiskBadge({ level, score = null, className = '' }) {
  const normalized = (level || '').toUpperCase();

  const riskConfig = {
    HIGH: { label: 'HIGH RISK', bg: '#FDECEB', color: 'var(--color-error)', border: '#F8B4AF' },
    MEDIUM: { label: 'MEDIUM RISK', bg: '#FFF8E6', color: 'var(--color-warning)', border: '#F2DC9B' },
    LOW: { label: 'LOW RISK', bg: '#EAF6EC', color: 'var(--color-success)', border: '#B3DFBA' },
  };

  const current = riskConfig[normalized] || {
    label: level || 'PENDING',
    bg: '#F5F6F8',
    color: 'var(--color-muted)',
    border: 'var(--color-border)',
  };

  return (
    <span
      className={`risk-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 700,
        borderRadius: '9999px', // Rounded pill shape
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        lineHeight: 1.3,
      }}
    >
      <span>{current.label}</span>
      {score !== null && score !== undefined && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>({score})</span>
      )}
    </span>
  );
}

/**
 * ComplianceBadge per design.md §5.19 & §5.39
 * Shape: Square/dot marker shape to structurally distinguish deterministic rule
 * outcomes from AI risk findings (AI = pill, Rule = square/dot).
 * Statuses: COMPLIANT, REVIEW REQUIRED, NON COMPLIANT.
 */
export function ComplianceBadge({ status, detail = null, className = '' }) {
  const normalized = (status || '').toUpperCase().replace(/\s+/g, '_');

  const complianceConfig = {
    COMPLIANT: { label: 'COMPLIANT', color: 'var(--color-success)', dotColor: '#1E7A34', bg: '#FFFFFF' },
    REVIEW_REQUIRED: { label: 'REVIEW REQUIRED', color: 'var(--color-warning)', dotColor: '#B8860B', bg: '#FFFFFF' },
    NON_COMPLIANT: { label: 'NON COMPLIANT', color: 'var(--color-error)', dotColor: '#B3261E', bg: '#FFFFFF' },
  };

  const current = complianceConfig[normalized] || {
    label: status || 'CHECK PENDING',
    color: 'var(--color-muted)',
    dotColor: '#5A616B',
    bg: '#FFFFFF',
  };

  return (
    <span
      className={`compliance-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)', // Square/rectangular per §5.19
        border: '1px solid var(--color-border)',
        backgroundColor: current.bg,
        color: current.color,
        lineHeight: 1.3,
      }}
    >
      {/* Dot marker */}
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: current.dotColor,
          display: 'inline-block',
        }}
      />
      <span>{current.label}</span>
      {detail && <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>• {detail}</span>}
    </span>
  );
}

export default {
  StatusBadge,
  RiskBadge,
  ComplianceBadge,
};

