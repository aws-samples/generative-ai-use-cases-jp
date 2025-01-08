import useUseCaseBuilderApi from './useUseCaseBuilderApi';
import { UseCaseInputExample } from 'generative-ai-use-cases-jp';
import usePagination from '../usePagination';

const useMyUseCases = () => {
  const {
    listMyUseCases,
    listFavoriteUseCases,
    listRecentlyUsedUseCases,
    createUseCase,
    updateUseCase,
    updateRecentUseUseCase,
    deleteUseCase,
    toggleFavorite,
    toggleShared,
  } = useUseCaseBuilderApi();

  const {
    flattenData: myUseCases,
    mutate: mutateMyUseCases,
    isLoading: isLoadingMyUseCases,
    loadMore: loadMoreMyUseCases,
    canLoadMore: canLoadMoreMyUseCases,
  } = usePagination(listMyUseCases(), 30);

  const {
    flattenData: favoriteUseCases,
    mutate: mutateFavoriteUseCases,
    isLoading: isLoadingFavoriteUseCases,
    loadMore: loadMoreFavoriteUseCases,
    canLoadMore: canLoadMoreFavoriteUseCases,
  } = usePagination(listFavoriteUseCases(), 20);

  const {
    flattenData: recentlyUsedUseCases,
    mutate: mutateRecentlyUsedUseCases,
    isLoading: isLoadingRecentlyUsedUseCases,
    loadMore: loadMoreRecentlyUsedUseCases,
    canLoadMore: canLoadMoreRecentlyUsedUseCases,
  } = usePagination(listRecentlyUsedUseCases(), 20);

  return {
    myUseCases,
    isLoadingMyUseCases,
    loadMoreMyUseCases,
    canLoadMoreMyUseCases,

    favoriteUseCases: favoriteUseCases ?? [],
    isLoadingFavoriteUseCases,
    loadMoreFavoriteUseCases,
    canLoadMoreFavoriteUseCases,

    recentlyUsedUseCases: recentlyUsedUseCases ?? [],
    isLoadingRecentlyUsedUseCases,
    loadMoreRecentlyUsedUseCases,
    canLoadMoreRecentlyUsedUseCases,

    createUseCase: (params: {
      title: string;
      promptTemplate: string;
      description?: string;
      inputExamples?: UseCaseInputExample[];
      fixedModelId?: string;
      fileUpload?: boolean;
    }) => {
      return createUseCase(params).finally(() => {
        mutateMyUseCases();
      });
    },
    updateUseCase: (params: {
      useCaseId: string;
      title: string;
      promptTemplate: string;
      description?: string;
      inputExamples?: UseCaseInputExample[];
      fixedModelId?: string;
      fileUpload?: boolean;
    }) => {
      return updateUseCase(params.useCaseId, {
        title: params.title,
        promptTemplate: params.promptTemplate,
        description: params.description,
        inputExamples: params.inputExamples,
        fixedModelId: params.fixedModelId,
        fileUpload: params.fileUpload,
      }).finally(() => {
        mutateMyUseCases();
        mutateFavoriteUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
    updateRecentUseUseCase: (useCaseId: string) => {
      return updateRecentUseUseCase(useCaseId).finally(() => {
        mutateRecentlyUsedUseCases();
      });
    },
    deleteUseCase: (useCaseId: string) => {
      return deleteUseCase(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateFavoriteUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
    toggleFavorite: (useCaseId: string) => {
      return toggleFavorite(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateFavoriteUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
    toggleShared: (useCaseId: string) => {
      return toggleShared(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
  };
};

export default useMyUseCases;
