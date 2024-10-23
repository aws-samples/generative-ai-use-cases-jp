import useUseCaseBuilderApi from './useUseCaseBuilderApi';

const useUseCase = (useCaseId?: string) => {
  const { getUseCase } = useUseCaseBuilderApi();

  const { data, isLoading } = getUseCase(useCaseId);

  return {
    useCase: data,
    isLoading,
  };
};

export default useUseCase;
