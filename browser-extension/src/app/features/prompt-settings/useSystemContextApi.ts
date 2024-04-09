import { GetSystemContextsRequest } from '../../../@types/backend-api';
import useHttp from '../common/hooks/useHttp';

const useSystemContextApi = () => {
  const http = useHttp();

  return {
    // createSystemContext: async (
    //   systemContextTitle: string,
    //   systemContext: string
    // ): Promise<CreateSystemContextRequest> => {
    //   const res = await http.post('/systemcontexts', {
    //     systemContextTitle: systemContextTitle,
    //     systemContext: systemContext,
    //   });
    //   return res.data;
    // },
    // deleteSystemContext: async (_systemContextId: string) => {
    //   const systemContextId = decomposeSystemContextId(_systemContextId);
    //   return http.delete<void>(`/systemcontexts/${systemContextId}`);
    // },
    listSystemContexts: () => {
      return http.get<GetSystemContextsRequest>('/systemcontexts');
    },
  };
};

export default useSystemContextApi;
