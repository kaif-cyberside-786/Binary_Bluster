import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import Button from '../components/Button';
import Footer from '../components/Footer';

export function WorkspaceLayout({
  children,
  roleTitle,
  jurisdictionLabel,
  navItems = [],
  activeNavKey,
  onNavSelect,
}) {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const formatJurisdiction = () => {
    if (!user?.jurisdiction) return 'Not assigned';
    const { level, state, district, agency_name } = user.jurisdiction;
    const parts = [];
    if (agency_name) parts.push(agency_name);
    if (district) parts.push(district);
    if (state) parts.push(state);
    if (level && parts.length === 0) parts.push(level);
    return parts.join(' • ') || level || 'National';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background)' }}>
      {/* Top Government Identity Bar */}
      <div
        style={{
          backgroundColor: '#12253E',
          padding: '4px var(--space-4)',
          fontSize: '11px',
          color: '#B0C2D6',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Government of India • Ministry of Statistics & Programme Implementation (MoSPI)</span>
          <span>Official Operational Portal • Restricted Access</span>
        </div>
      </div>

      {/* Main Authenticated Header */}
      <header
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#FFFFFF',
          borderBottom: '3px solid var(--color-secondary)',
          padding: 'var(--space-3) var(--space-4)',
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {/* Brand & Workspace Name */}
          <div>
            <div style={{ fontSize: '11px', color: '#9EBAE0', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              MPLADS AI Risk Monitoring & Decision Support Platform
            </div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{roleTitle || user?.designation || user?.role} Workspace</span>
              <span
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {/* Officer Identification */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#FFFFFF' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: '11px', color: '#B0C2D6' }}>
                {jurisdictionLabel || formatJurisdiction()}
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSignOut}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Workspace Sidebar */}
        <aside
          style={{
            width: sidebarCollapsed ? '60px' : '250px',
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width var(--transition-fast)',
            flexShrink: 0,
          }}
        >
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
            {!sidebarCollapsed && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                Navigation
              </span>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          <nav style={{ padding: 'var(--space-2)', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map((item, idx) => {
              const isActive = activeNavKey !== undefined ? activeNavKey === item.key : idx === 0;
              return (
                <button
                  key={item.key || idx}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    if (onNavSelect) {
                      onNavSelect(item.key, item);
                    } else if (item.onClick) {
                      item.onClick();
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: sidebarCollapsed ? '10px 0' : '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    gap: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isActive ? '#EDF4FC' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? 'var(--color-secondary)' : '#CBD5E1',
                      flexShrink: 0,
                    }}
                  />
                  {!sidebarCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Isolation Warning per rules.md §10 */}
          {!sidebarCollapsed && user?.role === 'ADMIN' && (
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
              <strong>Admin Isolation:</strong> No project risk scores, official decisions, or audit log content are exposed to Admin users.
            </div>
          )}
        </aside>

        {/* Content Viewport */}
        <main style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default WorkspaceLayout;

