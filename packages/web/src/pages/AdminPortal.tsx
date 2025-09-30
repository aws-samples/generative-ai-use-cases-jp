import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { PiUsers, PiUserPlus, PiShieldCheck } from 'react-icons/pi';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LoadingOverlay from '../components/LoadingOverlay';
import UserInviteDialog from '../components/UserInviteDialog';
import useHttp from '../hooks/useHttp';

interface AdminStatusResponse {
  isAdmin: boolean;
  tenantId: string;
  username: string;
}

interface TenantUser {
  username: string;
  email: string;
  tenantId: string;
  tenantAdmin: boolean;
  enabled: boolean;
  userStatus: string;
  createdDate: string;
  lastModifiedDate: string;
}

const AdminPortal: React.FC = () => {
  const { t } = useTranslation();
  const { api } = useHttp();

  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(
    null
  );
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [updatingUsernames, setUpdatingUsernames] = useState<Set<string>>(
    new Set()
  );
  const [pendingRoleChanges, setPendingRoleChanges] = useState<
    Map<string, boolean>
  >(new Map());
  const [refreshingToken, setRefreshingToken] = useState<boolean>(false);
  const [checkingRole, setCheckingRole] = useState<boolean>(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError(t('adminPortal.messages.failedToLoadUsers'));
    }
  }, [api, t]);

  const refreshUserRole = useCallback(async () => {
    if (checkingRole) return;

    setCheckingRole(true);
    try {
      const response = await api.post('/admin/refresh-role');
      const { isAdmin, roleChanged, message } = response.data;

      if (roleChanged) {
        if (isAdmin) {
          // User was promoted
          setError(
            `${message} Please refresh the page to see your new privileges.`
          );
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          // User was demoted
          setError(`${message} Redirecting to settings...`);
          setTimeout(() => {
            window.location.href = '/settings';
          }, 2000);
        }
      } else {
        console.log('Role status verified - no changes detected');
      }
    } catch (refreshError) {
      console.error('Failed to refresh role:', refreshError);
      if (
        refreshError &&
        typeof refreshError === 'object' &&
        'response' in refreshError &&
        refreshError.response &&
        typeof refreshError.response === 'object' &&
        'status' in refreshError.response &&
        (refreshError.response.status === 403 ||
          refreshError.response.status === 409)
      ) {
        setError(
          'Your admin privileges have been revoked. Redirecting to settings...'
        );
        setTimeout(() => {
          window.location.href = '/settings';
        }, 2000);
      }
    } finally {
      setCheckingRole(false);
    }
  }, [api, checkingRole]);

  // Check admin status on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await api.get('/admin/status');
        setAdminStatus(response.data);

        if (response.data.isAdmin) {
          await loadUsers();
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);

        // Check if this is a role mismatch error
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'status' in error.response &&
          (error.response.status === 403 || error.response.status === 409)
        ) {
          // Try to refresh role status first
          await refreshUserRole();
        } else {
          setError(t('adminPortal.messages.failedToCheckAdminStatus'));
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [api, t, loadUsers, refreshUserRole]);

  const handleRoleChange = async (username: string, isAdmin: boolean) => {
    // Store the original role value for potential rollback
    const originalUser = users.find((u) => u.username === username);
    const originalIsAdmin = originalUser?.tenantAdmin ?? false;
    const isCurrentUser = username === adminStatus?.username;

    // Set optimistic update
    setPendingRoleChanges((prev) => new Map(prev).set(username, isAdmin));

    // Add username to updating set
    setUpdatingUsernames((prev) => new Set(prev).add(username));

    try {
      const response = await api.put(`/admin/users/${username}/role`, {
        username,
        tenantAdmin: isAdmin,
      });

      const { actionType, sessionInvalidated } = response.data;

      // Handle different role change scenarios
      if (isCurrentUser) {
        if (actionType === 'demoted') {
          // Current user was demoted, sign them out
          setRefreshingToken(true);
          try {
            await signOut();
            return; // Early return to prevent further processing
          } catch (signOutError) {
            console.error('Failed to sign out after demotion:', signOutError);
            setError(t('adminPortal.messages.failedToSignOutAfterDemotion'));
          } finally {
            setRefreshingToken(false);
          }
        } else if (actionType === 'promoted') {
          // Current user was promoted, refresh their session
          setRefreshingToken(true);
          try {
            await fetchAuthSession({ forceRefresh: true });
            setError(null); // Clear any previous errors
            // Show success message for promotion
            setError(
              `Congratulations! You have been promoted to admin. Your new privileges are now active.`
            );
            setTimeout(() => setError(null), 5000); // Clear success message after 5 seconds
          } catch (tokenError) {
            console.error(
              'Failed to refresh auth session after promotion:',
              tokenError
            );
            setError(t('adminPortal.messages.failedToRefreshSession'));
          } finally {
            setRefreshingToken(false);
          }
        }
      } else {
        // Handle other user's role change
        if (sessionInvalidated) {
          // Force clients to re-check their status if their sessions were invalidated
          setTimeout(() => {
            window.dispatchEvent(new Event('focus'));
          }, 1000);
        }

        // Broadcast role change event for real-time monitoring
        window.dispatchEvent(
          new CustomEvent('user-role-changed', {
            detail: {
              username,
              newRole: isAdmin ? 'admin' : 'user',
              actionType,
              sessionInvalidated,
            },
          })
        );

        if (response.data.warning === 'SESSION_INVALIDATION_FAILED') {
          setError(
            `Role updated but user sessions remain active. The user "${username}" should be asked to sign out manually for security.`
          );
        }

        // Show appropriate success message based on action type
        if (actionType === 'promoted') {
          setError(
            `${username} has been promoted to admin. They will have administrative privileges after their next login.`
          );
          setTimeout(() => setError(null), 5000);
        } else if (actionType === 'demoted') {
          const message = sessionInvalidated
            ? `${username} has been demoted and their admin sessions have been terminated.`
            : `${username} has been demoted to regular user.`;
          setError(message);
          setTimeout(() => setError(null), 5000);
        }
      }

      // Clear pending change and reload users to reflect server state
      setPendingRoleChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(username);
        return newMap;
      });
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);

      // Check for specific role mismatch errors
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 409
      ) {
        setError(
          'Your admin privileges have been revoked. Redirecting to settings...'
        );
        setTimeout(() => {
          window.location.href = '/settings';
        }, 2000);
        return;
      }

      setError(t('adminPortal.messages.failedToUpdateUserRole'));

      // Revert to original value on failure
      setPendingRoleChanges((prev) => {
        const newMap = new Map(prev);
        newMap.set(username, originalIsAdmin);
        return newMap;
      });
    } finally {
      // Remove username from updating set
      setUpdatingUsernames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }
  };

  const handleRemoveUser = async (username: string) => {
    if (
      !confirm(t('adminPortal.messages.removeUserConfirmation', { username }))
    ) {
      return;
    }

    try {
      await api.delete(`/admin/users/${username}`, {
        data: { username, action: 'disable' }, // Default to disable instead of delete
      });

      // Reload users to reflect changes
      await loadUsers();
    } catch (error) {
      console.error('Failed to remove user:', error);
      setError(t('adminPortal.messages.failedToRemoveUser'));
    }
  };

  // Redirect if not admin
  if (!loading && (!adminStatus || !adminStatus.isAdmin)) {
    return <Navigate to="/settings" replace />;
  }

  if (loading) {
    return <LoadingOverlay>{t('adminPortal.messages.loading')}</LoadingOverlay>;
  }

  if (refreshingToken) {
    return (
      <LoadingOverlay>
        {t('adminPortal.messages.refreshingSession')}
      </LoadingOverlay>
    );
  }

  if (checkingRole) {
    return <LoadingOverlay>Verifying admin privileges...</LoadingOverlay>;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-12 2xl:px-32">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <PiShieldCheck className="mr-3 inline text-3xl text-blue-600" />
                {t('adminPortal.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('adminPortal.manageTenant', {
                  tenantId: adminStatus?.tenantId,
                })}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowInviteDialog(true)}>
                <PiUserPlus className="mr-2" />
                {t('adminPortal.inviteUsers')}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert severity="error" className="w-full">
              {error}
            </Alert>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-6 shadow">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.length}
                </div>
                <div className="text-sm text-gray-600">
                  {t('adminPortal.stats.totalUsers')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow">
            <div className="flex items-center">
              <PiShieldCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter((u) => u.tenantAdmin).length}
                </div>
                <div className="text-sm text-gray-600">
                  {t('adminPortal.stats.admins')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter((u) => !u.tenantAdmin).length}
                </div>
                <div className="text-sm text-gray-600">
                  {t('adminPortal.stats.regularUsers')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter((u) => !u.enabled).length}
                </div>
                <div className="text-sm text-gray-600">
                  {t('adminPortal.stats.disabledUsers')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('adminPortal.userManagement')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('adminPortal.table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('adminPortal.table.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('adminPortal.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('adminPortal.table.created')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('adminPortal.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((user) => (
                  <tr key={user.username} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.username}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <select
                        value={
                          pendingRoleChanges.has(user.username)
                            ? pendingRoleChanges.get(user.username)
                              ? 'admin'
                              : 'user'
                            : user.tenantAdmin
                              ? 'admin'
                              : 'user'
                        }
                        onChange={(e) =>
                          handleRoleChange(
                            user.username,
                            e.target.value === 'admin'
                          )
                        }
                        disabled={
                          user.username === adminStatus?.username ||
                          updatingUsernames.has(user.username) ||
                          refreshingToken
                        }
                        className="w-32 rounded border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100">
                        <option value="user">
                          {t('adminPortal.roles.regularUser')}
                        </option>
                        <option value="admin">
                          {t('adminPortal.roles.admin')}
                        </option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          user.enabled
                            ? user.userStatus === 'CONFIRMED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {user.enabled
                          ? user.userStatus
                          : t('adminPortal.status.disabled')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {user.username !== adminStatus?.username && (
                        <Button
                          outlined={true}
                          className="border-red-300 text-red-600 hover:border-red-400 hover:text-red-700"
                          onClick={() => handleRemoveUser(user.username)}>
                          {t('adminPortal.actions.remove')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500">
                      {t('adminPortal.messages.noUsersFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <UserInviteDialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onInviteSuccess={loadUsers}
        />
      </div>
    </div>
  );
};

export default AdminPortal;
