import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';

/**
 * Agency Suitability Card
 * Product 1 of Phase 12 per architecture.md §10.1, design.md §5.33, prd.md §12.8
 * Strictly advisory ranking for District Authority during sanction review.
 * Enforces the statutory concentration guardrail: caps/flags agencies holding >35% work share.
 * "Select Agency" only pre-fills assigned agency on the sanction form — never auto-sanctions.
 */
export function AgencySuitabilityCard({
  category,
  estimatedCost,
  district = 'Indore',
  state = 'Madhya Pradesh',
  selectedAgencyId,
  onSelectAgency,
  authFetch,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedAgencyId, setExpandedAgencyId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSuitability() {
      if (!authFetch) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/agencies/suitability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            estimated_cost: estimatedCost,
            district,
            state,
          }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error?.message || 'Failed to calculate agency suitability');
        }
        if (isMounted) {
          setData(body.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error fetching suitability ranking');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSuitability();
    return () => {
      isMounted = false;
    };
  }, [category, estimatedCost, district, state, authFetch]);

  const toggleExpand = (agencyId) => {
    setExpandedAgencyId((prev) => (prev === agencyId ? null : agencyId));
  };

  const suggestedAgencies = data?.suggested_agencies || [];
  const guardrailActive = data?.concentration_guardrail_applied || false;

  return (
    <Card
      title="SUGGESTED AGENCIES (advisory)"
      subtitle="Historical track-record ranking based on completion rate, cost fidelity, timeliness, and inspections"
    >
      {/* Statutory Advisory Disclaimer (§12) */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#F1F5F9',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: '4px',
          fontSize: '12px',
          color: 'var(--color-muted)',
          marginBottom: 'var(--space-3)',
          lineHeight: 1.5,
        }}
      >
        <strong>Advisory Intelligence Only (Rule §12):</strong> Suggestions are computed from historical execution track records and work-share metrics. Final selection remains exclusively with the District Authority.
      </div>

      {/* Concentration Guardrail Active Warning (PRD §12.8) */}
      {guardrailActive && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            backgroundColor: '#FFF8E6',
            border: '1px solid #F2DC9B',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#8A6100',
            marginBottom: 'var(--space-3)',
            lineHeight: 1.4,
          }}
        >
          <strong>⚠ Concentration Guardrail Active:</strong> One or more eligible agencies hold &gt;35% of district work share. To prevent reinforcing single-agency monopolies, recommendation scores for dominant agencies are capped, promoting work diversification.
        </div>
      )}

      {loading ? (
        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
          Evaluating agency track records...
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--space-3)', color: 'var(--color-error)', fontSize: '12px' }}>
          ⚠ {error}
        </div>
      ) : suggestedAgencies.length === 0 ? (
        <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
          No eligible implementing agencies registered in {district}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suggestedAgencies.map((agency) => {
            const isSelected = selectedAgencyId === agency.agency_id;
            const isExpanded = expandedAgencyId === agency.agency_id;

            let scoreBg = '#EDF7ED';
            let scoreColor = 'var(--color-success)';
            if (agency.suitability_score < 75) {
              scoreBg = '#FFF8E6';
              scoreColor = '#8A6100';
            }
            if (agency.suitability_score < 60) {
              scoreBg = '#FDECEB';
              scoreColor = 'var(--color-error)';
            }

            return (
              <div
                key={agency.agency_id}
                style={{
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                  padding: '10px 12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#E2E8F0',
                        color: 'var(--color-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {agency.rank}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {agency.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Type: <strong>{agency.type}</strong> • ID: <code>{agency.agency_id}</code>
                        {agency.district_work_share_percentage > 0 && (
                          <span style={{ marginLeft: '8px' }}>
                            • District Share: <strong>{agency.district_work_share_percentage.toFixed(1)}%</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: scoreBg,
                        color: scoreColor,
                        fontWeight: 700,
                        fontSize: '13px',
                        textAlign: 'center',
                        minWidth: '38px',
                      }}
                      title={`Suitability Score: ${agency.suitability_score}/100`}
                    >
                      {agency.suitability_score}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(agency.agency_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: 'var(--color-secondary)',
                        textDecoration: 'underline',
                        padding: '4px',
                      }}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide Details' : 'Details'}
                    </button>

                    {onSelectAgency && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => onSelectAgency(agency.agency_id)}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          height: '28px',
                        }}
                      >
                        {isSelected ? '✓ Selected' : 'Select Agency'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Concentration Warning Flag Banner */}
                {agency.concentration_warning && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: '#8A6100',
                      backgroundColor: '#FFFDF5',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      borderLeft: '3px solid #B8860B',
                    }}
                  >
                    {agency.concentration_message}
                  </div>
                )}

                {/* Expandable Factor Breakdown */}
                {isExpanded && agency.metrics && (
                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px dashed var(--color-border)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Completion Rate:</span>{' '}
                      <strong>{agency.metrics.completion_rate?.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Avg Delay:</span>{' '}
                      <strong>{agency.metrics.avg_delay_days} days</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Cost Deviation:</span>{' '}
                      <strong>{agency.metrics.cost_deviation_percentage?.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Adverse Inspections:</span>{' '}
                      <strong>{agency.metrics.adverse_inspections ?? 0}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-muted)' }}>Raw Track Score:</span>{' '}
                      <strong>{agency.raw_score}/100</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default AgencySuitabilityCard;

