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
}>((set) => {
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

  const replaceAndPushMessages = (
    id: string,
    recordedMessages: RecordedMessage[]
  ) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          // 記録されていない User のメッセージを削除
          draft[id].messages.pop();
          // 記録されたもので置き換えつつ、アシスタントのメッセージを追加
          draft[id].messages = draft[id].messages.concat(recordedMessages);
        }),
      };
    });
  };

  const initChat = (id: string, chat: Chat, messages: ShownMessage[]) => {
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
    init: (id: string, systemContext: string) =>
      set((state) => {
        if (!state.chats[id]) {
          return {
            chats: produce(state.chats, (draft) => {
              draft[id] = {
                messages: [
                  {
                    role: 'system',
                    content: systemContext,
                  },
                ],
              };
            }),
          };
        }

        return {};
      }),
    clear: (id: string, systemContext: string) => {
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft[id] = {
              messages: [
                {
                  role: 'system',
                  content: systemContext,
                },
              ],
            };
          }),
        };
      });
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
          createChat({ unrecordedMessages: [state.chats[id].messages[0]] })
            .then((res: CreateChatResponse) => {
              console.log('chat created', res);
              initChat(
                id,
                res.chat,
                (res.messages as ShownMessage[]).concat(unrecordedUserMessage)
              );

              return predict({
                chatId: res.chat.chatId,
                recordedMessages: res.messages,
                unrecordedMessages: [unrecordedUserMessage],
              });
            })
            .then((res: PredictResponse) => {
              console.log('predicted', res);
              replaceAndPushMessages(id, res.messages as RecordedMessage[]);
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
              console.log('predicted', res);
              replaceAndPushMessages(id, res.messages as RecordedMessage[]);
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
