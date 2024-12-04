import { produce } from 'immer';
import useUseCaseBuilderApi from './useUseCaseBuilderApi';
import { UseCaseInputExample } from 'generative-ai-use-cases-jp';

const useMyUseCases = () => {
  const {
    listMyUseCases,
    listFavoriteUseCases,
    listResentlyUsedUseCases,
    createUseCase,
    updateUseCase,
    updateRecentUseUseCase,
    deleteUseCase,
    toggleFavorite,
    toggleShared,
  } = useUseCaseBuilderApi();

  const {
    data: myUseCases,
    isLoading: isLoadingMyUseCases,
    mutate: mutateMyUseCases,
  } = listMyUseCases();

  const {
    data: favoriteUseCases,
    isLoading: isLoadingFavoriteUseCases,
    mutate: mutateFavoriteUseCases,
  } = listFavoriteUseCases();

  const {
    data: recentlyUsedUseCases,
    isLoading: isLoadingRecentlyUsedUseCases,
    mutate: mutateRecentlyUsedUseCases,
  } = listResentlyUsedUseCases();

  const findIndex = (useCaseId: string) => {
    return myUseCases?.findIndex((d) => d.useCaseId === useCaseId) ?? -1;
  };

  return {
    myUseCases: myUseCases ?? [],
    isLoadingMyUseCases,
    favoriteUseCases: favoriteUseCases ?? [],
    isLoadingFavoriteUseCases,
    recentlyUsedUseCases: recentlyUsedUseCases ?? [],
    isLoadingRecentlyUsedUseCases,

    createUseCase: (params: {
      title: string;
      promptTemplate: string;
      description?: string;
      inputExamples?: UseCaseInputExample[];
      fixedModelId?: string;
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
    }) => {
      // 一覧の更新
      const index = findIndex(params.useCaseId);
      if (index > -1 && myUseCases) {
        mutateMyUseCases(
          produce(myUseCases, (draft) => {
            draft[index].title = myUseCases[index].title;
          }),
          {
            revalidate: false,
          }
        );
      }

      return updateUseCase(params.useCaseId, {
        title: params.title,
        promptTemplate: params.promptTemplate,
        description: params.description,
        inputExamples: params.inputExamples,
        fixedModelId: params.fixedModelId,
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
      // 一覧の更新
      const index = findIndex(useCaseId);
      if (index > -1 && myUseCases) {
        mutateMyUseCases(
          produce(myUseCases, (draft) => {
            draft.splice(index, 1);
          }),
          {
            revalidate: false,
          }
        );
      }

      return deleteUseCase(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateFavoriteUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
    toggleFavorite: (useCaseId: string) => {
      // お気に入り表示の切り替え（マイユースケース）
      const index = findIndex(useCaseId);
      if (index > -1 && myUseCases) {
        mutateMyUseCases(
          produce(myUseCases, (draft) => {
            draft[index].isFavorite = !myUseCases[index].isFavorite;
          }),
          {
            revalidate: false,
          }
        );
      }
      // お気に入り表示の切り替え（最近利用したユースケース）
      const indexRecentlyUsed =
        recentlyUsedUseCases?.findIndex((uc) => uc.useCaseId === useCaseId) ??
        -1;
      if (indexRecentlyUsed > -1 && recentlyUsedUseCases) {
        mutateRecentlyUsedUseCases(
          produce(recentlyUsedUseCases, (draft) => {
            draft[indexRecentlyUsed].isFavorite =
              !recentlyUsedUseCases[indexRecentlyUsed].isFavorite;
          }),
          {
            revalidate: false,
          }
        );
      }

      // お気に入り解除したら、お気に入り一覧から削除
      const favoriteIndex =
        favoriteUseCases?.findIndex((uc) => uc.useCaseId === useCaseId) ?? -1;
      if (
        favoriteIndex > -1 &&
        favoriteUseCases &&
        favoriteUseCases[favoriteIndex].isFavorite
      ) {
        mutateFavoriteUseCases(
          produce(favoriteUseCases, (draft) => {
            draft.splice(favoriteIndex, 1);
          }),
          {
            revalidate: false,
          }
        );
      }

      return toggleFavorite(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateFavoriteUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
    toggleShared: (useCaseId: string) => {
      // 共有表示の切り替え（マイユースケース）
      const index = findIndex(useCaseId);
      if (index > -1 && myUseCases) {
        mutateMyUseCases(
          produce(myUseCases, (draft) => {
            draft[index].isShared = !myUseCases[index].isShared;
          }),
          {
            revalidate: false,
          }
        );
      }
      // お気に入り表示の切り替え（最近利用したユースケース）
      const indexRecentlyUsed =
        recentlyUsedUseCases?.findIndex((uc) => uc.useCaseId === useCaseId) ??
        -1;
      if (indexRecentlyUsed > -1 && recentlyUsedUseCases) {
        mutateRecentlyUsedUseCases(
          produce(recentlyUsedUseCases, (draft) => {
            draft[indexRecentlyUsed].isShared =
              !recentlyUsedUseCases[indexRecentlyUsed].isShared;
          }),
          {
            revalidate: false,
          }
        );
      }

      return toggleShared(useCaseId).finally(() => {
        mutateMyUseCases();
        mutateRecentlyUsedUseCases();
      });
    },
  };
};

export default useMyUseCases;
