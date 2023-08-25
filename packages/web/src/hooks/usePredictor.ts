import {
  PredictRequest,
  PredictResponse,
  CreateChatResponse,
  CreateMessagesRequest,
  CreateMessagesResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from '../hooks/useHttp';

const usePredictor = () => {
  const http = useHttp();

  return {
    createChat: async (): Promise<CreateChatResponse> => {
      const res = await http.post('chats', {});
      return res.data;
    },
    createMessages: async (
      _chatId: string,
      req: CreateMessagesRequest
    ): Promise<CreateMessagesResponse> => {
      const chatId = _chatId.split('#')[1];
      const res = await http.post(`chats/${chatId}/messages`, req);
      return res.data;
    },
    listChats: () => {
      return http.get('chats');
    },
    listMessages: (chatId: string) => {
      return http.get(`chats/${chatId}/messages`);
    },
    predict: async (req: PredictRequest): Promise<PredictResponse> => {
      const res = await http.post('predict', req, { responseType: 'blob' });
      return await res.data.text();
    },
  };
};

export default usePredictor;
