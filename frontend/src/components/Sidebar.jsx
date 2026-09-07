import React, { useState } from 'react';

/**
 * Reusable Sidebar shell per design.md §5.7 & §5.9
 * - Collapsible state
 * - Role-scoped navigation previews
 * - Strict government styling with low visual noise
 */
export function Sidebar({
  activeRole = 'DISTRICT_AUTHORITY',
  onRoleChange,
  className = '',
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Nav definitions per design.md §5.9
  const roleNavItems = {
    MP: [
      { label: 'Constituency Dashboard', key: 'dashboard' },
      { label: 'My Recommendations', key: 'recs' },
      { label: 'My Works', key: 'works' },
      { label: 'Financial Overview', key: 'finance' },
      { label: 'SC/ST Quota Compliance', key: 'compliance' },
      { label: 'Attention Items', key: 'attention' },
      { label: 'Profile', key: 'profile' },
    ],
    DISTRICT_AUTHORITY: [
      { label: 'District Dashboard', key: 'dashboard' },
      { label: 'Pending Recommendations', key: 'recs' },
      { label: 'AI Review Queue', key: 'ai-review' },
      { label: 'Sanctioned Projects', key: 'projects' },
      { label: 'Engineering Reports', key: 'engineering' },
      { label: 'Disbursements & Payments', key: 'payments' },
      { label: 'Compliance Monitoring', key: 'compliance' },
      { label: 'Inspections', key: 'inspections' },
      { label: 'Implementing Agencies', key: 'agencies' },
      { label: 'Profile', key: 'profile' },
    ],
    STATE_NODAL_AUTHORITY: [
      { label: 'State Dashboard', key: 'dashboard' },
      { label: 'State-wide Projects', key: 'projects' },
      { label: 'Risk Monitor', key: 'risk' },
      { label: '1% Inspection Queue', key: 'inspections' },
      { label: 'District Comparisons', key: 'districts' },
      { label: 'Agency Concentration', key: 'agencies' },
      { label: 'Trend Analytics', key: 'trends' },
      { label: 'Profile', key: 'profile' },
    ],
    MINISTRY: [
      { label: 'National Dashboard', key: 'dashboard' },
      { label: 'National Overview', key: 'overview' },
      { label: 'State Performance', key: 'states' },
      { label: 'Systemic Risk Indicators', key: 'systemic' },
      { label: 'Implementation Supervision', key: 'implementation' },
      { label: 'Accountability & Audit', key: 'accountability' },
      { label: 'Policy Insights', key: 'policy' },
      { label: 'Profile', key: 'profile' },
    ],
    IMPLEMENTING_AGENCY: [
      { label: 'Agency Dashboard', key: 'dashboard' },
      { label: 'Assigned Works', key: 'assigned' },
      { label: 'Engineering Submissions', key: 'engineering' },
      { label: 'Physical Progress Updates', key: 'progress' },
      { label: 'Payment Requests', key: 'payments' },
      { label: 'Utilization Certificates', key: 'ucs' },
      { label: 'Clarifications Requested', key: 'clarifications' },
      { label: 'Profile', key: 'profile' },
    ],
    AUDITOR: [
      { label: 'Audit Dashboard', key: 'dashboard' },
      { label: 'Project History Search', key: 'projects' },
      { label: 'AI Risk Evolution', key: 'risk-history' },
      { label: 'Official Decisions', key: 'decisions' },
      { label: 'Inspection Results', key: 'inspections' },
      { label: 'Permanent Audit Trail', key: 'audit-logs' },
      { label: 'Profile', key: 'profile' },
    ],
    ADMIN: [
      { label: 'System Health Dashboard', key: 'dashboard' },
      { label: 'User Directory', key: 'users' },
      { label: 'Roles & Jurisdiction', key: 'roles' },
      { label: 'System Configuration', key: 'config' },
      { label: 'Profile', key: 'profile' },
    ],
  };

  const navItems = roleNavItems[activeRole] || roleNavItems.DISTRICT_AUTHORITY;

  return (
    <aside
      className={`sidebar ${className}`}
      style={{
        width: isCollapsed ? '64px' : '260px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        minHeight: 'calc(100vh - 85px)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      {/* Role Indicator & Collapse Toggle */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC',
        }}
      >
        {!isCollapsed && (
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--color-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Workspace Role
            </div>
            <select
              value={activeRole}
              onChange={(e) => onRoleChange?.(e.target.value)}
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                marginTop: '2px',
                maxWidth: '180px',
              }}
            >
              <option value="MP">MP Office</option>
              <option value="DISTRICT_AUTHORITY">District Authority</option>
              <option value="STATE_NODAL_AUTHORITY">State Authority</option>
              <option value="MINISTRY">Ministry (DIID)</option>
              <option value="IMPLEMENTING_AGENCY">Implementing Agency</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">System Admin</option>
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            color: 'var(--color-text)',
          }}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          padding: 'var(--space-2)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {navItems.map((item, idx) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: isCollapsed ? '10px 0' : '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: idx === 0 ? '#EDF4FC' : 'transparent',
              color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: idx === 0 ? 600 : 400,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: idx === 0 ? 'var(--color-secondary)' : '#CBD5E1',
                flexShrink: 0,
              }}
            />
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Admin Notice (§5.32) */}
      {!isCollapsed && activeRole === 'ADMIN' && (
        <div
          style={{
            margin: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: '#FFF8E6',
            border: '1px solid #F2DC9B',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: '#8A6100',
            lineHeight: 1.4,
          }}
        >
          <strong>Security Note:</strong> Admin navigation contains operational tools only. Decision and risk content is restricted per rules.md §10.
        </div>
      )}
    </aside>
  );
}

export default Sidebar;

