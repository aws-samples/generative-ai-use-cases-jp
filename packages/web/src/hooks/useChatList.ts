import { produce } from 'immer';
import { useMemo, useCallback } from 'react';
import useChatApi from './useChatApi';
import { ListChatsResponse, Chat } from 'generative-ai-use-cases-jp';

const useChatList = () => {
  const { listChats, deleteChat: deleteChatApi, updateTitle } = useChatApi();
  const { data, size, setSize, isLoading, mutate } = listChats();

  const chats = useMemo(() => {
    if (data) {
      return data.map((d: ListChatsResponse) => d.chats).flat();
    } else {
      return [];
    }
  }, [data]);

  const isLoadingMore = useMemo(() => {
    return (
      isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')
    );
  }, [isLoading, size, data]);

  const canLoadMore = useMemo(() => {
    return !data || data!.length === size;
  }, [data, size]);

  const loadMore = useCallback(() => {
    setSize(size + 1);
  }, [setSize, size]);

  const deleteChat = async (chatId: string) => {
    mutate(
      produce(data, (draft) => {
        if (data && draft) {
          for (const d in data) {
            const idx = data[d].chats.findIndex(
              (c) => c.chatId === `chat#${chatId}`
            );

            if (idx > -1) {
              draft[d].chats.splice(idx, 1);
              break;
            }
          }
        }
      }),
      {
        revalidate: false,
      }
    );

    return deleteChatApi(chatId).finally(() => {
      mutate();
    });
  };

  const updateChatTitle = async (chatId: string, title: string) => {
    mutate(
      produce(data, (draft) => {
        if (data && draft) {
          for (const d in data) {
            const idx = data[d].chats.findIndex(
              (c) => c.chatId === `chat#${chatId}`
            );

            if (idx > -1) {
              draft[d].chats[idx].title = title;
              break;
            }
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

  const getChatTitle = (chatId: string) => {
    const idx =
      chats.findIndex((c: Chat) => c.chatId === `chat#${chatId}`) ?? -1;

    if (idx > -1) {
      return chats[idx].title;
    } else {
      return null;
    }
  };

  return {
    loading: isLoadingMore,
    chats,
    mutate,
    updateChatTitle,
    deleteChat,
    getChatTitle,
    canLoadMore,
    loadMore,
  };
};

export default useChatList;
