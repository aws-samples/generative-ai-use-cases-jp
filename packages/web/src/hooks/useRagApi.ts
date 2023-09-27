import {
  QueryKendraRequest,
  QueryKendraResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from './useHttp';

const useRagApi = () => {
  const http = useHttp();
  return {
    query: (query: string) => {
      return http.post<QueryKendraResponse, QueryKendraRequest>('/rag/query', {
        query,
      });
    },
  };
};

export default useRagApi;
