import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getWorkspacePath } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';

export function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleGoToWorkspace = () => {
    if (user?.role) {
      navigate(getWorkspacePath(user.role));
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)',
        padding: 'var(--space-6)',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: 'var(--color-danger)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
                marginBottom: 'var(--space-4)',
              }}
            >
              ✕
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-danger)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: 'var(--space-1)',
              }}
            >
              403 Forbidden • Access Denied
            </div>

            <h2 style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
              Jurisdiction & Role Restriction
            </h2>

            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                lineHeight: 1.6,
                marginBottom: 'var(--space-4)',
              }}
            >
              Your account <strong>{user?.full_name || user?.user_id}</strong> is registered under the role{' '}
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#EDF4FC',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                }}
              >
                {user?.role || 'UNKNOWN'}
              </span>
              . Per government security directives and <code>rules.md §10</code>, you do not possess authorization to
              access the requested resource or role workspace.
            </p>

            <div
              style={{
                backgroundColor: '#FFF8E6',
                border: '1px solid #F2DC9B',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                fontSize: '12px',
                color: '#8A6100',
                marginBottom: 'var(--space-5)',
                textAlign: 'left',
              }}
            >
              <strong>Security Log:</strong> Every cross-role access attempt is audited with actor ID, timestamp, and IP
              address. If you believe this is an administrative misclassification, contact your MoSPI Portal Administrator.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <Button variant="primary" onClick={handleGoToWorkspace}>
                Return to My Workspace
              </Button>
              <Button variant="secondary" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default UnauthorizedPage;

