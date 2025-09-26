import { TenantUseCaseConfigResponse } from 'generative-ai-use-cases';
import { useAuthenticator } from '@aws-amplify/ui-react';
import useHttp from './useHttp';

const useTenantUseCaseConfig = () => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const http = useHttp();

  // Only make the API call when authenticated
  const shouldFetch = authStatus === 'authenticated';

  const { data, error, mutate, isLoading } =
    http.get<TenantUseCaseConfigResponse>(
      shouldFetch ? 'tenant-use-case-config' : null,
      {
        revalidateOnFocus: false,
        shouldRetryOnError: true,
        errorRetryCount: 2,
      }
    );

  // Show loading when configuring auth or when fetching data
  const loading = authStatus === 'configuring' || (shouldFetch && isLoading);

  return {
    tenantConfig: data || null,
    loading,
    error: error?.message || null,
    refetch: mutate,
  };
};

export default useTenantUseCaseConfig;
