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

  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [updatingUsernames, setUpdatingUsernames] = useState<Set<string>>(new Set());
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Map<string, boolean>>(new Map());
  const [refreshingToken, setRefreshingToken] = useState<boolean>(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError(t('adminPortal.messages.failedToLoadUsers'));
    }
  }, [api, t]);

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
        setError(t('adminPortal.messages.failedToCheckAdminStatus'));
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [api, t, loadUsers]);

  const handleRoleChange = async (username: string, isAdmin: boolean) => {
    // Store the original role value for potential rollback
    const originalUser = users.find(u => u.username === username);
    const originalIsAdmin = originalUser?.tenantAdmin ?? false;
    const isCurrentUser = username === adminStatus?.username;

    // Set optimistic update
    setPendingRoleChanges(prev => new Map(prev).set(username, isAdmin));

    // Add username to updating set
    setUpdatingUsernames(prev => new Set(prev).add(username));

    try {
      const response = await api.put(`/admin/users/${username}/role`, {
        username,
        tenantAdmin: isAdmin,
      });

      // If current user's role changed, refresh auth session to get updated token
      if (isCurrentUser) {
        setRefreshingToken(true);
        try {
          // Force refresh the auth session to get new token with updated claims
          await fetchAuthSession({ forceRefresh: true });

          // If user is no longer admin, sign them out to trigger redirect
          if (!isAdmin) {
            await signOut();
            return; // Early return to prevent further processing
          }
        } catch (tokenError) {
          console.error('Failed to refresh auth session:', tokenError);
          setError(t('adminPortal.messages.failedToRefreshSession'));
        } finally {
          setRefreshingToken(false);
        }
      }

      // If session was invalidated, force all clients to re-check their status
      if (response.data.sessionInvalidated) {
        setTimeout(() => {
          window.dispatchEvent(new Event('focus'));
        }, 1000);
      }

      // Clear pending change and reload users to reflect server state
      setPendingRoleChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(username);
        return newMap;
      });
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      setError(t('adminPortal.messages.failedToUpdateUserRole'));

      // Revert to original value on failure
      setPendingRoleChanges(prev => {
        const newMap = new Map(prev);
        newMap.set(username, originalIsAdmin);
        return newMap;
      });
    } finally {
      // Remove username from updating set
      setUpdatingUsernames(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }
  };

  const handleRemoveUser = async (username: string) => {
    if (!confirm(t('adminPortal.messages.removeUserConfirmation', { username }))) {
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
    return <LoadingOverlay>{t('adminPortal.messages.refreshingSession')}</LoadingOverlay>;
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
                {t('adminPortal.manageTenant', { tenantId: adminStatus?.tenantId })}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowInviteDialog(true)}
              >
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
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">{users.length}</div>
                <div className="text-sm text-gray-600">{t('adminPortal.stats.totalUsers')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <PiShieldCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => u.tenantAdmin).length}
                </div>
                <div className="text-sm text-gray-600">{t('adminPortal.stats.admins')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => !u.tenantAdmin).length}
                </div>
                <div className="text-sm text-gray-600">{t('adminPortal.stats.regularUsers')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <PiUsers className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => !u.enabled).length}
                </div>
                <div className="text-sm text-gray-600">{t('adminPortal.stats.disabledUsers')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('adminPortal.userManagement')}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminPortal.table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminPortal.table.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminPortal.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminPortal.table.created')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminPortal.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.username} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={
                          pendingRoleChanges.has(user.username)
                            ? pendingRoleChanges.get(user.username) ? 'admin' : 'user'
                            : user.tenantAdmin ? 'admin' : 'user'
                        }
                        onChange={(e) => handleRoleChange(user.username, e.target.value === 'admin')}
                        disabled={user.username === adminStatus?.username || updatingUsernames.has(user.username) || refreshingToken}
                        className="text-sm rounded border border-gray-300 px-2 py-1 w-32 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="user">{t('adminPortal.roles.regularUser')}</option>
                        <option value="admin">{t('adminPortal.roles.admin')}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${user.enabled
                        ? user.userStatus === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {user.enabled ? user.userStatus : t('adminPortal.status.disabled')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {user.username !== adminStatus?.username && (
                        <Button
                          outlined={true}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                          onClick={() => handleRemoveUser(user.username)}
                        >
                          {t('adminPortal.actions.remove')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
