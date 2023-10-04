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
  const getConversationTitle = (chatId: string) => {
    const idx =
      data?.chats.findIndex((d) => d.chatId === `chat#${chatId}`) ?? -1;

    if (idx > -1) {
      return data!.chats[idx].title;
    } else {
      return null;
    }
  };

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
    mutate,
    updateConversationTitle,
    deleteConversation,
    getConversationTitle,
  };
};

export default useConversation;
