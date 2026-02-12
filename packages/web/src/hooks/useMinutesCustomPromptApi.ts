import {
  MinutesCustomPrompt,
  UpdateMinutesCustomPromptResponse,
} from 'generative-ai-use-cases';
import useHttp from './useHttp';
import { decomposeId } from '../utils/ChatUtils';

const useMinutesCustomPromptApi = () => {
  const http = useHttp();

  return {
    createMinutesCustomPrompt: async (
      title: string,
      body: string
    ): Promise<{ minutesCustomPrompt: MinutesCustomPrompt }> => {
      const res = await http.post('/minutes-custom-prompts', {
        minutesCustomPromptTitle: title,
        minutesCustomPromptBody: body,
      });
      return res.data;
    },
    listMinutesCustomPrompts: () => {
      return http.get<MinutesCustomPrompt[]>('/minutes-custom-prompts');
    },
    updateMinutesCustomPrompt: async (
      _minutesCustomPromptId: string,
      title: string,
      body: string
    ): Promise<UpdateMinutesCustomPromptResponse> => {
      const id = decomposeId(_minutesCustomPromptId);
      const res = await http.put(`/minutes-custom-prompts/${id}`, {
        title,
        body,
      });
      return res.data;
    },
    deleteMinutesCustomPrompt: async (_minutesCustomPromptId: string) => {
      const id = decomposeId(_minutesCustomPromptId);
      return http.delete<void>(`/minutes-custom-prompts/${id}`);
    },
  };
};

export default useMinutesCustomPromptApi;
