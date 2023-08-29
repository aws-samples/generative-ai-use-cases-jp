import {
  CreateChatResponse,
  CreateMessagesRequest,
  CreateMessagesResponse,
  ListChatsResponse,
  ListMessagesResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from './useHttp';

const useChatApi = () => {
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
      return http.get<ListChatsResponse>('chats');
    },
    listMessages: (chatId: string) => {
      return http.get<ListMessagesResponse>(
        chatId !== '' ? `chats/${chatId}/messages` : null
      );
    },
  };
};

export default useChatApi;
