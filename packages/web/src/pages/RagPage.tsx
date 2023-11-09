import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useRag from '../hooks/useRag';
import { useLocation, Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import useScroll from '../hooks/useScroll';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import { ReactComponent as KendraIcon } from '../assets/kendra.svg';
import { PiPlus } from 'react-icons/pi';

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
  const { state, pathname } = useLocation();
  const { postMessage, clear, loading, messages, isEmpty } = useRag(pathname);
  const { scrollToBottom, scrollToTop } = useScroll();

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onSend = useCallback(() => {
    postMessage(content);
    setContent('');
  }, [content, postMessage, setContent]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
  }, [clear, setContent]);

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
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
          RAG チャット
        </div>

        {isEmpty && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <div className="flex items-center gap-x-3">
              <KendraIcon className="h-[64px] w-[64px] fill-gray-400" />
              <PiPlus className="text-2xl text-gray-400" />
              <BedrockIcon className="fill-gray-400" />
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="absolute inset-x-0 top-20 m-auto flex justify-center">
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
              <div className="font-bold">
                Amazon Kendra の検索のみを実行する場合は
                <Link className="text-aws-smile" to="/kendra">
                  こちら
                </Link>
                のページに遷移してください。
              </div>
            </Alert>
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
          onSend={() => {
            onSend();
          }}
          onReset={onReset}
        />
      </div>
    </>
  );
};

export default RagPage;
