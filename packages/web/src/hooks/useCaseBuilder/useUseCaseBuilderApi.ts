import {
  CreateUseCaseRequest,
  CreateUseCaseRespose,
  GetUseCaseResponse,
  ListFavoriteUseCasesResponse,
  ListRecentlyUsedUseCasesResponse,
  ListUseCasesRespose,
  ToggleFavoriteResponse,
  ToggleShareResponse,
  UpdateUseCaseRequest,
} from 'generative-ai-use-cases-jp';
import useHttp from '../useHttp';
import { AxiosError } from 'axios';

const useUseCaseBuilderApi = () => {
  const http = useHttp();

  return {
    listMyUseCases: () => {
      return http.get<ListUseCasesRespose>('/usecases');
    },
    listFavoriteUseCases: () => {
      return http.get<ListFavoriteUseCasesResponse>('/usecases/favorite');
    },
    listResentlyUsedUseCases: () => {
      return http.get<ListRecentlyUsedUseCasesResponse>('/usecases/recent');
    },
    getUseCase: (useCaseId?: string) => {
      return http.get<GetUseCaseResponse, AxiosError>(
        useCaseId ? `/usecases/${useCaseId}` : null
      );
    },
    createUseCase: async (params: CreateUseCaseRequest) => {
      return http
        .post<CreateUseCaseRespose, CreateUseCaseRequest>('/usecases', params)
        .then((res) => {
          return res.data;
        });
    },
    updateUseCase: async (useCaseId: string, params: UpdateUseCaseRequest) => {
      return http.put<null, UpdateUseCaseRequest>(
        `/usecases/${useCaseId}`,
        params
      );
    },
    updateRecentUseUseCase: async (useCaseId: string) => {
      return http.put<null>(`/usecases/recent/${useCaseId}`, {});
    },
    deleteUseCase: async (useCaseId: string) => {
      return http.delete(`/usecases/${useCaseId}`);
    },
    toggleFavorite: async (useCaseId: string) => {
      return http.put<ToggleFavoriteResponse>(
        `/usecases/${useCaseId}/favorite`,
        {}
      );
    },
    toggleShared: async (useCaseId: string) => {
      return http.put<ToggleShareResponse>(`/usecases/${useCaseId}/shared`, {});
    },
  };
};

export default useUseCaseBuilderApi;
