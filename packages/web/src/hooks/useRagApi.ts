import {
  // GetDocDownloadSignedUrlRequest,
  // GetDocDownloadSignedUrlResponse,
  QueryKendraRequest,
  QueryKendraResponse,
  RetrieveKendraRequest,
  RetrieveKendraResponse,
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
    retrieve: (query: string) => {
      return http.post<RetrieveKendraResponse, RetrieveKendraRequest>(
        '/rag/retrieve',
        {
          query,
        }
      );
    },
    // getDocDownloadSignedUrl: async (bucketName: string, filePrefix: string, region?: string) => {
    //   const params: GetDocDownloadSignedUrlRequest = {
    //     bucketName,
    //     filePrefix,
    //     region,
    //   };
    //   const { data: url } = await http.api.get<GetDocDownloadSignedUrlResponse>(
    //     '/rag/doc/download-url',
    //     {
    //       params,
    //     }
    //   );
    //   return url;
    // },
  };
};

export default useRagApi;
