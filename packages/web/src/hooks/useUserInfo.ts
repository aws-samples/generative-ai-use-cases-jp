import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import useHttp from './useHttp';

export interface UserInfo {
  username: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
}

/**
 * Hook to fetch and manage user information
 * @returns User information including email, username, and tenant details
 */
const useUserInfo = () => {
  const { api } = useHttp();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get current user from Amplify
        const user = await getCurrentUser();

        // Get additional info from API if needed
        try {
          const response = await api.get('/admin/status');
          setUserInfo({
            username: user.username,
            email: user.signInDetails?.loginId || user.username,
            tenantId: response.data.tenantId,
            tenantName: response.data.tenantName || response.data.tenantId,
          });
        } catch (apiError) {
          // If admin status fails, just use basic user info
          setUserInfo({
            username: user.username,
            email: user.signInDetails?.loginId || user.username,
          });
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        setError('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [api]);

  return { userInfo, loading, error };
};

export default useUserInfo;
