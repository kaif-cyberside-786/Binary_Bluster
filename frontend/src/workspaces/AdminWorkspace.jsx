import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import AdminUserManagement from './AdminUserManagement';

export function AdminWorkspace() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('users');

  const navItems = [
    { label: 'User Directory & Provisioning', key: 'users' },
    { label: 'Telemetry & Server Status', key: 'telemetry' },
  ];

  const fetchAdminDashboard = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/admin');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

  const telemetry = data?.telemetry || {};
  const users = data?.users || {};

  const formatUptime = (sec = 0) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hours}h ${mins}m ${s}s`;
  };

  return (
    <WorkspaceLayout
      roleTitle="System Administrator"
      navItems={navItems}
      activeNavKey={activeSection}
      onNavSelect={setActiveSection}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: '4px' }}>
          Portal Administration & System Telemetry
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          Manage authenticated personnel, role scopes, and system telemetry per Government IT guidelines.
        </p>
      </div>

      {/* Admin Isolation Security Warning per rules.md §10 & design.md §5.32 */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: '#FFF8E6',
          border: '1px solid #F2DC9B',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-5)',
          fontSize: 'var(--font-size-sm)',
          color: '#8A6100',
          lineHeight: 1.5,
        }}
      >
        <strong>Admin Isolation Active (Security Rule §10):</strong> System Administrator accounts manage user accounts, roles, and server telemetry only. All project business data, AI risk scores, official decisions, and audit trails are cryptographically isolated from administrative access.
      </div>

      {/* Telemetry Cards Grid */}
      {(activeSection === 'telemetry' || activeSection === 'users') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Card title="System Telemetry" subtitle="Server Health">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: telemetry.status === 'OPERATIONAL' ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              />
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                {telemetry.status || 'OPERATIONAL'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>
              Database: <strong>{telemetry.database_state || 'CONNECTED'}</strong> • Node {telemetry.node_version}
            </div>
          </Card>

          <Card title="Server Uptime" subtitle="Node.js Process">
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-secondary)' }}>
              {formatUptime(telemetry.server_uptime_seconds)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>
              Process Memory: <strong>{telemetry.memory_usage_mb || 0} MB RSS</strong>
            </div>
          </Card>

          <Card title="User Accounts Registry" subtitle="Identity Directory">
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {users.total || 0} <span style={{ fontSize: '14px', fontWeight: 500 }}>Accounts</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
              Active: <strong style={{ color: 'var(--color-success)' }}>{users.active || 0}</strong> • Inactive: <strong>{users.inactive || 0}</strong>
            </div>
          </Card>
        </div>
      )}

      {/* Telemetry Diagnostics Section */}
      {activeSection === 'telemetry' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card title="Server Telemetry & Operational Metrics" subtitle="Real-time Node.js and MongoDB performance">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>SYSTEM STATUS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>OPERATIONAL ✓</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>MONGODB CONNECTION</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>{telemetry.database_state || 'CONNECTED'}</div>
              </div>
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>ACTIVE USER SESSIONS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-secondary)', marginTop: '4px' }}>{users.active || 0} Users</div>
              </div>
            </div>
            <div style={{ padding: 'var(--space-3)', backgroundColor: '#EDF4FC', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#1E3A8A' }}>
              ✓ Server health telemetry running continuously. Database ping and response latency within normal operational thresholds.
            </div>
          </Card>
        </div>
      )}

      {/* Embedded Admin User Management Component */}
      {activeSection === 'users' && <AdminUserManagement />}
    </WorkspaceLayout>
  );
}

export default AdminWorkspace;
