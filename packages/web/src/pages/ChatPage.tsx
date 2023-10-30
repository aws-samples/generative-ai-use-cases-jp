import React, { useCallback, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
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

  const { loading, loadingMessages, isEmpty, messages, clear, postChat } =
    useChat(pathname, chatId);
  const { scrollToBottom, scrollToTop } = useScroll();

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

  return (
    <>
      <div className={`${!isEmpty ? 'pb-36' : ''}`}>
        {isEmpty && !loadingMessages && (
          <>
            <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
              チャット
            </div>
          </>
        )}

        {loadingMessages && (
          <div className="relative flex h-screen flex-col items-center justify-center">
            <BedrockIcon className="animate-pulse fill-gray-400" />
          </div>
        )}

        {messages.map((chat, idx) => (
          <div key={idx}>
            <ChatMessage
              chatContent={chat}
              loading={loading && idx === messages.length - 1}
            />
            <div className="w-full border-b border-gray-300"></div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 z-0 flex w-full items-end justify-center">
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
