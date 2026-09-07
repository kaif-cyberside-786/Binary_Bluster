import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component per design.md §5.32 and rules.md §3, §10
 * - Guards private routes from unauthenticated users
 * - Verifies user role authorization (React routing is UX boundary; Express is sole security boundary)
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-muted)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #E2E8F0',
              borderTopColor: 'var(--color-secondary)',
              borderRadius: '50%',
              margin: '0 auto var(--space-3)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div>Verifying authentication session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login preserving destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // User is logged in but role is unauthorized for this route
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;

