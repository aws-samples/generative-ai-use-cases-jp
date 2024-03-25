import {
  CreateSystemContextRequest,
  FindSystemContextByIdResponse,
} from 'generative-ai-use-cases-jp';

import useHttp from './useHttp';
import { decomposeSystemContextId } from '../utils/SystemContextUtils';
import { SystemContextListItem } from 'generative-ai-use-cases-jp/src/systemContext';

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
      const res = http.get<SystemContextListItem[]>('/systemcontexts');
      return res;
    },
    findSystemContextById: (systemContextId?: string) => {
      return http.get<FindSystemContextByIdResponse>(
        systemContextId ? `/systemcontexts/${systemContextId}` : null
      );
    },
  };
};

export default useSystemContextApi;
