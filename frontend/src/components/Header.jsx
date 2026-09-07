import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

/**
 * Common Header per design.md §5.8 & §5.60
 * - Text-based Ministry identification only (no invented seals/logos per §5.60)
 * - Official, clean, low-visual-noise styling
 * - Auth-aware: switches between Sign In and User Workspace badge
 */
export function Header({ activeView = 'landing', onViewChange }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const getWorkspacePath = (role) => {
    switch (role) {
      case 'MP':
        return '/mp';
      case 'DISTRICT_AUTHORITY':
        return '/district';
      case 'IMPLEMENTING_AGENCY':
        return '/agency';
      case 'STATE_NODAL_OFFICER':
        return '/state';
      case 'MINISTRY_OFFICER':
        return '/ministry';
      case 'AUDITOR':
        return '/auditor';
      case 'ADMIN':
        return '/admin';
      default:
        return '/';
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--color-primary)',
        color: '#FFFFFF',
        borderBottom: '3px solid var(--color-secondary)',
      }}
    >
      {/* Top government identity bar */}
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
          <span>Government of India • MoSPI / DIID</span>
          <span>SIH 2026 Prototype — Problem Statement 26102</span>
        </div>
      </div>

      {/* Main portal header */}
      <div className="container" style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Project Title & Ministry Sub-brand */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#9EBAE0',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Ministry of Statistics & Programme Implementation
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                }}
              >
                MPLADS AI Risk Monitoring & Decision Support Platform
              </div>
            </Link>
          </div>

          {/* Navigation / Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onViewChange) onViewChange('landing');
                  navigate('/');
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: activeView === 'landing' ? 'var(--color-surface)' : 'transparent',
                  color: activeView === 'landing' ? 'var(--color-primary)' : '#E2E8F0',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Public Landing
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onViewChange) onViewChange('shell');
                  navigate('/shell');
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: activeView === 'shell' ? 'var(--color-surface)' : 'transparent',
                  color: activeView === 'shell' ? 'var(--color-primary)' : '#E2E8F0',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Portal Shell & Components
              </button>
            </div>

            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(getWorkspacePath(user.role))}
                  style={{ fontWeight: 600, fontSize: '12px' }}
                >
                  My Workspace ({user.role})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSignOut}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/login')}
                style={{ fontWeight: 600 }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
