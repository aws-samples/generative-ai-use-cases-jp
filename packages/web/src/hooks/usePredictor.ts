import {
  PredictRequest,
  PredictResponse,
  CreateChatRequest,
  CreateChatResponse,
  ListChatsResponse,
  ListMessagesResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from '../hooks/useHttp';

const usePredictor = () => {
  const http = useHttp();

  return {
    createChat: async (req: CreateChatRequest): Promise<CreateChatResponse> => {
      const res = await http.post('chat', req);
      return res.data;
    },
    listChats: async (): Promise<ListChatsResponse> => {
      const res = await http.get('chat');
      return res.data;
    },
    listMessages: async (chatId: string): Promise<ListMessagesResponse> => {
      const res = await http.get(`chat/${chatId}`);
      return res.data;
    },
    predict: async (req: PredictRequest): Promise<PredictResponse> => {
      const res = await http.post('predict', req);
      return res.data;
    },
  };
};

export default usePredictor;
