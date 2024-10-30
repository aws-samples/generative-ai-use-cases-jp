import { CustomUseCase, CustomUseCaseMeta } from './useCaseBuilder';

export type ListUseCasesRespose = CustomUseCaseMeta[];
export type ListFavoriteUseCasesResponse = CustomUseCaseMeta[];
export type ListRecentlyUsedUseCasesResponse = CustomUseCaseMeta[];

export type GetUseCaseResponse = CustomUseCase;

export type CreateUseCaseRequest = {
  title: string;
  promptTemplate: string;
};
export type CreateUseCaseRespose = {
  useCaseId: string;
};

export type UpdateUseCaseRequest = {
  title: string;
  promptTemplate: string;
};

export type ToggleFavoriteResponse = {
  isFavorite: boolean;
};

export type ToggleShareResponse = {
  isShared: boolean;
};
