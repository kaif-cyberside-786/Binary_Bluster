import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'mplads_access_token';
const STORAGE_KEY_USER = 'mplads_user_data';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
  });

  const [loading, setLoading] = useState(true);

  // Sync token to storage
  const setAuthSession = useCallback((token, userData) => {
    setAccessToken(token);
    setUser(userData);
    if (token && userData) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, []);

  // Validate session on mount
  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const userData = body.data.user || body.data;
            setUser(userData);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
          } else {
            setAuthSession(null, null);
          }
        } else {
          // Token expired or invalid
          setAuthSession(null, null);
        }
      } catch (err) {
        console.warn('Session verification network error:', err);
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [setAuthSession]);

  // Login handler
  const login = async ({ identifier, password, captchaToken, captchaAnswer }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password,
        captchaToken,
        captchaAnswer,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errorMsg = data.error?.message || 'Login failed. Please verify credentials.';
      const errorCode = data.error?.code || 'AUTH_ERROR';
      const err = new Error(errorMsg);
      err.code = errorCode;
      throw err;
    }

    const { accessToken: token, user: userData } = data.data;
    setAuthSession(token, userData);
    return userData;
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch (err) {
      console.warn('Logout network error:', err);
    } finally {
      setAuthSession(null, null);
    }
  };

  // Helper for authenticated API calls with token attachment
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        // Session expired, clear state
        setAuthSession(null, null);
      }

      return response;
    },
    [accessToken, setAuthSession]
  );

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    loading,
    login,
    logout,
    authFetch,
    setAuthSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

