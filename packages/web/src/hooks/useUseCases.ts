import { HiddenUseCasesKeys } from 'generative-ai-use-cases';
import useTenantUseCaseConfig from './useTenantUseCaseConfig';

const useUseCases = () => {
  const { tenantConfig, loading } = useTenantUseCaseConfig();

  const enabledSingle = (useCase: HiddenUseCasesKeys): boolean => {
    if (!tenantConfig?.hiddenUseCases) {
      return true; // Enable all use cases if no tenant configuration
    }
    return !tenantConfig.hiddenUseCases[useCase];
  };

  const enabled = (...useCases: HiddenUseCasesKeys[]): boolean => {
    return useCases.every(enabledSingle);
  };

  return {
    enabled,
    tenantConfig,
    loading,
  };
};

export default useUseCases;
