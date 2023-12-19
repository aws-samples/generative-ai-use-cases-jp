import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Location, useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useConversation from '../hooks/useConversation';
import ChatMessage from '../components/ChatMessage';
import PromptList from '../components/PromptList';
import useScroll from '../hooks/useScroll';
import { create } from 'zustand';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import { ChatPageLocationState } from '../@types/navigate';
import { SelectField } from '@aws-amplify/ui-react';
import { MODELS } from '../hooks/useModel';

type StateType = {
  modelId: string;
  content: string;
  setModelId: (c: string) => void;
  setContent: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    modelId: '',
    content: '',
    setModelId: (s: string) => {
      set(() => ({
        modelId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const ChatPage: React.FC = () => {
  const { modelId, content, setModelId, setContent } = useChatPageState();
  const { state, pathname } = useLocation() as Location<ChatPageLocationState>;
  const { chatId } = useParams();

  const {
    loading,
    loadingMessages,
    isEmpty,
    messages,
    rawMessages,
    clear,
    postChat,
  } = useChat(pathname, chatId);
  const { scrollToBottom, scrollToTop } = useScroll();
  const { getConversationTitle } = useConversation();
  const { modelIds: availableModels, textModels } = MODELS;

  const title = useMemo(() => {
    if (chatId) {
      return getConversationTitle(chatId) || 'チャット';
    } else {
      return 'チャット';
    }
  }, [chatId, getConversationTitle]);

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
  }, [state, setContent]);

  useEffect(() => {
    if (!modelId) {
      setModelId(availableModels[0]);
    }
  }, [modelId, availableModels, setModelId]);

  const onSend = useCallback(() => {
    postChat(
      content,
      false,
      textModels.find((m) => m.modelId === modelId)
    );
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, content]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const [showSystemContext, setShowSystemContext] = useState(false);

  const showingMessages = useMemo(() => {
    if (showSystemContext) {
      return rawMessages;
    } else {
      return messages;
    }
  }, [showSystemContext, rawMessages, messages]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
          {title}
        </div>

        <div className="flex w-full items-end justify-center">
          <SelectField
            label="モデル"
            labelHidden
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectField>
        </div>

        {((isEmpty && !loadingMessages) || loadingMessages) && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <BedrockIcon
              className={`fill-gray-400 ${
                loadingMessages ? 'animate-pulse' : ''
              }`}
            />
          </div>
        )}

        {!isEmpty && !loadingMessages && (
          <div className="my-2 flex justify-end pr-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                value=""
                className="peer sr-only"
                checked={showSystemContext}
                onChange={() => {
                  setShowSystemContext(!showSystemContext);
                }}
              />
              <div className="peer-checked:bg-aws-smile peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
              <span className="ml-1 text-xs font-medium">
                システムコンテキストの表示
              </span>
            </label>
          </div>
        )}

        {!isEmpty &&
          showingMessages.map((chat, idx) => (
            <div key={idx}>
              {idx === 0 && (
                <div className="w-full border-b border-gray-300"></div>
              )}
              <ChatMessage
                chatContent={chat}
                loading={loading && idx === showingMessages.length - 1}
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}

        <div className="fixed bottom-0 z-0 flex w-full items-end justify-center print:hidden lg:pr-64">
          <InputChatContent
            content={content}
            disabled={loading}
            onChangeContent={setContent}
            resetDisabled={!!chatId}
            onSend={() => {
              onSend();
            }}
            onReset={onReset}
          />
        </div>
      </div>

      {isEmpty && <PromptList />}
    </>
  );
};

export default ChatPage;
