import usePredictor from './usePredictor';
import { produce } from 'immer';
import { create } from 'zustand';
import { PredictContent } from '../@types/predict';

const useChatState = create<{
  chats: PredictContent[];
  loading: boolean;
  init: (systemContext: string) => void;
  post: (content: string) => void;
}>((set) => {
  const { predict } = usePredictor();

  const setLoading = (newLoading: boolean) => {
    set(() => {
      return {
        loading: newLoading,
      };
    });
  };

  const pushAssistantContent = (content: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft.push({
            role: 'assistant',
            content: content,
          });
        }),
      };
    });
  };

  return {
    chats: [],
    loading: false,
    init: (systemContext: string) =>
      set(() => {
        return {
          chats: [
            {
              role: 'system',
              content: systemContext,
            },
          ],
        };
      }),
    post: (content: string) => {
      setLoading(true);
      set((state) => {
        const newChats = produce(state.chats, (draft) => {
          draft.push({
            role: 'user',
            content: content,
          });
        });

        predict(newChats)
          .then((newChat) => {
            pushAssistantContent(newChat.content);
          })
          .finally(() => {
            setLoading(false);
          });

        return {
          chats: newChats,
        };
      });
    },
    postUserContent: (content: string) =>
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft.push({
              role: 'user',
              content: content,
            });
          }),
        };
      }),
    postAssistantContent: (content: string) =>
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft.push({
              role: 'assistant',
              content: content,
            });
          }),
        };
      }),
  };
});

const useChat = () => {
  const [chats, loading, initChats, post] = useChatState((state) => [
    state.chats,
    state.loading,
    state.init,
    state.post,
  ]);

  return {
    loading,
    initChats: initChats,
    chats: chats.filter((chat) => chat.role !== 'system'),
    postChat: (content: string) => {
      post(content);
    },
  };
};

export default useChat;
