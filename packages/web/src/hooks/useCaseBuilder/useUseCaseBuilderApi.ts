import {
  CreateUseCaseRequest,
  CreateUseCaseRespose,
  GetUseCaseResponse,
  ListFavoriteUseCasesResponse,
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
    getUseCase: (useCaseId?: string) => {
      return http.get<GetUseCaseResponse, AxiosError>(
        useCaseId ? `/usecases/${useCaseId}` : null
      );
    },
    createUseCase: (params: CreateUseCaseRequest) => {
      return http
        .post<CreateUseCaseRespose, CreateUseCaseRequest>('/usecases', params)
        .then((res) => {
          return res.data;
        });
    },
    updateUseCase: (useCaseId: string, params: UpdateUseCaseRequest) => {
      return http.put<null, UpdateUseCaseRequest>(
        `/usecases/${useCaseId}`,
        params
      );
    },
    deleteUseCase: (useCaseId: string) => {
      return http.delete(`/usecases/${useCaseId}`);
    },
    toggleFavorite: (useCaseId: string) => {
      return http.put<ToggleFavoriteResponse>(
        `/usecases/${useCaseId}/favorite`,
        {}
      );
    },
    toggleShared: (useCaseId: string) => {
      return http.put<ToggleShareResponse>(`/usecases/${useCaseId}/shared`, {});
    },
  };
};

export default useUseCaseBuilderApi;
