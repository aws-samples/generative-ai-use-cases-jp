import usePredictor from './usePredictor';
import { produce } from 'immer';
import { create } from 'zustand';
import {
  ShownMessage,
  RecordedMessage,
  UnrecordedMessage,
  ToBeRecordedMessage,
  Chat,
} from 'generative-ai-use-cases-jp';
import { useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import useChatApi from './useChatApi';

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
  initFromMessages: (
    id: string,
    messages: RecordedMessage[],
    chat: Chat
  ) => void;
  clear: (id: string, systemContext: string) => void;
  post: (id: string, content: string) => void;
}>((set, get) => {
  const { predictStream, predictTitle } = usePredictor();
  const { createChat, createMessages } = useChatApi();

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

  const setTitle = (id: string, title: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id].chat!.title = title;
        }),
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
    initFromMessages: (id: string, messages: RecordedMessage[], chat: Chat) => {
      initChat(id, messages, chat);
    },
    clear: (id: string, systemContext: string) => {
      initChat(id, [{ role: 'system', content: systemContext }], undefined);
    },
    post: async (id: string, content: string) => {
      setLoading(id, true);

      const unrecordedUserMessage: UnrecordedMessage = {
        role: 'user',
        content,
      };

      const unrecordedAssistantMessage: UnrecordedMessage = {
        role: 'assistant',
        content: '',
      };

      // User/Assistant の発言を反映
      set((state) => {
        const newChats = produce(state.chats, (draft) => {
          draft[id].messages.push(unrecordedUserMessage);
          draft[id].messages.push(unrecordedAssistantMessage);
        });

        return {
          chats: newChats,
        };
      });

      const stream = predictStream({
        // 最後のメッセージはアシスタントのメッセージなので、排除
        messages: omitUnusedMessageProperties(
          get().chats[id].messages.slice(0, -1)
        ),
      });

      // Assistant の発言を更新
      for await (const chunk of stream) {
        set((state) => {
          const newChats = produce(state.chats, (draft) => {
            const oldAssistantMessage = draft[id].messages.pop()!;
            const newAssistantMessage: UnrecordedMessage = {
              role: 'assistant',
              content: oldAssistantMessage.content + chunk,
            };

            draft[id].messages.push(newAssistantMessage);
          });

          return {
            chats: newChats,
          };
        });
      }

      setLoading(id, false);

      const chatId = await createChatIfNotExist(id, get().chats[id].chat);

      // 最初の応答が終わった時点でタイトルを設定
      if (get().chats[id].messages.length <= 3) {
        const title = await predictTitle({
          chat: get().chats[id].chat!,
          messages: get().chats[id].messages.filter((m) => !m.messageId),
        });
        setTitle(id, title);
      }

      const toBeRecordedMessages = addMessageIdsToUnrecordedMessages(id);
      const { messages } = await createMessages(chatId, {
        messages: toBeRecordedMessages,
      });

      replaceUnrecordedMessages(id, messages);
    },
  };
});

const useChat = (id: string, systemContext?: string, chatId?: string) => {
  const { chats, loading, init, initFromMessages, clear, post } =
    useChatState();
  const { data: messagesData, isLoading } = useChatApi().listMessages(
    chatId ?? ''
  );

  useEffect(() => {
    // 新規チャットの場合
    if (!chatId && systemContext) {
      init(id, systemContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 登録済みのチャットの場合
    if (!isLoading && messagesData) {
      initFromMessages(
        id,
        messagesData.messages,
        // chatId以外使わないので、あとは空白
        {
          chatId: `chat#${chatId}` ?? '',
          id: '',
          createdDate: '',
          usecase: '',
          title: '',
          updatedDate: '',
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const filteredMessages = useMemo(() => {
    return chats[id]?.messages.filter((chat) => chat.role !== 'system') ?? [];
  }, [chats, id]);

  return {
    loading: loading[id] ?? false,
    loadingMessages: isLoading,
    clearChats: (systemContext: string) => clear(id, systemContext),
    messages: filteredMessages,
    isEmpty: filteredMessages.length === 0,
    postChat: (content: string) => {
      post(id, content);
    },
  };
};

export default useChat;
