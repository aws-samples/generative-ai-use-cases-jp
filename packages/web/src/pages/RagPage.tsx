import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useRag from '../hooks/useRag';
import { useLocation, Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import useScroll from '../hooks/useScroll';

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
    <div className={`${!isEmpty ? 'pb-36' : ''}`}>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        RAG 채팅
      </div>

      {isEmpty && (
        <div className="m-3 flex justify-center">
          <Alert severity="info">
            <div>
              RAG (Retrieval Augmented Generation)
              를 이용한 채팅을 할 수 있습니다.
            </div>
            <div>
              메시지가 입력되면 Amazon Kendra
              에서 문서를 검색하고 검색한 문서를 바탕으로 LLM
              가 답변을 생성합니다.
            </div>
            <div className="font-bold">
              Amazon Kendra 검색만 실행할 경우에는
              <Link className="text-aws-smile" to="/kendra">
                이곳
              </Link>
              의 페이지로 이동해 주세요.
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
