import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import useSWR from 'swr';

const useAuth = () => {
  const { data: session } = useSWR('auth', () => {
    return fetchAuthSession();
  });

  return {
    hasAuthrized: !!session?.tokens,
    email: (session?.tokens?.idToken?.payload.email ?? null) as string | null,
    token: session?.tokens?.idToken?.toString() ?? null,
    signOut,
  };
};

export default useAuth;
