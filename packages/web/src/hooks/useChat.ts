import usePredictor from './usePredictor';
import { produce } from 'immer';
import { create } from 'zustand';
import {
  ShownMessage,
  RecordedMessage,
  UnrecordedMessage,
  ToBeRecordedMessage,
  Chat,
  CreateMessagesResponse,
} from 'generative-ai-use-cases-jp';
import { useMemo } from 'react';
import { v4 as uuid } from 'uuid';

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
  const { predict, createChat, createMessages } = usePredictor();

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

  const initChat = (id: string, messages: UnrecordedMessage[], chat?: Chat) => {
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

  const pushAssistantRawMessage = (id: string, text: string) => {
    set((state) => {
      const unrecordedAssistantMessage: UnrecordedMessage = {
        role: 'assistant',
        content: text,
      };

      const newChats = produce(state.chats, (draft) => {
        draft[id].messages.push(unrecordedAssistantMessage);
      });

      return {
        chats: newChats,
      };
    });
  };

  const createChatIfNotExist = async (
    id: string,
    chat?: Chat
  ): Promise<string> => {
    if (chat) {
      return chat.chatId;
    }

    const { chat: newChat } = await createChat();

    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        draft[id].chat = newChat;
      });

      return {
        chats: newChats,
      };
    });

    return newChat.chatId;
  };

  const addMessageIdsToUnrecordedMessages = (
    id: string
  ): ToBeRecordedMessage[] => {
    const toBeRecordedMessages: ToBeRecordedMessage[] = [];

    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        for (const m of draft[id].messages) {
          if (!m.messageId) {
            m.messageId = uuid();
            // 参照が切れるとエラーになるため clone する
            toBeRecordedMessages.push(
              Object.assign({}, m as ToBeRecordedMessage)
            );
          }
        }
      });

      return {
        chats: newChats,
      };
    });

    return toBeRecordedMessages;
  };

  const replaceUnrecordedMessages = (
    id: string,
    messages: RecordedMessage[]
  ) => {
    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        for (const m of messages) {
          const idx = draft[id].messages
            .map((_m: ShownMessage) => _m.messageId)
            .indexOf(m.messageId);

          if (idx >= 0) {
            draft[id].messages[idx] = m;
          }
        }
      });

      return {
        chats: newChats,
      };
    });
  };

  const omitUnusedMessageProperties = (
    messages: ShownMessage[]
  ): UnrecordedMessage[] => {
    return messages.map((m) => {
      return {
        role: m.role,
        content: m.content,
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

        predict({
          messages: omitUnusedMessageProperties(newChats[id].messages),
        })
          .then((text: string) => {
            // アシスタントの答えをデータベースに未記録状態でフロントエンドに反映
            pushAssistantRawMessage(id, text);

            // ローディングはここで終了
            setLoading(id, false);

            // Chat がなければ作成 (あれば既存のものを返す)
            return createChatIfNotExist(id, state.chats[id].chat);
          })
          .then((chatId: string) => {
            // 未記録のメッセージに messageId を付与
            const toBeRecordedMessages = addMessageIdsToUnrecordedMessages(id);

            // messageId を付与したメッセージをデータベースに記録する
            return createMessages(chatId, { messages: toBeRecordedMessages });
          })
          .then(({ messages }: CreateMessagesResponse) => {
            // state にある未記録のメッセージを記録済みメッセージと置き換える
            replaceUnrecordedMessages(id, messages);
          });

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
