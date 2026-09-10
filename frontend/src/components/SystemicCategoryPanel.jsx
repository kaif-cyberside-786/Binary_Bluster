import React, { useState, useEffect } from 'react';
import Card from './Card';

export function SystemicCategoryPanel({ authFetch, state = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCategories() {
      setLoading(true);
      setError(null);
      try {
        const query = state ? `?state=${encodeURIComponent(state)}` : '';
        const res = await authFetch(`/api/systemic/categories${query}`);
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
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [authFetch, state]);

  const categories = data?.categories || [];

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
    <div className="systemic-category-panel">
      <Card
        title="Sectoral & Category Portfolio Patterns"
        subtitle="Distribution of works, capital outlay, risk concentration, and non-compliance across MPLADS categories"
      >
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading sectoral pattern analytics...
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
        ) : categories.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No category distribution data found.
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
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>MPLADS Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Total Works</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Allocated Outlay</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>High Risk Works</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Avg Risk Score</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Non-Compliant</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Execution Gaps</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.category} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {cat.category}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{cat.project_count}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatCurrency(cat.total_outlay)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: cat.high_risk_count > 0 ? 'var(--color-error)' : 'inherit' }}>
                          {cat.high_risk_count}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>({cat.high_risk_rate}%)</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {cat.average_risk_score !== null ? `${cat.average_risk_score}/100` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: cat.non_compliant_count > 0 ? '#B3261E' : 'inherit' }}>
                      {cat.non_compliant_count}
                    </td>
                    <td style={{ padding: '10px 12px', color: cat.execution_mismatch_count > 0 ? '#B8860B' : 'inherit' }}>
                      {cat.execution_mismatch_count}
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

export default SystemicCategoryPanel;

