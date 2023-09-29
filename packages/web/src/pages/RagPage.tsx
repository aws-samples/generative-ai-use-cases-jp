import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useRag from '../hooks/useRag';
import { useLocation } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const useRagPageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const RagPage: React.FC = () => {
  const { content, setContent } = useRagPageState();
  const { pathname } = useLocation();
  const { postMessage, init, loading, messages } = useRag(pathname);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSend = useCallback(() => {
    postMessage(content);
    setContent('');
  }, [content, postMessage, setContent]);

  const onReset = useCallback(() => {
    init();
    setContent('');
  }, [init, setContent]);

  return (
    <div>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        RAG チャット
      </div>

      <div className="m-3 flex justify-center">
        <Alert severity="info">
          <div>
            RAG (Retrieval Augmented Generation)
            手法のチャットを行うことができます。
          </div>
          <div>
            メッセージが入力されると Amazon Kendra
            でドキュメントを検索し、検索したドキュメントをもとに LLM
            が回答を生成します。
          </div>
        </Alert>
      </div>

      {messages.map((chat, idx) => (
        <div key={idx}>
          <ChatMessage
            chatContent={chat}
            loading={loading && idx === messages.length - 1}
          />
          <div className="w-full border-b border-gray-300"></div>
        </div>
      ))}

      <div className="absolute bottom-0 z-0 flex w-full items-end justify-center">
        <InputChatContent
          content={content}
          disabled={loading}
          onChangeContent={setContent}
          onSend={() => {
            onSend();
          }}
          onReset={onReset}
        />
      </div>
    </div>
  );
};

export default RagPage;
