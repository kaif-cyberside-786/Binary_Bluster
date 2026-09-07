/**
 * Automated Verification of Frontend Auth, Role Workspaces & Admin Isolation
 * Verifies design.md §5.32, §5.46 & rules.md §3, §10
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Frontend Auth & Role-Based Workspaces Verification Tests', () => {
  const srcDir = path.resolve(__dirname, '../../frontend/src');

  test('AuthContext.jsx exists and defines AuthProvider and useAuth', () => {
    const authContextPath = path.join(srcDir, 'context/AuthContext.jsx');
    assert.ok(fs.existsSync(authContextPath), 'AuthContext.jsx must exist');
    const content = fs.readFileSync(authContextPath, 'utf8');
    assert.ok(content.includes('export function AuthProvider'), 'Must export AuthProvider');
    assert.ok(content.includes('export function useAuth'), 'Must export useAuth');
    assert.ok(content.includes('authFetch'), 'Must provide authenticated fetch helper');
    assert.ok(content.includes('/api/auth/login'), 'Must call /api/auth/login');
    assert.ok(content.includes('/api/auth/logout'), 'Must call /api/auth/logout');
  });

  test('ProtectedRoute.jsx exists and guards routes by role', () => {
    const protectedRoutePath = path.join(srcDir, 'components/ProtectedRoute.jsx');
    assert.ok(fs.existsSync(protectedRoutePath), 'ProtectedRoute.jsx must exist');
    const content = fs.readFileSync(protectedRoutePath, 'utf8');
    assert.ok(content.includes('allowedRoles'), 'Must accept allowedRoles prop');
    assert.ok(content.includes('/login'), 'Must redirect unauthenticated users to /login');
    assert.ok(content.includes('/unauthorized'), 'Must redirect unauthorized roles');
  });

  test('LoginPage.jsx complies with design.md §5.46', () => {
    const loginPath = path.join(srcDir, 'pages/LoginPage.jsx');
    assert.ok(fs.existsSync(loginPath), 'LoginPage.jsx must exist');
    const content = fs.readFileSync(loginPath, 'utf8');
    assert.ok(content.includes('/api/auth/captcha'), 'Must load server-side CAPTCHA');
    assert.ok(content.includes('captchaAnswer'), 'Must include CAPTCHA input');
    assert.ok(content.includes('/api/auth/forgot-password'), 'Must support password reset requests');
    assert.ok(content.includes('showPassword'), 'Must support password visibility toggle');
    assert.ok(content.includes('Information Technology Act, 2000'), 'Must display statutory warning banner');
  });

  test('All 7 Role Workspaces exist', () => {
    const roles = [
      'MPWorkspace.jsx',
      'DistrictWorkspace.jsx',
      'AgencyWorkspace.jsx',
      'StateWorkspace.jsx',
      'MinistryWorkspace.jsx',
      'AuditorWorkspace.jsx',
      'AdminWorkspace.jsx',
    ];

    for (const roleFile of roles) {
      const filePath = path.join(srcDir, 'workspaces', roleFile);
      assert.ok(fs.existsSync(filePath), `Workspace file ${roleFile} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.length > 100, `${roleFile} must have substantive content`);
    }
  });

  test('Admin Isolation: AdminUserManagement.jsx does NOT contain risk or decision logic per rules.md §10', () => {
    const adminPath = path.join(srcDir, 'workspaces/AdminUserManagement.jsx');
    assert.ok(fs.existsSync(adminPath), 'AdminUserManagement.jsx must exist');
    const content = fs.readFileSync(adminPath, 'utf8');

    // Must implement user registry & management
    assert.ok(content.includes('/api/admin/users'), 'Must call admin users API');
    assert.ok(content.includes('is_active'), 'Must support account activation/deactivation');
    assert.ok(content.includes('jurisdictionLevel'), 'Must support jurisdiction provisioning');

    // Admin Isolation verification: No risk score models, AI verdicts, or audit logs
    assert.ok(!content.includes('riskScore'), 'Admin screen must not display riskScore');
    assert.ok(!content.includes('riskLevel'), 'Admin screen must not display riskLevel');
    assert.ok(!content.includes('override_reason'), 'Admin screen must not contain decision override reasons');
    assert.ok(content.includes('Admin Isolation'), 'Must explicitly display Admin Isolation notice');
  });

  test('App.jsx configures routes for all 7 role workspaces and public routes', () => {
    const appPath = path.join(srcDir, 'App.jsx');
    const content = fs.readFileSync(appPath, 'utf8');

    assert.ok(content.includes('path="/mp/*"'));
    assert.ok(content.includes('path="/district/*"'));
    assert.ok(content.includes('path="/agency/*"'));
    assert.ok(content.includes('path="/state/*"'));
    assert.ok(content.includes('path="/ministry/*"'));
    assert.ok(content.includes('path="/auditor/*"'));
    assert.ok(content.includes('path="/admin/*"'));
    assert.ok(content.includes('path="/login"'));
    assert.ok(content.includes('path="/unauthorized"'));
  });
});

