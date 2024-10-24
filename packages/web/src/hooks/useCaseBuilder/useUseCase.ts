import useUseCaseBuilderApi from './useUseCaseBuilderApi';

const useUseCase = (useCaseId?: string) => {
  const { getUseCase } = useUseCaseBuilderApi();

  const { data, isLoading, mutate } = getUseCase(useCaseId);

  return {
    useCase: data,
    isLoading,
    mutate,
  };
};

export default useUseCase;
