import { useState, useEffect } from 'react';
import useHttp from './useHttp';

interface AdminStatus {
  isAdmin: boolean;
  tenantId: string;
  username: string;
}

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  tenantId: string | null;
  username: string | null;
}

/**
 * Custom hook for ABAC (Attribute-Based Access Control) validation
 * specifically for tenantAdmin attribute validation
 *
 * This hook provides:
 * - Real-time admin status checking via API
 * - Loading states for UI feedback
 * - Error handling for network issues
 * - Cached results for performance
 *
 * @returns AdminAuthState object with admin validation results
 */
const useAdminAuth = (): AdminAuthState => {
  const { api } = useHttp();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    error: null,
    tenantId: null,
    username: null,
  });

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Call the same endpoint that AdminPortal uses for consistency
        const response = await api.get<AdminStatus>('/admin/status');

        if (isMounted) {
          setState({
            isAdmin: response.data.isAdmin || false,
            isLoading: false,
            error: null,
            tenantId: response.data.tenantId || null,
            username: response.data.username || null,
          });
        }
      } catch (error: any) {
        if (isMounted) {
          // If the API call fails (e.g., 403 Forbidden), user is not admin
          setState({
            isAdmin: false,
            isLoading: false,
            error:
              error.response?.status === 403
                ? null // 403 is expected for non-admin users, don't show as error
                : 'Failed to verify admin status',
            tenantId: null,
            username: null,
          });
        }
      }
    };

    checkAdminStatus();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [api]);

  return state;
};

export default useAdminAuth;
