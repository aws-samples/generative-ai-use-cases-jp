import {
  PredictRequest,
  PredictResponse,
  CreateChatRequest,
  CreateChatResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from '../hooks/useHttp';

const usePredictor = () => {
  const http = useHttp();

  return {
    createChat: async (req: CreateChatRequest): Promise<CreateChatResponse> => {
      const res = await http.post('chats', req);
      return res.data;
    },
    listChats: () => {
      return http.get('chats');
    },
    listMessages: (chatId: string) => {
      return http.get(`chats/${chatId}/messages`);
    },
    predict: async (req: PredictRequest): Promise<PredictResponse> => {
      const res = await http.post('predict', req);
      return res.data;
    },
  };
};

export default usePredictor;
