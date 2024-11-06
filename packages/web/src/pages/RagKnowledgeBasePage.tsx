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
// 追加
import { useKnowledgeBasePrefixes } from '../hooks/useKnowledgeBasePrefixes';

type StateType = {
  content: string;
  setContent: (c: string) => void;
  selectedPrefix: string; // 追加
  setSelectedPrefix: (p: string) => void; // 追加
};

const useRagKnowledgeBasePageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    selectedPrefix: '', // 追加
    setSelectedPrefix: (p: string) => {
      // 追加
      set(() => ({
        selectedPrefix: p,
      }));
    },
  };
});

const RagKnowledgeBasePage: React.FC = () => {
  const { content, setContent, selectedPrefix, setSelectedPrefix } =
    useRagKnowledgeBasePageState(); // 状態を追加
  const { pathname, search } = useLocation();
  const { getModelId, setModelId } = useChat(pathname);
  const { postMessage, clear, loading, messages, isEmpty } =
    useRagKnowledgeBase(pathname);
  const { scrollableContainer, scrolledAnchor, setFollowing } = useScroll();
  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();
  // プレフィックス一覧を取得するhookを追加
  const { prefixes, loading: prefixesLoading } = useKnowledgeBasePrefixes();

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
    postMessage(content, selectedPrefix); // selectedPrefixを追加
    setContent('');
  }, [content, selectedPrefix, postMessage, setContent, setFollowing]);

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
          {/* モデル選択とフォルダ選択を包むコンテナ */}
          <div className="mb-8 flex w-full max-w-3xl flex-col items-center px-4 sm:mb-0 sm:flex-row sm:gap-4">
            {/* モデル選択のSelect */}
            <div className="mb-2 w-72 sm:mb-0 sm:w-64 lg:w-80">
              <Select
                value={modelId}
                onChange={setModelId}
                options={availableModels.map((m) => ({
                  value: m,
                  label: m,
                }))}
                label={'モデルを選択'}
                fullWidth
              />
            </div>

            {/* フォルダ選択のSelect */}
            <div className="w-72 sm:w-64 lg:w-80">
              <Select
                value={selectedPrefix}
                onChange={(value) => {
                  if (!prefixesLoading) {
                    setSelectedPrefix(value);
                  }
                }}
                options={[
                  { value: '', label: 'すべて' },
                  ...prefixes.map((prefix) => ({
                    value: prefix,
                    label: prefix.replace('department/', ''),
                  })),
                ]}
                label={prefixesLoading ? '読み込み中...' : 'フォルダを選択'}
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Alertの表示位置を調整 */}
        {isEmpty && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <BedrockIcon className="fill-gray-400" />
          </div>
        )}

        {isEmpty && (
          <div
            className={`absolute inset-x-0 top-36 m-auto flex justify-center sm:top-28`}>
            {' '}
            {/* top-28をtop-36に変更 */}
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
