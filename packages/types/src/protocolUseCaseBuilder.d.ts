import {
  CustomUseCase,
  CustomUseCaseMeta,
  UseCaseInputExample,
} from './useCaseBuilder';

export type ListUseCasesRespose = CustomUseCaseMeta[];
export type ListFavoriteUseCasesResponse = CustomUseCaseMeta[];
export type ListRecentlyUsedUseCasesResponse = CustomUseCaseMeta[];

export type GetUseCaseResponse = CustomUseCase;

export type CreateUseCaseRequest = {
  title: string;
  description?: string;
  promptTemplate: string;
  inputExamples?: UseCaseInputExample[];
};
export type CreateUseCaseRespose = {
  useCaseId: string;
};

export type UpdateUseCaseRequest = {
  title: string;
  description?: string;
  promptTemplate: string;
  inputExamples?: UseCaseInputExample[];
};

export type ToggleFavoriteResponse = {
  isFavorite: boolean;
};

export type ToggleShareResponse = {
  isShared: boolean;
};
