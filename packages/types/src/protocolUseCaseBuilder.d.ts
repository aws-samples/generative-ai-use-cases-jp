import {
  UseCaseContent,
  UseCaseAsOutput,
  IsFavorite,
  IsShared,
} from './useCaseBuilder';
import { Pagination } from './protocol';

export type ListUseCasesResponse = Pagination<UseCaseAsOutput>;
export type ListFavoriteUseCasesResponse = Pagination<UseCaseAsOutput>;
export type ListRecentlyUsedUseCasesResponse = Pagination<UseCaseAsOutput>;

export type GetUseCaseResponse = UseCaseAsOutput;

export type CreateUseCaseRequest = UseCaseContent;
export type CreateUseCaseRespose = UseCaseAsOutput;

export type UpdateUseCaseRequest = UseCaseContent;

export type ToggleFavoriteResponse = IsFavorite;
export type ToggleShareResponse = IsShared;
