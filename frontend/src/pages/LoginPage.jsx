import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // CAPTCHA State
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Form Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ submitting: false, message: '', error: '' });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const destination = location.state?.from?.pathname || getWorkspacePath(user.role);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

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

  // Fetch CAPTCHA challenge from backend
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (data.success && data.data) {
        setCaptchaToken(data.data.captchaToken);
        setCaptchaSvg(data.data.captchaSvg);
        setCaptchaAnswer('');
      }
    } catch (err) {
      console.warn('Failed to load CAPTCHA challenge:', err);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // Handle Login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your User ID or Official Email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (!captchaAnswer.trim()) {
      setErrorMessage('Please enter the visual CAPTCHA characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({
        identifier: identifier.trim(),
        password,
        captchaToken,
        captchaAnswer: captchaAnswer.trim(),
      });

      const destination = location.state?.from?.pathname || getWorkspacePath(loggedInUser.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      // Refresh CAPTCHA on failure per security requirements
      fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password submission
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus({ submitting: true, message: '', error: '' });

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: forgotUserId.trim(),
          official_email: forgotEmail.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStatus({
          submitting: false,
          message: data.message || 'If an active account exists with these credentials, reset instructions have been dispatched.',
          error: '',
        });
      } else {
        setForgotStatus({
          submitting: false,
          message: '',
          error: data.error?.message || 'Unable to process reset request.',
        });
      }
    } catch (err) {
      setForgotStatus({
        submitting: false,
        message: '',
        error: 'Network failure while dispatching reset request.',
      });
    }
  };

  // Prototype fast account prefiller
  const fillDemoAccount = (roleId, roleLabel) => {
    setIdentifier(roleId);
    setPassword('Mplads@Gov2026!');
    setErrorMessage('');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--space-4)',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Government Identity Emblem & Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#1D3A5F',
              color: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-2)',
            }}
          >
            Government of India • MoSPI
          </div>
          <h1
            style={{
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-primary)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}
          >
            Official Authentication Portal
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
            MPLADS AI Risk Monitoring & Decision Support Platform
          </p>
        </div>

        {/* Main Login Card */}
        <Card>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                style={{
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F87171',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field 1: User ID / Official Email */}
            <div>
              <label
                htmlFor="login-identifier"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                }}
              >
                User ID or Registered Official Email <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. USR-DIST-01 or collector.indore@gov.in"
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--font-size-md)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
            </div>

            {/* Field 2: Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                  }}
                >
                  Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--color-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 70px 0 var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 'var(--font-size-md)',
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-secondary)',
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Field 3: Visual CAPTCHA */}
            <div>
              <label
                htmlFor="login-captcha"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                }}
              >
                Visual CAPTCHA Verification <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {/* SVG Container */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    height: '50px',
                    width: '160px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />

                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  title="Generate new CAPTCHA challenge"
                  style={{
                    height: '50px',
                    padding: '0 12px',
                    backgroundColor: '#EDF4FC',
                    border: '1px solid #B0C8E8',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {captchaLoading ? '...' : '⟳ Refresh'}
                </button>
              </div>

              <input
                id="login-captcha"
                type="text"
                autoComplete="off"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                placeholder="Type characters shown above"
                required
                maxLength={6}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--font-size-md)',
                  color: 'var(--color-text)',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 600 }}
            >
              Sign In to Official Workspace
            </Button>
          </form>

          {/* SIH Prototype Evaluator Quick Selector */}
          <div
            style={{
              marginTop: 'var(--space-5)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px dashed var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Prototype Quick-Fill (Seeded Role Accounts)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-MP-01', 'MP')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                MP (Indore)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-DIST-01', 'District')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                District Authority
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-AGENCY-01', 'Agency')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Agency (RES)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-STATE-01', 'State')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                State Nodal
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-MINISTRY-01', 'Ministry')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Ministry (DIID)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-AUDITOR-01', 'Auditor')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Auditor
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('USR-ADMIN-01', 'Admin')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #F87171',
                  backgroundColor: '#FEF2F2',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Admin (Restricted)
              </button>
            </div>
          </div>
        </Card>

        {/* Statutory Security Disclaimer */}
        <div
          style={{
            marginTop: 'var(--space-5)',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--color-muted)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>
            Statutory Warning & Security Notice
          </div>
          Unauthorized access to this government system is strictly prohibited and punishable under Sections 43 & 66 of
          the Information Technology Act, 2000. All activities, sessions, and client IPs are recorded in immutable audit logs.
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 1000,
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-6)',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-secondary)',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Account Recovery
            </div>
            <h3 id="forgot-modal-title" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Password Reset Request
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-4)',
              }}
            >
              Enter your assigned User ID and official email. If an active match is found, a cryptographic reset token will
              be dispatched to your email.
            </p>

            {forgotStatus.message && (
              <div
                style={{
                  backgroundColor: '#EAF6EC',
                  border: '1px solid #B3DFBA',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  fontSize: '12px',
                  color: 'var(--color-success)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {forgotStatus.message}
              </div>
            )}

            {forgotStatus.error && (
              <div
                style={{
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F87171',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {forgotStatus.error}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label
                  htmlFor="forgot-user-id"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                >
                  Official User ID <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="forgot-user-id"
                  type="text"
                  required
                  value={forgotUserId}
                  onChange={(e) => setForgotUserId(e.target.value)}
                  placeholder="e.g. USR-DIST-01"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="forgot-email"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                >
                  Registered Official Email <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. collector.indore@gov.in"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={forgotStatus.submitting}
                >
                  Dispatch Reset Instructions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;

