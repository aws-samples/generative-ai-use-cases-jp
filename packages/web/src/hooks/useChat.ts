import usePredictor from './usePredictor';
import { produce } from 'immer';
import { create } from 'zustand';
import {
  ShownMessage,
  RecordedMessage,
  UnrecordedMessage,
  PredictResponse,
  Chat,
  CreateChatResponse,
} from 'generative-ai-use-cases-jp';
import { useMemo } from 'react';

const useChatState = create<{
  chats: {
    [id: string]: {
      chat?: Chat;
      messages: ShownMessage[];
    };
  };
  loading: {
    [id: string]: boolean;
  };
  init: (id: string, systemContext: string) => void;
  clear: (id: string, systemContext: string) => void;
  post: (id: string, content: string) => void;
}>((set, get) => {
  const { predict, createChat } = usePredictor();

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

  const mergeRecordedMessages = (
    id: string,
    recordedMessages: RecordedMessage[]
  ) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          // messageId が付与されていない unrecorded なメッセージを削除
          draft[id].messages = draft[id].messages.filter((m) => m.messageId);
          // recorded なメッセージを末尾に追加
          draft[id].messages = draft[id].messages.concat(recordedMessages);
        }),
      };
    });
  };

  const initChat = (id: string, messages: ShownMessage[], chat?: Chat) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id] = {
            chat,
            messages,
          };
        }),
      };
    });
  };

  return {
    chats: {},
    loading: {},
    init: (id: string, systemContext: string) => {
      if (!get().chats[id]) {
        initChat(id, [{ role: 'system', content: systemContext }], undefined);
      }
    },
    clear: (id: string, systemContext: string) => {
      initChat(id, [{ role: 'system', content: systemContext }], undefined);
    },
    post: (id: string, content: string) => {
      setLoading(id, true);
      set((state) => {
        const unrecordedUserMessage: UnrecordedMessage = {
          role: 'user',
          content,
        };

        const newChats = produce(state.chats, (draft) => {
          draft[id].messages.push(unrecordedUserMessage);
        });

        if (!state.chats[id].chat) {
          // chatId が発行されていない
          // systemContext の message で Chat を初期化する
          // TODO: systemContext で初期化されていると仮定しているが Bedrock Claude では systemContext はない
          createChat({ systemContext: state.chats[id].messages[0] })
            .then((res: CreateChatResponse) => {
              initChat(
                id,
                [res.systemContext!, unrecordedUserMessage],
                res.chat,
              );

              return predict({
                chatId: res.chat.chatId,
                // TODO: Bedrock Claude では res.systemContext は undefined
                recordedMessages: [res.systemContext!],
                unrecordedMessages: [unrecordedUserMessage],
              });
            })
            .then((res: PredictResponse) => {
              mergeRecordedMessages(id, res.messages as RecordedMessage[]);
            })
            .finally(() => {
              setLoading(id, false);
            });
        } else {
          // chatId は発行されている
          predict({
            chatId: state.chats[id].chat!.chatId,
            recordedMessages: state.chats[id].messages as RecordedMessage[],
            unrecordedMessages: [unrecordedUserMessage],
          })
            .then((res: PredictResponse) => {
              mergeRecordedMessages(id, res.messages as RecordedMessage[]);
            })
            .finally(() => {
              setLoading(id, false);
            });
        }

        return {
          chats: newChats,
        };
      });
    },
  };
});

const useChat = (id: string) => {
  const { chats, loading, init, clear, post } = useChatState();

  const filteredChats = useMemo(() => {
    return chats[id]?.messages.filter((chat) => chat.role !== 'system') ?? [];
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
