import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useConversation from '../hooks/useConversation';
import ChatMessage from '../components/ChatMessage';
import useScroll from '../hooks/useScroll';
import { create } from 'zustand';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const ChatPage: React.FC = () => {
  const { content, setContent } = useChatPageState();
  const { state, pathname } = useLocation();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onSend = useCallback(() => {
    postChat(content);
    setContent('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

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
      <div className={`${!isEmpty ? 'screen:pb-36' : ''}`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
          {title}
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
              <ChatMessage
                chatContent={chat}
                loading={loading && idx === showingMessages.length - 1}
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}
      </div>

      <div className="absolute bottom-0 z-0 flex w-full items-end justify-center print:hidden">
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
    </>
  );
};

export default ChatPage;
