import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import { ChatPrompt } from '../prompts';
import ChatMessage from '../components/ChatMessage';
import SelectLlm from '../components/SelectLlm';
import useScroll from '../hooks/useScroll';

const ChatPage: React.FC = () => {
  const [content, setContent] = useState('');
  const { state } = useLocation();
  const { loading, chats, initChats, postChat } = useChat();
  const { scrollToBottom, scrollToTop } = useScroll();

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
  }, [state]);

  useEffect(() => {
    initChats(ChatPrompt.systemContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSend = useCallback(() => {
    postChat(content);
    setContent('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (chats.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <>
      <div className={`${chats.length > 0 ? 'pb-36' : ''}`}>
        {chats.length === 0 && (
          <>
            <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
              チャット
            </div>
            <SelectLlm className="mt-5 lg:mt-0" />
          </>
        )}
        {chats.map((chat, idx) => (
          <div key={idx}>
            <ChatMessage chatContent={chat} />
            <div className="w-full border-b border-gray-300"></div>
          </div>
        ))}
        {loading && (
          <>
            <ChatMessage loading />
            <div className="w-full border-b border-gray-300"></div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 z-0 flex w-full justify-center">
        <InputChatContent
          content={content}
          disabled={loading}
          onChangeContent={setContent}
          onSend={() => {
            onSend();
          }}
        />
      </div>
    </>
  );
};

export default ChatPage;
