import { produce } from 'immer';
import useUseCaseBuilderApi from './useUseCaseBuilderApi';

const useMyUseCases = () => {
  const {
    listMyUseCases,
    listFavoriteUseCases,
    createUseCase,
    updateUseCase,
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

  const findIndex = (useCaseId: string) => {
    return myUseCases?.findIndex((d) => d.useCaseId === useCaseId) ?? -1;
  };

  return {
    myUseCases: myUseCases ?? [],
    isLoadingMyUseCases,
    favoriteUseCases: favoriteUseCases ?? [],
    isLoadingFavoriteUseCases,

    createUseCase: (params: { title: string; promptTemplate: string }) => {
      return createUseCase(params);
    },
    updateUseCase: (params: {
      useCaseId: string;
      title: string;
      promptTemplate: string;
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
      }).finally(() => {
        mutateMyUseCases();
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
      });
    },
    toggleFavorite: (useCaseId: string) => {
      // お気に入り表示の切り替え
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
      });
    },
    toggleShared: (useCaseId: string) => {
      // 共有表示の切り替え
      const index = findIndex(useCaseId);
      if (index > -1 && myUseCases) {
        mutateMyUseCases(
          produce(myUseCases, (draft) => {
            draft[index].hasShared = !myUseCases[index].hasShared;
          }),
          {
            revalidate: false,
          }
        );
      }

      return toggleShared(useCaseId).finally(() => {
        mutateMyUseCases();
      });
    },
  };
};

export default useMyUseCases;
