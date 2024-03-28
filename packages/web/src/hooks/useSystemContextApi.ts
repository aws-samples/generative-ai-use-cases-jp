import {
  CreateSystemContextRequest,
  SystemContext,
} from 'generative-ai-use-cases-jp';

import useHttp from './useHttp';
import { decomposeSystemContextId } from '../utils/SystemContextUtils';

const useSystemContextApi = () => {
  const http = useHttp();

  return {
    createSystemContext: async (
      systemContextTitle: string,
      systemContext: string
    ): Promise<CreateSystemContextRequest> => {
      const res = await http.post('/systemcontexts', {
        systemContextTitle: systemContextTitle,
        systemContext: systemContext,
      });
      return res.data;
    },
    deleteSystemContext: async (_systemContextId: string) => {
      const systemContextId = decomposeSystemContextId(_systemContextId);
      return http.delete<void>(`/systemcontexts/${systemContextId}`);
    },
    listSystemContexts: () => {
      const res = http.get<SystemContext[]>('/systemcontexts');
      return res;
    },
  };
};

export default useSystemContextApi;
