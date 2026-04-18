import {
  MeetingMinutesCustomPrompt,
  UpdateMeetingMinutesCustomPromptResponse,
} from 'generative-ai-use-cases';
import useHttp from './useHttp';
import { decomposeId } from '../utils/ChatUtils';

const useMeetingMinutesCustomPromptApi = () => {
  const http = useHttp();

  return {
    createMeetingMinutesCustomPrompt: async (
      title: string,
      body: string
    ): Promise<{ meetingMinutesCustomPrompt: MeetingMinutesCustomPrompt }> => {
      const res = await http.post('/meeting-minutes/custom-prompts', {
        meetingMinutesCustomPromptTitle: title,
        meetingMinutesCustomPromptBody: body,
      });
      return res.data;
    },
    listMeetingMinutesCustomPrompts: () => {
      return http.get<MeetingMinutesCustomPrompt[]>(
        '/meeting-minutes/custom-prompts'
      );
    },
    updateMeetingMinutesCustomPrompt: async (
      _meetingMinutesCustomPromptId: string,
      title: string,
      body: string
    ): Promise<UpdateMeetingMinutesCustomPromptResponse> => {
      const id = decomposeId(_meetingMinutesCustomPromptId);
      const res = await http.put(`/meeting-minutes/custom-prompts/${id}`, {
        meetingMinutesCustomPromptTitle: title,
        meetingMinutesCustomPromptBody: body,
      });
      return res.data;
    },
    deleteMeetingMinutesCustomPrompt: async (
      _meetingMinutesCustomPromptId: string
    ) => {
      const id = decomposeId(_meetingMinutesCustomPromptId);
      return http.delete<void>(`/meeting-minutes/custom-prompts/${id}`);
    },
  };
};

export default useMeetingMinutesCustomPromptApi;
