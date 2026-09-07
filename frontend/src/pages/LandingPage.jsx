import React from 'react';
import { Button } from '../components/Button';
import { RiskBadge, StatusBadge, ComplianceBadge } from '../components/Badge';
import '../styles/landing.css';

/**
 * Public Landing Page per design.md §5.45
 * Visual structure:
 * Header -> Hero -> The Problem -> How Our Solution Helps ->
 * AI Capabilities -> How It Works -> Who Uses It -> Trust/Human Decision ->
 * Sign In CTA -> Footer
 */
export function LandingPage({ onSignInClick }) {
  return (
    <div className="landing-page">
      {/* 1. HERO SECTION */}
      <section className="landing-hero">
        <div className="container" style={{ maxWidth: '880px' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#EDF4FC',
              color: 'var(--color-primary)',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: 'var(--space-4)',
              border: '1px solid #BDD7F5',
            }}
          >
            Smart India Hackathon 2026 • Problem Statement 26102
          </div>

          <h1
            style={{
              fontSize: '34px',
              lineHeight: 1.2,
              marginBottom: 'var(--space-4)',
              letterSpacing: '-0.02em',
            }}
          >
            Intelligent Risk Monitoring & Decision Support for MPLADS
          </h1>

          <p
            style={{
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-muted)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            Every MP receives ₹5 crore annually for local public works across ~790 constituencies.
            While execution data is digitized on eSAKSHI, records are reviewed in isolation.
            Our platform provides a continuous analytics layer that surfaces cost outliers,
            duplicate works, and execution bottlenecks before public funds are disbursed.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button size="lg" variant="primary" onClick={onSignInClick}>
              Official Portal Sign In
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                document.getElementById('problem-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Framework
            </Button>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM SECTION */}
      <section id="problem-section" className="landing-section">
        <div className="container">
          <span className="section-tag">Current Challenge</span>
          <h2 className="section-heading">Information Asymmetry Across Lakhs of Scheme Records</h2>
          <p className="section-subheading">
            Digitizing transactions into a central portal ensures fund-flow transparency, but digitization alone
            does not analyze patterns. District officials review estimates one file at a time without national benchmarking.
          </p>

          <div className="landing-grid">
            <div className="stat-box">
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Isolated Estimates
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                Cost estimates are scrutinized against local schedules of rates, but cannot easily be compared against
                comparable works sanctioned across neighboring districts or states.
              </p>
            </div>

            <div className="stat-box">
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Unchecked Overlaps
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                Free-text descriptions vary in phrasing, making duplicate sanctions for the same road, school, or
                community hall across consecutive years difficult to detect manually.
              </p>
            </div>

            <div className="stat-box">
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Random 1% Inspection
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                State guidelines mandate physical inspection of at least 1% of works annually. Today, this limited
                inspection capacity is selected almost at random rather than targeted by risk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW OUR SOLUTION HELPS */}
      <section className="landing-section alt-bg">
        <div className="container">
          <span className="section-tag">Intervention Architecture</span>
          <h2 className="section-heading">Decision Support Alongside Existing Government Workflows</h2>
          <p className="section-subheading">
            Our platform does not replace eSAKSHI and does not alter statutory authority. It operates as a parallel
            intelligence layer providing evidence-backed signals directly at the point of administrative decision.
          </p>

          <div className="landing-grid">
            <div className="landing-card">
              <div className="landing-card-title">Pre-Sanction Peer Benchmarking</div>
              <div className="landing-card-body">
                When a District Authority reviews a recommendation, statistical models evaluate the cost per unit against
                historical works of the same category and geographical peer group, flagging significant deviations.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">NLP & Geo-Similarity Matching</div>
              <div className="landing-card-body">
                Natural Language Processing compares work descriptions and geographical proximity against past sanctions,
                surfacing potential duplicates before a second payment is committed.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">Risk-Targeted 1% Inspections</div>
              <div className="landing-card-body">
                Turns the statutory 1% physical-inspection quota from a random sample into a risk-ranked priority queue.
                The same administrative inspection budget catches more genuine issues.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">Deterministic Compliance Tracking</div>
              <div className="landing-card-body">
                Tracks SC/ST area expenditure quotas (≥15% SC, ≥7.5% ST), 1-year timeline guidelines, and overdue
                Utilization Certificates via transparent, auditable rules rather than probabilistic models.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI CAPABILITIES (HONEST FRAMING) */}
      <section className="landing-section">
        <div className="container">
          <span className="section-tag">Technical Approach</span>
          <h2 className="section-heading">Explainable Machine Learning Without Exaggeration</h2>
          <p className="section-subheading">
            Public-finance monitoring requires transparent auditability. We avoid black-box deep learning and never
            make exaggerated claims of automated "fraud detection."
          </p>

          <div className="landing-grid">
            <div className="landing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="landing-card-title" style={{ margin: 0 }}>Cost Anomaly Detection</span>
                <RiskBadge level="HIGH" score={87} />
              </div>
              <div className="landing-card-body">
                Uses robust z-score, IQR, and peer-group medians. Outputs explainable deviations such as:
                <div style={{ backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '4px', margin: '8px 0', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '12px' }}>
                  Proposed: ₹63L vs. Peer Median: ₹22L (+186%)
                </div>
                Flags are advisory; officials decide whether local terrain or material grade justifies the cost.
              </div>
            </div>

            <div className="landing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="landing-card-title" style={{ margin: 0 }}>Historical Duplicate Detection</span>
                <RiskBadge level="HIGH" score={93} />
              </div>
              <div className="landing-card-body">
                Combines TF-IDF semantic embeddings with ward/location proximity to find overlapping works across years:
                <div style={{ backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '4px', margin: '8px 0', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '12px' }}>
                  Matched: Community Hall Ward 12 (2023) • Similarity: 93% • 0.8 km
                </div>
                Allows the Collector to verify whether the asset was already constructed.
              </div>
            </div>

            <div className="landing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="landing-card-title" style={{ margin: 0 }}>Execution & Payment Mismatch</span>
                <ComplianceBadge status="REVIEW_REQUIRED" detail="Financial ahead" />
              </div>
              <div className="landing-card-body">
                Compares reported physical completion against cumulative financial disbursement.
                <div style={{ backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '4px', margin: '8px 0', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '12px' }}>
                  Physical Progress: 30% • Financial Progress: 85% (Mismatch)
                </div>
                Recommends ground verification before final installment release.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (WORKFLOW) */}
      <section className="landing-section alt-bg">
        <div className="container">
          <span className="section-tag">End-to-End Workflow</span>
          <h2 className="section-heading">From Recommendation to Inspection</h2>
          <p className="section-subheading">
            Structured administrative lifecycle ensuring continuous oversight across all tiers of governance.
          </p>

          <div className="workflow-container">
            <div className="workflow-step">
              <div className="workflow-number">1</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>MP Recommends Work</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  The Member of Parliament submits development recommendations to the District Collector.
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">2</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>District Reviews with AI Evidence</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  District Authority receives real-time cost-anomaly benchmarks, historical duplicate matches, and compliance checks.
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">3</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>Official Human Decision</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Collector decides: Sanction, Hold for clarification, or Send for technical re-estimation. AI never auto-approves.
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">4</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>Implementing Agency Executes</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Assigned agency updates physical milestones, raises installment requests, and uploads Utilization Certificates.
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">5</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>System Monitors Continuously</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Automated checks monitor project staleness, payment-progress alignment, and missing UCs over time.
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-number">6</div>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>Mandated 1% Inspection Prioritization</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                  State Nodal Authorities allocate the statutory physical inspection quota against highest-risk projects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHO USES IT */}
      <section className="landing-section">
        <div className="container">
          <span className="section-tag">Stakeholder Workspaces</span>
          <h2 className="section-heading">Tailored Interfaces for Every Tier of Governance</h2>
          <p className="section-subheading">
            One common portal with role-specific visibility and strict access boundaries.
          </p>

          <div className="landing-grid">
            <div className="landing-card">
              <div className="landing-card-title">Members of Parliament (MP)</div>
              <div className="landing-card-body">
                Constituency dashboard tracking recommendation status, fund utilization pace, and continuous SC/ST quota compliance.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">District Authorities (Collectors)</div>
              <div className="landing-card-body">
                Pre-sanction AI review panel, engineering comparisons, contractor suitability signals, and sanction decision interface.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">State Nodal Authorities</div>
              <div className="landing-card-body">
                State-wide risk monitoring, 1% physical inspection quota assignment, and agency concentration analytics across districts.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">Ministry (MoSPI / DIID)</div>
              <div className="landing-card-body">
                National trend analytics, state-level comparison charts, systemic risk indicators, and policy-level decision support.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">Implementing Agencies / Engineers</div>
              <div className="landing-card-body">
                Technical reporting, milestone updates, disbursement documentation, and Utilization Certificate uploads.
              </div>
            </div>

            <div className="landing-card">
              <div className="landing-card-title">Auditors (CAG-Facing)</div>
              <div className="landing-card-body">
                Read-only access to historical projects, risk evolution timelines, officer decisions, and immutable audit logs.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRUST & HUMAN DECISION */}
      <section className="landing-section alt-bg">
        <div className="container">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-8)',
              maxWidth: '840px',
              margin: '0 auto',
            }}
          >
            <span className="section-tag">Core Constitutional Principle</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-3)' }}>
              AI Points. Authorized Humans Decide.
            </h2>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text)', lineHeight: 1.7, marginBottom: 'var(--space-4)' }}>
              Under Indian public administration and financial rules, discretion and accountability rest solely with
              designated government authorities. This platform enforces this principle by design:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', lineHeight: 1.8 }}>
              <li><strong>Zero Autonomous Enforcement:</strong> No AI model can sanction, reject, or halt payments.</li>
              <li><strong>Explainable Evidence:</strong> Every flag displays the comparison baseline, peer median, and exact reasoning.</li>
              <li><strong>Tamper-Evident Audit:</strong> Every review, decision, and manual override is permanently logged.</li>
              <li><strong>Data Minimization:</strong> Structured evidence only; no sensitive personal accounts sent to external LLMs.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8. SIGN IN CTA */}
      <section className="landing-section" style={{ textAlign: 'center', backgroundColor: '#EDF4FC' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '26px', marginBottom: 'var(--space-2)' }}>
            Access the Administrative Portal
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-base)' }}>
            Authorized officials can log in with their government credentials to review pending recommendations,
            track constituency progress, or inspect risk queues.
          </p>
          <Button size="lg" variant="primary" onClick={onSignInClick}>
            Proceed to Official Sign In
          </Button>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

