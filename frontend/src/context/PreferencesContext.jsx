import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const PreferencesContext = createContext(null);

const DEFAULT_PREFERENCES = {
  sidebar_collapsed: false,
  table_page_size: 10,
  email_notifications: true,
  risk_alert_threshold: 'MEDIUM_AND_HIGH',
  default_dashboard_view: 'overview',
  custom_settings: {},
};

export function PreferencesProvider({ children }) {
  const { user, authFetch, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);

  // Fetch preferences when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setPreferences(DEFAULT_PREFERENCES);
      return;
    }

    let isMounted = true;

    async function loadPreferences() {
      try {
        setLoading(true);
        const res = await authFetch('/api/user/preferences');
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data && isMounted) {
            setPreferences((prev) => ({
              ...prev,
              ...body.data,
            }));
          }
        }
      } catch (err) {
        // Load failure must never block render per memory.md
        console.warn('Failed to load user preferences, falling back to defaults:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authFetch]);

  // Update preferences on server and locally
  const updatePreferences = useCallback(
    async (updates) => {
      // Optimistic local update
      setPreferences((prev) => ({ ...prev, ...updates }));

      try {
        await authFetch('/api/user/preferences', {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.warn('Failed to persist user preferences to server:', err);
      }
    },
    [authFetch]
  );

  // Toggle sidebar helper
  const toggleSidebar = useCallback(() => {
    setPreferences((prev) => {
      const nextCollapsed = !prev.sidebar_collapsed;
      // Persist in background
      authFetch('/api/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ sidebar_collapsed: nextCollapsed }),
      }).catch((err) => console.warn('Sidebar state persist error:', err));

      return {
        ...prev,
        sidebar_collapsed: nextCollapsed,
      };
    });
  }, [authFetch]);

  const value = {
    preferences,
    sidebarCollapsed: preferences.sidebar_collapsed,
    tablePageSize: preferences.table_page_size,
    loading,
    updatePreferences,
    toggleSidebar,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    // Fallback object if used outside provider (never crash)
    return {
      preferences: DEFAULT_PREFERENCES,
      sidebarCollapsed: false,
      tablePageSize: 10,
      loading: false,
      updatePreferences: async () => {},
      toggleSidebar: () => {},
    };
  }
  return context;
}

export default PreferencesContext;

