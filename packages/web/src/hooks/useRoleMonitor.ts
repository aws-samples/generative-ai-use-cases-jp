import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import useHttp from './useHttp';
import { performLogoutAndReload, isRoleMismatchError } from '../utils/auth';

interface AdminStatus {
  isAdmin: boolean;
  tenantId: string;
  username: string;
}

interface RoleStatus {
  isAdmin: boolean;
  roleChanged?: boolean;
  message?: string;
}

interface RoleMonitorState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  tenantId: string | null;
  username: string | null;
  isRoleChangeDetected: boolean;
}

interface RoleMonitorConfig {
  pollingInterval?: number;
  checkOnFocus?: boolean;
  enabled?: boolean;
}

/**
 * Role monitoring hook that handles admin status checking and role change detection
 *
 * Features:
 * - Real-time admin status checking via API
 * - Periodic role monitoring to detect promotion/demotion
 * - Loading states for UI feedback
 * - Error handling for network issues
 * - Automatic logout on role demotion
 * - Focus-based rechecking
 * - Centralized role mismatch handling
 */
const useRoleMonitor = (config: RoleMonitorConfig = {}) => {
  const {
    pollingInterval = 30000, // 30 seconds default
    checkOnFocus = true,
    enabled = true,
  } = config;

  const { api } = useHttp();
  const [state, setState] = useState<RoleMonitorState>({
    isAdmin: false,
    isLoading: true,
    error: null,
    tenantId: null,
    username: null,
    isRoleChangeDetected: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownAdminStatusRef = useRef<boolean | null>(null);
  const isCheckingRef = useRef(false);
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRoleMismatch = useCallback(
    async (reason: string) => {
      if (state.isRoleChangeDetected) return; // Prevent multiple notifications

      setState((prev) => ({ ...prev, isRoleChangeDetected: true }));

      toast.warning('Your permissions have changed. Redirecting to login...');

      // Small delay to allow toast to show
      setTimeout(() => {
        performLogoutAndReload(reason);
      }, 100);
    },
    [state.isRoleChangeDetected]
  );

  const checkAdminStatus = useCallback(
    async (isPeriodicCheck = false) => {
      if (isCheckingRef.current || state.isRoleChangeDetected || !enabled)
        return;

      isCheckingRef.current = true;

      try {
        if (!isPeriodicCheck) {
          setState((prev) => ({ ...prev, isLoading: true, error: null }));
        }

        // Call admin status endpoint for comprehensive admin info
        const response = await api.get<AdminStatus>('/admin/status');
        const isCurrentlyAdmin = response.data.isAdmin || false;

        // Check for demotion (was admin but no longer is)
        if (
          lastKnownAdminStatusRef.current === true &&
          isCurrentlyAdmin === false
        ) {
          await handleRoleMismatch(
            'User demotion detected - was admin, now regular user'
          );
          return;
        }

        setState((prev) => ({
          ...prev,
          isAdmin: isCurrentlyAdmin,
          isLoading: false,
          error: null,
          tenantId: response.data.tenantId || null,
          username: response.data.username || null,
        }));

        lastKnownAdminStatusRef.current = isCurrentlyAdmin;

        // Start or stop polling based on admin status
        if (isCurrentlyAdmin && !intervalRef.current) {
          intervalRef.current = setInterval(
            () => checkRoleStatus(),
            pollingInterval
          );
        } else if (!isCurrentlyAdmin && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (error: unknown) {
        // Handle role mismatch errors
        if (isRoleMismatchError(error)) {
          if (lastKnownAdminStatusRef.current === true) {
            await handleRoleMismatch(
              'Role mismatch detected via admin status check'
            );
            return;
          }
        }

        // For non-admin users, 403 is expected
        const status = isAxiosError(error) ? error.response?.status : undefined;
        setState((prev) => ({
          ...prev,
          isAdmin: false,
          isLoading: false,
          error: status === 403 ? null : 'Failed to verify admin status',
          tenantId: null,
          username: null,
        }));

        lastKnownAdminStatusRef.current = false;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } finally {
        isCheckingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkRoleStatus is used inside setInterval callback and doesn't need to trigger checkAdminStatus re-creation
    [
      api,
      enabled,
      handleRoleMismatch,
      pollingInterval,
      state.isRoleChangeDetected,
    ]
  );

  const checkRoleStatus = useCallback(async () => {
    if (isCheckingRef.current || state.isRoleChangeDetected || !enabled) return;

    isCheckingRef.current = true;

    try {
      const response = await api.post<RoleStatus>('/admin/refresh-role');
      const { isAdmin, roleChanged } = response.data;

      // Initialize lastKnownRole on first check
      if (lastKnownAdminStatusRef.current === null) {
        lastKnownAdminStatusRef.current = isAdmin;
        return;
      }

      // Server-side role change detection is authoritative
      if (roleChanged) {
        console.log(`Server detected role change: current isAdmin=${isAdmin}`);
        lastKnownAdminStatusRef.current = isAdmin;

        if (!isAdmin) {
          await handleRoleMismatch(
            'User was demoted from admin to regular user'
          );
          return;
        }

        // User was promoted - reload to show new admin UI
        if (isAdmin) {
          console.log('User was promoted to admin');
          window.location.reload();
          return;
        }
      }

      // Fallback: local role change detection
      if (
        lastKnownAdminStatusRef.current !== null &&
        lastKnownAdminStatusRef.current !== isAdmin
      ) {
        console.log(
          `Local role change detected: ${lastKnownAdminStatusRef.current} -> ${isAdmin}`
        );
        lastKnownAdminStatusRef.current = isAdmin;

        if (lastKnownAdminStatusRef.current === true && isAdmin === false) {
          await handleRoleMismatch(
            'Local detection: User was demoted from admin to regular user'
          );
          return;
        }

        if (lastKnownAdminStatusRef.current === false && isAdmin === true) {
          console.log('Local detection: User was promoted to admin');
          window.location.reload();
        }
      }
    } catch (error: unknown) {
      // Handle 403/409 errors indicating role revocation
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403 || status === 409) {
        if (lastKnownAdminStatusRef.current === true) {
          await handleRoleMismatch(
            'Admin privileges likely revoked (403/409 error)'
          );
        }
      }
      // Other errors are logged but don't trigger logout (might be network issues)
      else {
        console.log('Role monitor error (non-auth):', error);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [api, enabled, handleRoleMismatch, state.isRoleChangeDetected]);

  // Handle focus events with debouncing
  const handleFocus = useCallback(() => {
    if (checkOnFocus && !document.hidden && !state.isRoleChangeDetected) {
      if (focusDebounceRef.current) {
        clearTimeout(focusDebounceRef.current);
      }

      focusDebounceRef.current = setTimeout(() => {
        checkAdminStatus(true);
      }, 500); // 500ms debounce
    }
  }, [checkOnFocus, checkAdminStatus, state.isRoleChangeDetected]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkAdminStatus();

    // Set up focus listeners
    if (checkOnFocus) {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (focusDebounceRef.current) {
        clearTimeout(focusDebounceRef.current);
      }
      if (checkOnFocus) {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      }
    };
  }, [enabled, checkOnFocus, handleFocus, checkAdminStatus]);

  // Stop monitoring if role change was detected
  useEffect(() => {
    if (state.isRoleChangeDetected && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [state.isRoleChangeDetected]);

  return {
    ...state,
    handleRoleMismatch,
    checkAdminStatus: () => checkAdminStatus(true),
    checkRoleStatus,
  };
};

export default useRoleMonitor;
