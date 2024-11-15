import {
  UseCaseContent,
  UseCaseAsOutput,
  IsFavorite,
  IsShared,
} from './useCaseBuilder';

export type ListUseCasesRespose = UseCaseAsOutput[];
export type ListFavoriteUseCasesResponse = UseCaseAsOutput[];
export type ListRecentlyUsedUseCasesResponse = UseCaseAsOutput[];

export type GetUseCaseResponse = UseCaseAsOutput;

export type CreateUseCaseRequest = UseCaseContent;
export type CreateUseCaseRespose = UseCaseAsOutput;

export type UpdateUseCaseRequest = UseCaseContent;

export type ToggleFavoriteResponse = IsFavorite;
export type ToggleShareResponse = IsShared;
