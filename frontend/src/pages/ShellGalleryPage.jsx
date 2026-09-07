import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import { StatusBadge, RiskBadge, ComplianceBadge } from '../components/Badge';

export function ShellGalleryPage() {
  const [activeRole, setActiveRole] = useState('DISTRICT_AUTHORITY');
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus({ success: false, message: 'Backend offline' }));
  }, []);

  const sampleProjects = [
    {
      id: 'PRJ-2026-001',
      title: 'Construction of Community Hall, Ward 4',
      category: 'Community Hall',
      district: 'Indore',
      cost: '₹38,00,000',
      status: 'DISTRICT_REVIEW',
      riskLevel: 'HIGH',
      riskScore: 87,
      compliance: 'REVIEW_REQUIRED',
      updated: '2 hours ago',
    },
    {
      id: 'PRJ-2026-002',
      title: 'RCC Drainage Pipeline, Sector 9',
      category: 'Sanitation',
      district: 'Indore',
      cost: '₹18,50,000',
      status: 'SANCTIONED',
      riskLevel: 'LOW',
      riskScore: 24,
      compliance: 'COMPLIANT',
      updated: '1 day ago',
    },
    {
      id: 'PRJ-2026-003',
      title: 'Bituminous Road Widening from Station to Market',
      category: 'Roads & Bridges',
      district: 'Bhopal',
      cost: '₹63,20,000',
      status: 'CLARIFICATION_REQUIRED',
      riskLevel: 'HIGH',
      riskScore: 92,
      compliance: 'NON_COMPLIANT',
      updated: '3 days ago',
    },
    {
      id: 'PRJ-2026-004',
      title: 'Solar High-Mast Lighting at Panchayat Bhawan',
      category: 'Rural Electrification',
      district: 'Ujjain',
      cost: '₹12,00,000',
      status: 'IN_PROGRESS',
      riskLevel: 'MEDIUM',
      riskScore: 58,
      compliance: 'COMPLIANT',
      updated: '5 days ago',
    },
  ];

  const tableColumns = [
    { header: 'Project ID', key: 'id', width: '130px' },
    {
      header: 'Project Title',
      key: 'title',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{val}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
            {row.category} • {row.district}
          </div>
        </div>
      ),
    },
    { header: 'Sanctioned Cost', key: 'cost', align: 'right' },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'AI Risk Finding',
      key: 'riskLevel',
      render: (val, row) => <RiskBadge level={val} score={row.riskScore} />,
    },
    {
      header: 'Rule Compliance',
      key: 'compliance',
      render: (val) => <ComplianceBadge status={val} />,
    },
    {
      header: 'Action',
      key: 'action',
      align: 'center',
      render: () => (
        <Button size="sm" variant="secondary">
          View Detail
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flex: 1, backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar Navigation Shell */}
      <Sidebar activeRole={activeRole} onRoleChange={setActiveRole} />

      {/* Main Shell Workspace & Component Gallery */}
      <main style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Workspace Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-6)',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <h2>Foundation Portal Shell & Design Token Gallery</h2>
              <p className="text-muted text-sm">
                Verifying design tokens, reusable components, and role layouts.
              </p>
            </div>

            {/* Health Indicator Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: healthStatus?.success ? '#EAF6EC' : '#FFF8E6',
                border: `1px solid ${healthStatus?.success ? '#B3DFBA' : '#F2DC9B'}`,
                fontSize: '12px',
                fontWeight: 600,
                color: healthStatus?.success ? 'var(--color-success)' : 'var(--color-warning)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: healthStatus?.success ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              />
              <span>Backend API: {healthStatus?.success ? 'ONLINE (200 OK)' : 'DISCONNECTED'}</span>
            </div>
          </div>

          {/* Component Section 1: Buttons & Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <Card title="Button Component System" subtitle="Per design.md §5.37 with --color-focus rings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="secondary">Secondary Action</Button>
                  <Button variant="sensitive">Sensitive Action</Button>
                  <Button variant="outline">Outline</Button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <Button size="sm">Small (32px)</Button>
                  <Button size="md">Medium (40px)</Button>
                  <Button size="lg">Large (48px)</Button>
                </div>
                <div>
                  <Button isLoading variant="primary">
                    Processing
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Badge Architecture" subtitle="Structural separation: AI Risk (Pill) vs. Rule (Square/Dot)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    AI Risk Badges (Rounded Pill)
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <RiskBadge level="HIGH" score={92} />
                    <RiskBadge level="MEDIUM" score={64} />
                    <RiskBadge level="LOW" score={18} />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Deterministic Compliance Badges (Square/Dot Marker)
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <ComplianceBadge status="COMPLIANT" />
                    <ComplianceBadge status="REVIEW_REQUIRED" detail="SC/ST Quota" />
                    <ComplianceBadge status="NON_COMPLIANT" detail="UC Overdue" />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Canonical Project Lifecycle Badges
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <StatusBadge status="RECOMMENDED" />
                    <StatusBadge status="UNDER_REVIEW" />
                    <StatusBadge status="CLARIFICATION" />
                    <StatusBadge status="SANCTIONED" />
                    <StatusBadge status="IN_PROGRESS" />
                    <StatusBadge status="COMPLETED" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Component Section 2: Table Shell */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <Card
              title="Project Data Table Shell"
              subtitle="Row height 48px, numeric right-alignment, row hover and pagination per design.md §5.12"
              headerAction={
                <Button size="sm" variant="primary">
                  + New Recommendation
                </Button>
              }
            >
              <Table
                columns={tableColumns}
                data={sampleProjects}
                pagination={{
                  from: 1,
                  to: 4,
                  total: 4,
                  currentPage: 1,
                  totalPages: 1,
                  onPrev: () => {},
                  onNext: () => {},
                }}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ShellGalleryPage;

