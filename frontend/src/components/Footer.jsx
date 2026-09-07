import React from 'react';

/**
 * Common Footer per design.md §5.8 & §5.45
 * Low visual noise, formal government attribution, and clear AI framing.
 */
export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#12253E',
        color: '#D8DCE1',
        borderTop: '1px solid var(--color-border)',
        marginTop: 'auto',
        fontSize: 'var(--font-size-sm)',
        paddingTop: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-8)',
          }}
        >
          {/* Col 1: Identity & Scheme */}
          <div>
            <div
              style={{
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 'var(--font-size-base)',
                marginBottom: 'var(--space-2)',
              }}
            >
              MPLADS AI Risk Monitoring
            </div>
            <p style={{ color: '#9EBAE0', fontSize: '13px', lineHeight: 1.6 }}>
              Decision Support & Anomaly Monitoring Platform developed for MoSPI (Data Informatics & Innovation Division).
              Prototype for Smart India Hackathon (SIH 2026) — Problem Statement 26102.
            </p>
          </div>

          {/* Col 2: Core Trust Principle */}
          <div>
            <div
              style={{
                color: '#FFFFFF',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}
            >
              Administrative Accountability
            </div>
            <p style={{ color: '#9EBAE0', fontSize: '13px', lineHeight: 1.6 }}>
              AI models identify statistical outliers and historical patterns. AI never autonomously sanctions,
              rejects, or stops payments. All material decisions remain with designated government authorities.
            </p>
          </div>

          {/* Col 3: Standards & Accessibility */}
          <div>
            <div
              style={{
                color: '#FFFFFF',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}
            >
              System Standards
            </div>
            <ul style={{ listStyle: 'none', color: '#9EBAE0', fontSize: '13px', lineHeight: 1.8 }}>
              <li>• Target WCAG 2.1 AA Accessibility Compliant</li>
              <li>• English Language Administrative Interface</li>
              <li>• Explainable Weighted Scoring Architecture</li>
              <li>• Append-Only Official Audit Logging</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            fontSize: '12px',
            color: '#7D95B2',
          }}
        >
          <div>
            © 2026 Ministry of Statistics & Programme Implementation (MoSPI) • Government of India
          </div>
          <div>
            SIH Problem Statement 26102 Prototype • Phase 1 Foundation
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

