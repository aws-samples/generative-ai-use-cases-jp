import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useConversation from '../hooks/useConversation';
import ChatMessage from '../components/ChatMessage';
import Select from '../components/Select';
import useScroll from '../hooks/useScroll';
import { create } from 'zustand';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import { AgentPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { v4 as uuidv4 } from 'uuid';
import queryString from 'query-string';

type StateType = {
  modelId: string;
  sessionId: string;
  content: string;
  setModelId: (c: string) => void;
  setSessionId: (c: string) => void;
  setContent: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    modelId: '',
    sessionId: uuidv4(),
    content: '',
    setModelId: (s: string) => {
      set(() => ({
        modelId: s,
      }));
    },
    setSessionId: (s: string) => {
      set(() => ({
        sessionId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const AgentChatPage: React.FC = () => {
  const { modelId, sessionId, content, setModelId, setContent } =
    useChatPageState();
  const { pathname, search } = useLocation();
  const { chatId } = useParams();

  const { loading, loadingMessages, isEmpty, messages, clear, postChat } =
    useChat(pathname, chatId);
  const { scrollToBottom, scrollToTop } = useScroll();
  const { getConversationTitle } = useConversation();
  const { agentNames: availableModels, agentModels } = MODELS;

  const title = useMemo(() => {
    if (chatId) {
      return getConversationTitle(chatId) || 'Agent チャット';
    } else {
      return 'Agent チャット';
    }
  }, [chatId, getConversationTitle]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    if (search !== '') {
      const params = queryString.parse(search) as AgentPageQueryParams;
      setContent(params.content ?? '');
      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
  }, [setContent, modelId, availableModels, search, setModelId]);

  const onSend = useCallback(() => {
    const model = agentModels.find((m) => m.modelId === modelId);
    if (model) {
      model.sessionId = sessionId;
    }
    postChat(content, false, model);
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

  const showingMessages = useMemo(() => {
    return messages;
  }, [messages]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          {title}
        </div>

        <div className="mb-6 mt-2 flex w-full items-end justify-center lg:mt-0">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: m };
            })}
          />
        </div>

        {((isEmpty && !loadingMessages) || loadingMessages) && (
          <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <BedrockIcon
              className={`fill-gray-400 ${
                loadingMessages ? 'animate-pulse' : ''
              }`}
            />
          </div>
        )}

        {!isEmpty &&
          showingMessages.map((chat, idx) => (
            <div key={idx + 1}>
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

        <div className="fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden">
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
    </>
  );
};

export default AgentChatPage;
