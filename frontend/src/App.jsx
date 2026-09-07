import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ShellGalleryPage from './pages/ShellGalleryPage';
import ProtectedRoute from './components/ProtectedRoute';

// Role Workspaces
import MPWorkspace from './workspaces/MPWorkspace';
import DistrictWorkspace from './workspaces/DistrictWorkspace';
import AgencyWorkspace from './workspaces/AgencyWorkspace';
import StateWorkspace from './workspaces/StateWorkspace';
import MinistryWorkspace from './workspaces/MinistryWorkspace';
import AuditorWorkspace from './workspaces/AuditorWorkspace';
import AdminWorkspace from './workspaces/AdminWorkspace';

import './styles/global.css';

/**
 * Public Layout wrapper for pages sharing global header and footer
 */
function PublicLayout({ children, activeView }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeView={activeView} />
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}

function LandingRouteWrapper() {
  const navigate = useNavigate();
  return (
    <PublicLayout activeView="landing">
      <LandingPage onSignInClick={() => navigate('/login')} />
    </PublicLayout>
  );
}

function ShellRouteWrapper() {
  return (
    <PublicLayout activeView="shell">
      <ShellGalleryPage />
    </PublicLayout>
  );
}

function LoginRouteWrapper() {
  return (
    <PublicLayout activeView="login">
      <LoginPage />
    </PublicLayout>
  );
}

function UnauthorizedRouteWrapper() {
  return (
    <PublicLayout activeView="unauthorized">
      <UnauthorizedPage />
    </PublicLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingRouteWrapper />} />
            <Route path="/shell" element={<ShellRouteWrapper />} />
            <Route path="/login" element={<LoginRouteWrapper />} />
            <Route path="/unauthorized" element={<UnauthorizedRouteWrapper />} />

            {/* Role-Protected Workspaces */}
            <Route
              path="/mp/*"
              element={
                <ProtectedRoute allowedRoles={['MP']}>
                  <MPWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/district/*"
              element={
                <ProtectedRoute allowedRoles={['DISTRICT_AUTHORITY']}>
                  <DistrictWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/*"
              element={
                <ProtectedRoute allowedRoles={['IMPLEMENTING_AGENCY']}>
                  <AgencyWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state/*"
              element={
                <ProtectedRoute allowedRoles={['STATE_NODAL_AUTHORITY', 'STATE_NODAL_OFFICER']}>
                  <StateWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ministry/*"
              element={
                <ProtectedRoute allowedRoles={['MINISTRY', 'MINISTRY_OFFICER']}>
                  <MinistryWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auditor/*"
              element={
                <ProtectedRoute allowedRoles={['AUDITOR']}>
                  <AuditorWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminWorkspace />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;
