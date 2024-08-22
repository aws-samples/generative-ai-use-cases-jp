import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useChat from '../hooks/useChat';
import useRagKnowledgeBase from '../hooks/useRagKnowledgeBase';
import { useLocation } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import Select from '../components/Select';
import useScroll from '../hooks/useScroll';
import BedrockIcon from '../assets/bedrock.svg?react';
import { RagPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import queryString from 'query-string';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const useRagKnowledgeBasePageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const RagKnowledgeBasePage: React.FC = () => {
  const { content, setContent } = useRagKnowledgeBasePageState();
  const { pathname, search } = useLocation();
  const { getModelId, setModelId } = useChat(pathname);
  const { postMessage, clear, loading, messages, isEmpty } =
    useRagKnowledgeBase(pathname);
  const { scrollableContainer, scrolledAnchor, setFollowing } = useScroll();
  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    if (search !== '') {
      const params = queryString.parse(search) as RagPageQueryParams;
      setContent(params.content ?? '');
      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, modelId, search, setContent]);

  const onSend = useCallback(() => {
    setFollowing(true);
    postMessage(content);
    setContent('');
  }, [content, postMessage, setContent, setFollowing]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
  }, [clear, setContent]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          RAG チャット
        </div>

        <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: m };
            })}
          />
        </div>

        {isEmpty && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <BedrockIcon className="fill-gray-400" />
          </div>
        )}

        {isEmpty && (
          <div
            className={`absolute inset-x-0 top-28 m-auto flex justify-center`}>
            <Alert severity="info">
              <div>
                RAG (Retrieval Augmented Generation)
                手法のチャットを行うことができます。
              </div>
              <div>
                メッセージが入力されると Knowledge Base
                でドキュメントを検索し、検索したドキュメントをもとに LLM
                が回答を生成します。
              </div>
            </Alert>
          </div>
        )}

        <div ref={scrollableContainer}>
          {messages.map((chat, idx) => (
            <div key={idx}>
              <ChatMessage
                idx={idx}
                chatContent={chat}
                loading={loading && idx === messages.length - 1}
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}
        </div>
        <div ref={scrolledAnchor} />

        <div className="fixed bottom-0 z-0 flex w-full items-end justify-center lg:pr-64 print:hidden">
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
    </>
  );
};

export default RagKnowledgeBasePage;
