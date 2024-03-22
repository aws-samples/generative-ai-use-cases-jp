import {
  CreateSystemContextRequest,
  FindSystemContextByIdResponse,
} from 'generative-ai-use-cases-jp';

import useHttp from './useHttp';
import { SystemContextList } from '../prompts';
import { decomposeSystemContextId } from '../utils/SystemContextUtils';

const useSystemContextApi = () => {
  const http = useHttp();

  return {
    createSystemContext: async (systemContextTitle:string, systemContext:string): Promise<CreateSystemContextRequest> => {
      const res = await http.post('/systemcontexts', {systemContextTitle:systemContextTitle,systemContext:systemContext});
      return res.data;
    },
    deleteSystemContext: async (_systemContextId: string) => {
      const systemContextId = decomposeSystemContextId(_systemContextId)
      return http.delete<void>(`/systemcontexts/${systemContextId}`);
    },
    listSystemContexts: () => {
      const res = http.get<SystemContextList>('/systemcontexts');
      return res;
    },
    findChatById: (systemContextId?: string) => {
      return http.get<FindSystemContextByIdResponse>(
        systemContextId ? `/systemcontexts/${systemContextId}` : null
      );
    },
  };
};

export default useSystemContextApi;
