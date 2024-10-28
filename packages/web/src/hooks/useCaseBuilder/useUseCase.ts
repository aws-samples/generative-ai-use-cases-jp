import useUseCaseBuilderApi from './useUseCaseBuilderApi';

const useUseCase = (useCaseId?: string) => {
  const { getUseCase } = useUseCaseBuilderApi();

  const { data, isLoading, mutate, error } = getUseCase(useCaseId);

  return {
    useCase: data,
    isLoading,
    mutate,
    error,
  };
};

export default useUseCase;
