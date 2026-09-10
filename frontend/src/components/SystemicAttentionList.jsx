import React, { useState, useEffect } from 'react';
import Card from './Card';

export function SystemicAttentionList({ authFetch, state = null, limit = 10 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAttention() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (state) queryParams.set('state', state);
        if (limit) queryParams.set('limit', limit);
        const res = await authFetch(`/api/systemic/attention?${queryParams.toString()}`);
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
    fetchAttention();
    return () => {
      isMounted = false;
    };
  }, [authFetch, state, limit]);

  const attentionList = data?.attention_list || [];

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'ELEVATED_ATTENTION':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FFF0ED',
              color: 'var(--color-error)',
              border: '1px solid #F7C6C1',
            }}
          >
            ELEVATED ATTENTION
          </span>
        );
      case 'MODERATE_ATTENTION':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FFF8E6',
              color: '#8A6100',
              border: '1px solid #F2DC9B',
            }}
          >
            MODERATE ATTENTION
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#EAF6EC',
              color: '#1E7A34',
              border: '1px solid #B3DFBA',
            }}
          >
            STANDARD MONITORING
          </span>
        );
    }
  };

  return (
    <div className="systemic-attention-list">
      <Card
        title="Supervisory Attention Ranking"
        subtitle="Transparent multi-signal prioritization to assist central and state oversight officers in identifying systemic friction areas"
      >
        {/* Methodological Notice */}
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: '#EDF4FC',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #BDD7F5',
            fontSize: '12px',
            color: '#1D3A5F',
            marginBottom: 'var(--space-4)',
          }}
        >
          ℹ <strong>Deterministic Supervisory Indicator:</strong> {data?.formula_notice || 'Score combines High-Risk concentration (40%), Compliance exceptions (25%), Execution gap (20%), and Inspection escalations (15%). It is NOT a project risk score.'}
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Calculating supervisory attention scores...
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
        ) : attentionList.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No areas currently require elevated supervisory attention.
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
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Rank</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Region</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attention Score</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Supervisory Tier</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>High-Risk Rate</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Non-Compliance</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Execution Gaps</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Primary Drivers</th>
                </tr>
              </thead>
              <tbody>
                {attentionList.map((item, idx) => (
                  <tr key={item.region} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-muted)' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {item.region}
                      {item.state && item.state !== item.region && (
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 400 }}>
                          {item.state}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: item.systemic_attention_score >= 50 ? 'var(--color-error)' : 'var(--color-primary)' }}>
                        {item.systemic_attention_score}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}> / 100</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{getTierBadge(item.attention_level)}</td>
                    <td style={{ padding: '10px 12px' }}>{item.high_risk_rate}%</td>
                    <td style={{ padding: '10px 12px' }}>{item.non_compliant_rate}%</td>
                    <td style={{ padding: '10px 12px' }}>{item.execution_mismatch_rate}%</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      {item.key_drivers?.map((d, dIdx) => (
                        <div key={dIdx} style={{ color: 'var(--color-text)' }}>
                          • {d}
                        </div>
                      ))}
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

export default SystemicAttentionList;

