export type CustomUseCaseMeta = {
  ownerUserId: string;
  useCaseId: string;
  title: string;
  isFavorite: boolean;
  hasShared: boolean;
  isMyUseCase?: boolean;
};

export type CustomUseCase = CustomUseCaseMeta & {
  promptTemplate: string;
};

export type UseCaseId = {
  useCaseId: string;
};

export type IsFavorite = {
  isFavorite: boolean;
};

export type HasShared = {
  hasShared: boolean;
};

export type CreateUseCaseRequest = {
  title: string;
  promptTemplate: string;
};

export type UpdateUseCaseRequest = {
  title: string;
  promptTemplate: string;
};

export type ToggleFavoriteRequest = {
  ownerUserId: string;
};
