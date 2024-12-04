import { produce } from 'immer';
import { create } from 'zustand';
import {
  StreamingChunk,
  ShownMessage,
  RecordedMessage,
  UnrecordedMessage,
  ToBeRecordedMessage,
  Chat,
  Role,
  UploadedFileType,
  ExtraData,
  Model,
  UpdateFeedbackRequest,
} from 'generative-ai-use-cases-jp';
import { useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import useChatApi from './useChatApi';
import useChatList from './useChatList';
// TODO: SWR 2.2.5 では InifiniteKeyedMutator が export されていない
// 以下のコミットで対応されている => 2.2.6 が stable になり次第こちらを対応する (それまでは any を許容する)
// https://github.com/vercel/swr/commit/cb2946ddcafbeedecf724aa19b3929865c026bc7
// import { InfiniteKeyedMutator } from 'swr/infinite';
// mutateListChat の本来の型は InfiniteKeyedMutator<ListChatsResponse[]>
import { getPrompter } from '../prompts';
import { findModelByModelId } from './useModel';

const useChatState = create<{
  chats: {
    [id: string]: {
      chat?: Chat;
      messages: ShownMessage[];
      stopReason: string;
    };
  };
  modelIds: {
    [id: string]: string;
  };
  loading: {
    [id: string]: boolean;
  };
  getModelId: (id: string) => string;
  setModelId: (id: string, newModelId: string) => void;
  setLoading: (id: string, newLoading: boolean) => void;
  init: (id: string) => void;
  clear: (id: string) => void;
  restore: (id: string, messages: RecordedMessage[], chat: Chat) => void;
  updateSystemContext: (id: string, systemContext: string) => void;
  getCurrentSystemContext: (id: string) => string;
  pushMessage: (id: string, role: Role, content: string) => void;
  popMessage: (id: string) => ShownMessage | undefined;
  post: (
    id: string,
    content: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateListChat: any, // TODO: ファイル上部コメント参照
    ignoreHistory: boolean,
    preProcessInput: ((message: ShownMessage[]) => ShownMessage[]) | undefined,
    postProcessOutput: ((message: string) => string) | undefined,
    sessionId: string | undefined,
    extraData: UploadedFileType[] | undefined
  ) => void;
  continueGeneration: (
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateListChat: any, // TODO: ファイル上部コメント参照
    ignoreHistory: boolean,
    preProcessInput: ((message: ShownMessage[]) => ShownMessage[]) | undefined,
    postProcessOutput: ((message: string) => string) | undefined,
    sessionId: string | undefined,
    extraData: UploadedFileType[] | undefined
  ) => void;
  sendFeedback: (
    id: string,
    feedbackData: UpdateFeedbackRequest
  ) => Promise<void>;
  getStopReason: (id: string) => string;
}>((set, get) => {
  const {
    createChat,
    createMessages,
    updateFeedback,
    predictStream,
    predictTitle,
  } = useChatApi();

  const getModelId = (id: string) => {
    return get().modelIds[id] || '';
  };

  const setModelId = (id: string, newModelId: string) => {
    set((state) => {
      return {
        modelIds: {
          ...state.modelIds,
          [id]: newModelId,
        },
      };
    });
  };

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
            stopReason: '',
          };
        }),
      };
    });
  };

  const initChatWithSystemContext = (id: string) => {
    const prompter = getPrompter(getModelId(id));
    const systemContext = prompter.systemContext(id);

    initChat(id, [{ role: 'system', content: systemContext }], undefined);
  };

  const setTitle = (id: string, title: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          if (draft[id].chat) {
            draft[id].chat!.title = title;
          }
        }),
      };
    });
  };

  const setPredictedTitle = async (id: string) => {
    const modelId = getModelId(id);
    const model = findModelByModelId(modelId)!;
    const prompter = getPrompter(modelId);
    const title = await predictTitle({
      model,
      chat: get().chats[id].chat!,
      prompt: prompter.setTitlePrompt({
        messages: omitUnusedMessageProperties(get().chats[id].messages),
      }),
      id: '/title',
    });
    setTitle(id, title);
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
            const match = id.match(/([^/]+)/);
            if (match) {
              m.usecase = '/' + match[1];
            } else {
              m.usecase = id;
            }
            // 参照が切れるとエラーになるため clone する
            toBeRecordedMessages.push(
              JSON.parse(JSON.stringify(m)) as ToBeRecordedMessage
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

  const replaceMessages = (id: string, messages: RecordedMessage[]) => {
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

  const formatMessageProperties = (
    messages: ShownMessage[],
    uploadedFiles?: UploadedFileType[]
  ): UnrecordedMessage[] => {
    return messages.map((m) => {
      // LLM で推論する形式に extraData を変換する
      const extraData: ExtraData[] | undefined = m.extraData?.flatMap(
        (data) => {
          // 推論する際は"data:image/png..." のといった情報は必要ないため、削除する
          const base64EncodedData = uploadedFiles
            ?.find((uploadedFile) => uploadedFile.s3Url === data.source.data)
            ?.base64EncodedData?.replace(/^data:(.*,)?/, '');

          // Base64 エンコードされた画像情報を設定する
          return {
            type: data.type,
            name: data.name,
            source: {
              type: 'base64',
              mediaType: data.source.mediaType,
              data: base64EncodedData ?? '',
            },
          };
        }
      );
      return {
        role: m.role,
        content: m.content,
        extraData: extraData?.filter((data) => data.source.data !== ''),
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

  const addChunkToAssistantMessage = (
    id: string,
    chunk: string,
    trace?: string,
    model?: Model
  ) => {
    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        const oldAssistantMessage = draft[id].messages.pop()!;
        const newAssistantMessage: UnrecordedMessage = {
          ...oldAssistantMessage,
          role: 'assistant',
          // 新規モデル追加時は、デフォルトで Claude の prompter が利用されるため
          // 出力が <output></output> で囲まれる可能性がある
          // 以下の処理ではそれに対応するため、<output></output> xml タグを削除している
          content: (oldAssistantMessage.content + chunk).replace(
            /(<output>|<\/output>)/g,
            ''
          ),
          trace: (oldAssistantMessage.trace || '') + (trace || ''),
          llmType: model?.modelId,
        };
        draft[id].messages.push(newAssistantMessage);
      });
      return {
        chats: newChats,
      };
    });
  };

  const updateStopReason = (id: string, stopReason: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id].stopReason = stopReason;
        }),
      };
    });
  };

  const generateMessage = async (
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateListChat: any, // TODO: ファイル上部コメント参照
    ignoreHistory: boolean,
    preProcessInput:
      | ((message: ShownMessage[]) => ShownMessage[])
      | undefined = undefined,
    postProcessOutput: ((message: string) => string) | undefined = undefined,
    sessionId: string | undefined = undefined,
    uploadedFiles: UploadedFileType[] | undefined = undefined
  ) => {
    const modelId = get().modelIds[id];

    if (!modelId) {
      console.error('modelId is not set');
      return;
    }

    const model = findModelByModelId(modelId);

    if (!model) {
      console.error(`model not found for ${modelId}`);
      return;
    }

    // Agent 用の対応
    if (sessionId) {
      model.sessionId = sessionId;
    }

    setLoading(id, true);

    // 停止理由をリセット
    updateStopReason(id, '');

    const chatMessages = get().chats[id].messages;

    // 最後のアシスタントのメッセージが存在するか確認
    const isContinue = chatMessages[chatMessages.length - 1].content.length > 0;
    // slice の第二引数
    // - 続きを出力の場合は undefined (最後まで)
    // - そうでない場合は -1 (Assistant のメッセージはカット)
    const sliceEndIndex = isContinue ? undefined : -1;

    // 最後のメッセージはアシスタントのメッセージなので、排除
    // ignoreHistory が設定されている場合は最後の会話だけ反映（コスト削減）
    let inputMessages = ignoreHistory
      ? [chatMessages[0], ...chatMessages.slice(-2, sliceEndIndex)]
      : chatMessages.slice(0, sliceEndIndex);

    // 続きを出力でアシスタントのメッセージが trailing whitespace で終了している場合以下のエラーが出る
    // final assistant content cannot end with trailing whitespace
    // Assistant のメッセージは trimEnd() で末尾の空白を排除
    if (isContinue) {
      inputMessages = inputMessages.map((m: UnrecordedMessage, i: number) => {
        if (i === inputMessages.length - 1) {
          return {
            ...m,
            content: m.content.trimEnd(),
          };
        } else {
          return m;
        }
      });
    }

    // メッセージの前処理（例：ログからの footnote の削除）
    if (preProcessInput) {
      inputMessages = preProcessInput(inputMessages);
    }

    // LLM へのリクエスト
    const formattedMessages = formatMessageProperties(
      inputMessages,
      uploadedFiles
    );

    const stream = predictStream({
      model: model,
      messages: formattedMessages,
      id: id,
    });

    // Assistant の発言を更新
    let tmpChunk = '';

    for await (const chunk of stream) {
      const chunks = chunk.split('\n');

      for (const c of chunks) {
        if (c && c.length > 0) {
          const payload = JSON.parse(c) as StreamingChunk;

          if (payload.text.length > 0) {
            tmpChunk += payload.text;
          }

          if (payload.stopReason && payload.stopReason.length > 0) {
            updateStopReason(id, payload.stopReason);
          }

          // Trace
          if (payload.trace) {
            addChunkToAssistantMessage(id, '', payload.trace, model);
          }
        }
      }

      // chunk は 10 文字以上でまとめて処理する
      // バッファリングしないと以下のエラーが出る
      // Maximum update depth exceeded
      if (tmpChunk.length >= 10) {
        addChunkToAssistantMessage(id, tmpChunk, undefined, model);
        tmpChunk = '';
      }
    }

    // tmpChunk に文字列が残っている場合は処理する
    if (tmpChunk.length > 0) {
      addChunkToAssistantMessage(id, tmpChunk, undefined, model);
    }

    // メッセージの後処理（例：footnote の付与）
    if (postProcessOutput) {
      set((state) => {
        const newChats = produce(state.chats, (draft) => {
          const oldAssistantMessage = draft[id].messages.pop()!;
          const newAssistantMessage: UnrecordedMessage = {
            ...oldAssistantMessage,
            role: 'assistant',
            content: postProcessOutput(oldAssistantMessage.content),
            trace: oldAssistantMessage.trace,
            llmType: model?.modelId,
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

    // タイトルが空文字列だった場合、タイトルを予測して設定
    if (get().chats[id].chat?.title === '') {
      setPredictedTitle(id).then(() => {
        mutateListChat();
      });
    }

    const toBeRecordedMessages = addMessageIdsToUnrecordedMessages(id);

    // 続きを出力の場合は最後のアシスタントのメッセージを更新する
    if (isContinue) {
      const lastAssistantMessage: ShownMessage =
        get().chats[id].messages[get().chats[id].messages.length - 1];
      const updatedAssistantMessage: ToBeRecordedMessage = {
        createdDate: lastAssistantMessage.createdDate!,
        messageId: lastAssistantMessage.messageId!,
        usecase: lastAssistantMessage.usecase!,
        ...lastAssistantMessage,
      };
      toBeRecordedMessages.push(updatedAssistantMessage);
    }

    const { messages } = await createMessages(chatId, {
      messages: toBeRecordedMessages,
    });

    replaceMessages(id, messages);
  };

  return {
    chats: {},
    modelIds: {},
    loading: {},
    getModelId,
    setModelId,
    setLoading,
    init: (id: string) => {
      if (!get().chats[id]) {
        initChatWithSystemContext(id);
      }
    },
    clear: (id: string) => {
      initChatWithSystemContext(id);
    },
    restore: (id: string, messages: RecordedMessage[], chat: Chat) => {
      for (const [key, value] of Object.entries(get().chats)) {
        if (value.chat?.chatId === chat.chatId) {
          initChatWithSystemContext(key);
        }
      }

      initChat(id, messages, chat);
    },
    updateSystemContext: (id: string, systemContext: string) => {
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            const idx = draft[id].messages.findIndex(
              (m) => m.role === 'system'
            );
            if (idx > -1) {
              draft[id].messages[idx].content = systemContext;
            }
          }),
        };
      });
    },
    getCurrentSystemContext: (id: string) => {
      const chat = get().chats[id];

      if (chat) {
        const systemMessage = chat.messages.filter(
          (message) => message.role === 'system'
        )[0];

        if (systemMessage) {
          return systemMessage.content;
        }
      }

      return '';
    },
    pushMessage: (id: string, role: Role, content: string) => {
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft[id].messages.push({
              role,
              content,
            });
          }),
        };
      });
    },
    popMessage: (id: string) => {
      let ret: ShownMessage | undefined;
      set((state) => {
        ret = state.chats[id].messages[state.chats[id].messages.length - 1];
        return {
          chats: produce(state.chats, (draft) => {
            draft[id].messages.pop();
          }),
        };
      });
      return ret;
    },
    post: async (
      id: string,
      content: string,
      mutateListChat,
      ignoreHistory: boolean,
      preProcessInput:
        | ((message: ShownMessage[]) => ShownMessage[])
        | undefined = undefined,
      postProcessOutput: ((message: string) => string) | undefined = undefined,
      sessionId: string | undefined = undefined,
      uploadedFiles: UploadedFileType[] | undefined = undefined
    ) => {
      const unrecordedUserMessage: UnrecordedMessage = {
        role: 'user',
        content,
        // DDB に保存する形式で、extraData を設定する
        extraData: uploadedFiles?.map((uploadedFile) => ({
          type: uploadedFile.type,
          name: uploadedFile.name,
          source: {
            type: 's3',
            mediaType: uploadedFile.file.type,
            data: uploadedFile.s3Url ?? '',
          },
        })),
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

      await generateMessage(
        id,
        mutateListChat,
        ignoreHistory,
        preProcessInput,
        postProcessOutput,
        sessionId,
        uploadedFiles
      );
    },

    continueGeneration: generateMessage,
    sendFeedback: async (id: string, feedbackData: UpdateFeedbackRequest) => {
      const chat = get().chats[id].chat;

      if (chat) {
        const { message } = await updateFeedback(chat.chatId, feedbackData);
        replaceMessages(id, [message]);
      }
    },

    getStopReason: (id: string) => {
      const chat = get().chats[id];

      if (chat) {
        return chat.stopReason;
      }

      return '';
    },
  };
});

/**
 * チャットを操作する Hooks
 * @param id 画面の URI（状態の識別に利用）
 * @param systemContext
 * @param chatId
 * @returns
 */
const useChat = (id: string, chatId?: string) => {
  const {
    chats,
    loading,
    getModelId,
    setModelId,
    setLoading,
    init,
    clear,
    restore,
    post,
    continueGeneration,
    sendFeedback,
    updateSystemContext,
    getCurrentSystemContext,
    pushMessage,
    popMessage,
    getStopReason,
  } = useChatState();
  const { data: messagesData, isLoading: isLoadingMessage } =
    useChatApi().listMessages(chatId);
  const { data: chatData, isLoading: isLoadingChat } =
    useChatApi().findChatById(chatId);
  const { mutate: mutateChatList } = useChatList();

  useEffect(() => {
    // 新規チャットの場合
    if (!chatId) {
      init(id);
    }
  }, [init, id, chatId]);

  useEffect(() => {
    // 登録済みのチャットの場合
    if (!isLoadingMessage && messagesData && !isLoadingChat && chatData) {
      restore(id, messagesData.messages, chatData.chat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessage, isLoadingChat]);

  const filteredMessages = useMemo(() => {
    return chats[id]?.messages.filter((chat) => chat.role !== 'system') ?? [];
  }, [chats, id]);

  return {
    loading: loading[id] ?? false,
    getModelId: () => {
      return getModelId(id);
    },
    setModelId: (newModelId: string) => {
      setModelId(id, newModelId);
    },
    setLoading: (newLoading: boolean) => {
      setLoading(id, newLoading);
    },
    loadingMessages: isLoadingMessage,
    init: () => {
      init(id);
    },
    clear: () => {
      clear(id);
    },
    updateSystemContext: (systemContext: string) => {
      updateSystemContext(id, systemContext);
    },
    updateSystemContextByModel: () => {
      const modelId = getModelId(id);
      const prompter = getPrompter(modelId);
      updateSystemContext(id, prompter.systemContext(id));
    },
    getCurrentSystemContext: () => {
      return getCurrentSystemContext(id);
    },
    pushMessage: (role: Role, content: string) =>
      pushMessage(id, role, content),
    popMessage: () => popMessage(id),
    rawMessages: chats[id]?.messages ?? [],
    messages: filteredMessages,
    isEmpty: filteredMessages.length === 0,
    postChat: (
      content: string,
      ignoreHistory: boolean = false,
      preProcessInput:
        | ((message: ShownMessage[]) => ShownMessage[])
        | undefined = undefined,
      postProcessOutput: ((message: string) => string) | undefined = undefined,
      sessionId: string | undefined = undefined,
      extraData: UploadedFileType[] | undefined = undefined
    ) => {
      post(
        id,
        content,
        mutateChatList,
        ignoreHistory,
        preProcessInput,
        postProcessOutput,
        sessionId,
        extraData
      );
    },
    continueGeneration: (
      ignoreHistory: boolean = false,
      preProcessInput:
        | ((message: ShownMessage[]) => ShownMessage[])
        | undefined = undefined,
      postProcessOutput: ((message: string) => string) | undefined = undefined,
      sessionId: string | undefined = undefined,
      extraData: UploadedFileType[] | undefined = undefined
    ) => {
      continueGeneration(
        id,
        mutateChatList,
        ignoreHistory,
        preProcessInput,
        postProcessOutput,
        sessionId,
        extraData
      );
    },
    sendFeedback: async (feedbackData: UpdateFeedbackRequest) => {
      await sendFeedback(id, feedbackData);
    },
    getStopReason: () => {
      return getStopReason(id);
    },
  };
};

export default useChat;
