import React, { useState, useEffect } from 'react';
import Card from './Card';

/**
 * Agency Concentration Analytics Panel
 * Product 2 of Phase 12 per architecture.md §10.1, design.md §5.33, prd.md §12.7
 * Systemic work-share and financial-value distribution across public executing agencies.
 * Uses Herfindahl-Hirschman Index (HHI) and statistical threshold flag (>35%).
 * Explicitly separate from per-project suitability ranking.
 */
export function AgencyConcentrationPanel({
  district = 'Indore',
  state = 'Madhya Pradesh',
  year = '2026',
  authFetch,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(year);

  useEffect(() => {
    let isMounted = true;
    async function fetchConcentration() {
      if (!authFetch) return;
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          district,
          state,
          year: selectedYear,
        }).toString();

        const res = await authFetch(`/api/agencies/concentration?${query}`);
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error?.message || 'Failed to fetch agency concentration data');
        }
        if (isMounted) {
          setData(body.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error fetching concentration data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchConcentration();
    return () => {
      isMounted = false;
    };
  }, [district, state, selectedYear, authFetch]);

  const agencies = data?.agencies || [];
  const hhi = data?.herfindahl_index || 0;
  const level = data?.concentration_level || 'COMPETITIVE';
  const totalOutlay = data?.total_district_outlay || 0;
  const totalWorks = data?.total_active_works || 0;

  let levelBg = '#EDF7ED';
  let levelColor = 'var(--color-success)';
  if (level === 'MODERATE') {
    levelBg = '#FFF8E6';
    levelColor = '#8A6100';
  } else if (level === 'HIGH') {
    levelBg = '#FDECEB';
    levelColor = 'var(--color-error)';
  }

  return (
    <Card
      title={`AGENCY WORK-SHARE — ${district} District, ${selectedYear}`}
      subtitle="Systemic work-count & financial-value concentration analytics (PRD §12.7, Design §5.33)"
    >
      {/* Systemic Framing Banner */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#EDF4FC',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#1E3A8A',
          marginBottom: 'var(--space-4)',
          lineHeight: 1.5,
        }}
      >
        <strong>Systemic Concentration Oversight (PRD §12.7):</strong> Monitors the distribution of public works outlay to identify disproportionate absorption by a small set of executing agencies. Analytics are statistical/economic and separate from per-project suitability recommendations.
      </div>

      {/* Top Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Herfindahl Index (HHI)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
            {Math.round(hhi)} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)' }}>/ 10,000</span>
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: levelBg,
              color: levelColor,
            }}
          >
            {level} CONCENTRATION
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total District Outlay
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
            ₹{(totalOutlay / 10000000).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500 }}>Cr</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Active Works: <strong>{totalWorks}</strong>
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Concentration Flagged
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: data?.flagged_agencies_count > 0 ? 'var(--color-error)' : 'var(--color-success)', marginTop: '2px' }}>
            {data?.flagged_agencies_count || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-muted)' }}>Agencies</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Threshold: <strong>&gt;35.0% Share</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
          Computing systemic concentration statistics...
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--space-3)', color: 'var(--color-error)', fontSize: '12px' }}>
          ⚠ {error}
        </div>
      ) : agencies.length === 0 ? (
        <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
          No work-share records found for {district} in {selectedYear}.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Executing Agency</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Works</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Value Outlay</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)', minWidth: '160px' }}>Work-Share %</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => {
                const isFlagged = agency.is_concentration_flagged;
                return (
                  <tr
                    key={agency.agency_id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: isFlagged ? '#FFFDF5' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {agency.name}
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 400 }}>
                        <code>{agency.agency_id}</code>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#E2E8F0', borderRadius: '3px' }}>
                        {agency.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{agency.work_count}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      ₹{(agency.total_value / 10000000).toFixed(2)} Cr
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, agency.share_of_value_percentage)}%`,
                              height: '100%',
                              backgroundColor: isFlagged ? 'var(--color-warning)' : 'var(--color-secondary)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '38px', textAlign: 'right' }}>
                          {agency.share_of_value_percentage?.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {isFlagged ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#FFF8E6',
                            color: '#8A6100',
                            border: '1px solid #F2DC9B',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚠ Above Threshold (&gt;35%)
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#EDF7ED',
                            color: 'var(--color-success)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Diversified
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default AgencyConcentrationPanel;

