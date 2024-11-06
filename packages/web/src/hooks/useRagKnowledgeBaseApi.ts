import {
  RetrieveKnowledgeBaseRequest,
  RetrieveKnowledgeBaseResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from './useHttp';

const useRagKnowledgeBaseApi = () => {
  const http = useHttp();
  return {
    retrieve: (query: string, s3datasource?: string) => {
      return http.post<
        RetrieveKnowledgeBaseResponse,
        RetrieveKnowledgeBaseRequest
      >('/rag-knowledge-base/retrieve', {
        query,
        s3datasource, // s3datasource パラメータを追加
      });
    },
  };
};

export default useRagKnowledgeBaseApi;
