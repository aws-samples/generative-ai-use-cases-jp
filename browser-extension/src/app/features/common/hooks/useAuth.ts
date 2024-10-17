import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useMemo } from 'react';
import useSWR from 'swr';
import useSettings from '../../settings/useSettings';

const useAuth = () => {
  const { settings } = useSettings();

  const { data: session, mutate } = useSWR(settings ? 'auth' : null, () => {
    return fetchAuthSession();
  });

  const loading = useMemo(() => {
    return !settings || !session;
  }, [session, settings]);

  return {
    authenticate: mutate,
    loading,
    hasAuthenticated: !!session?.tokens,
    email: (session?.tokens?.idToken?.payload.email ?? null) as string | null,
    token: session?.tokens?.idToken?.toString() ?? null,
    signOut,
  };
};

export default useAuth;
