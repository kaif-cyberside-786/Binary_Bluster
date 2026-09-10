import React, { useState, useEffect } from 'react';
import Card from './Card';
import { RiskBadge } from './Badge';

export function SystemicGeographicPanel({ authFetch, scope = 'ministry', defaultState = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState(defaultState || '');

  useEffect(() => {
    let isMounted = true;
    async function fetchGeographic() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (selectedState) queryParams.set('state', selectedState);
        const res = await authFetch(`/api/systemic/geographic?${queryParams.toString()}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (isMounted) {
          setData(json.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchGeographic();
    return () => {
      isMounted = false;
    };
  }, [authFetch, selectedState]);

  const breakdown = data?.breakdown || [];

  const formatCurrency = (val = 0) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="systemic-geographic-panel">
      <Card
        title={
          data?.grouping_dimension === 'STATE'
            ? 'State-by-State Systemic Distribution'
            : `District-by-District Systemic Breakdown (${data?.state || selectedState})`
        }
        subtitle="Regional comparative risk distribution, compliance findings, and inspection activities"
      >
        {/* Controls Bar for Ministry Scope */}
        {scope === 'ministry' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
              Analytics Drill-down:
            </span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                backgroundColor: 'white',
              }}
            >
              <option value="">All States / UTs (National View)</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Gujarat">Gujarat</option>
            </select>
            {selectedState && (
              <button
                type="button"
                onClick={() => setSelectedState('')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Reset to Pan-India
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading geographic analytics...
          </div>
        ) : error ? (
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: '#FFF0ED',
              border: '1px solid #F7C6C1',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        ) : breakdown.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No geographic distribution records found for the selected scope.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Region</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Total Works</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Monitored Outlay</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>High Risk</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Non-Compliant</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Execution Gaps</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Inspections</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.region} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {row.region}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{row.project_count}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatCurrency(row.total_value)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: row.high_risk_count > 0 ? 'var(--color-error)' : 'inherit' }}>
                          {row.high_risk_count}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>({row.high_risk_rate}%)</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: row.non_compliant_count > 0 ? '#B3261E' : 'inherit' }}>
                      {row.non_compliant_count}
                    </td>
                    <td style={{ padding: '10px 12px', color: row.execution_mismatch_count > 0 ? '#B8860B' : 'inherit' }}>
                      {row.execution_mismatch_count}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span>{row.inspection_count} total</span>
                      {row.inspection_escalate_count > 0 && (
                        <span style={{ color: 'var(--color-error)', fontWeight: 600, marginLeft: '6px' }}>
                          ({row.inspection_escalate_count} escalated)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SystemicGeographicPanel;

