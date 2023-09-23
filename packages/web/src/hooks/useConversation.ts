import { produce } from 'immer';
import useChatApi from './useChatApi';

const useConversation = () => {
  const { listChats, deleteChat, updateTitle } = useChatApi();
  const { data, isLoading, mutate } = listChats();
  const deleteConversation = (chatId: string) => {
    mutate(
      produce(data, (draft) => {
        if (data && draft) {
          const idx = data.chats.findIndex(
            (c) => c.chatId === `chat#${chatId}`
          );
          if (idx > -1) {
            draft.chats.splice(idx, 1);
          }
        }
      }),
      {
        revalidate: false,
      }
    );

    return deleteChat(chatId).finally(() => {
      mutate();
    });
  };
  const updateConversationTitle = (chatId: string, title: string) => {
    mutate(
      produce(data, (draft) => {
        if (data && draft) {
          const idx = data.chats.findIndex(
            (c) => c.chatId === `chat#${chatId}`
          );
          if (idx > -1) {
            draft.chats[idx].title = title;
          }
        }
      }),
      {
        revalidate: false,
      }
    );
    return updateTitle(chatId, title).finally(() => {
      mutate();
    });
  };

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
    mutate,
    updateConversationTitle,
    deleteConversation,
  };
};

export default useConversation;
