import usePredictor from './usePredictor';
import { produce } from 'immer';
import { create } from 'zustand';
import { PredictContent } from '../@types/predict';
import { useMemo } from 'react';

const useChatState = create<{
  chats: {
    [id: string]: PredictContent[];
  };
  loading: {
    [id: string]: boolean;
  };
  init: (id: string, systemContext: string) => void;
  clear: (id: string, systemContext: string) => void;
  post: (id: string, content: string) => void;
}>((set) => {
  const { predict } = usePredictor();

  const setLoading = (id: string, newLoading: boolean) => {
    set((state) => {
      return {
        loading: {
          ...state.loading,
          [id]: newLoading,
        },
      };
    });
  };

  const pushAssistantContent = (id: string, content: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id].push({
            role: 'assistant',
            content: content,
          });
        }),
      };
    });
  };

  return {
    chats: {},
    loading: {},
    init: (id: string, systemContext: string) =>
      set((state) => {
        if (state.chats[id]) {
          return {};
        } else {
          return {
            chats: {
              ...state.chats,
              [id]: [
                {
                  role: 'system',
                  content: systemContext,
                },
              ],
            },
          };
        }
      }),
    clear: (id: string, systemContext: string) =>
      set((state) => {
        return {
          chats: {
            ...state.chats,
            [id]: [
              {
                role: 'system',
                content: systemContext,
              },
            ],
          },
        };
      }),
    post: (id: string, content: string) => {
      setLoading(id, true);
      set((state) => {
        const newChats = produce(state.chats, (draft) => {
          draft[id].push({
            role: 'user',
            content: content,
          });
        });

        predict(newChats[id])
          .then((newChat) => {
            pushAssistantContent(id, newChat.content);
          })
          .finally(() => {
            setLoading(id, false);
          });

        return {
          chats: newChats,
        };
      });
    },
    postUserContent: (id: string, content: string) =>
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft[id].push({
              role: 'user',
              content: content,
            });
          }),
        };
      }),
    postAssistantContent: (id: string, content: string) =>
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft[id].push({
              role: 'assistant',
              content: content,
            });
          }),
        };
      }),
  };
});

const useChat = (id: string) => {
  const { chats, loading, init, clear, post } = useChatState();

  const filteredChats = useMemo(() => {
    return chats[id]?.filter((chat) => chat.role !== 'system') ?? [];
  }, [chats, id]);

  return {
    loading: loading[id] ?? false,
    initChats: (systemContext: string) => init(id, systemContext),
    clearChats: (systemContext: string) => clear(id, systemContext),
    chats: filteredChats,
    isEmpty: filteredChats.length === 0,
    postChat: (content: string) => {
      post(id, content);
    },
  };
};

export default useChat;
