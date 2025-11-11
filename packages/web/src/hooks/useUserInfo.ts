import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
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

        // Get email from ID token claims (works for both SAML/OIDC and direct Cognito users)
        // This avoids the "required scopes" error with fetchUserAttributes for federated users
        let emailFromToken: string | undefined;
        try {
          const session = await fetchAuthSession();
          const idToken = session.tokens?.idToken;
          emailFromToken = idToken?.payload?.email as string | undefined;
        } catch (tokenError) {
          console.warn('Failed to fetch auth session, falling back to loginId:', tokenError);
        }

        // Determine email with fallback chain: ID token email → loginId → username
        const email = emailFromToken || user.signInDetails?.loginId || user.username;

        // Get additional info from API if needed
        try {
          const response = await api.get('/admin/status');
          setUserInfo({
            username: user.username,
            email,
            tenantId: response.data.tenantId,
            tenantName: response.data.tenantName || response.data.tenantId,
          });
        } catch (apiError) {
          // If admin status fails, just use basic user info
          setUserInfo({
            username: user.username,
            email,
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
