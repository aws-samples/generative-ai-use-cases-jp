import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import Select from '../components/Select';
import useFollow from '../hooks/useFollow';
import ScrollTopBottom from '../components/ScrollTopBottom';
import BedrockIcon from '../assets/bedrock.svg?react';
import { RagPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import queryString from 'query-string';
import { getPrompter } from '../prompts';
import ExpandableField from '../components/ExpandableField';
import { userDefinedExplicitFilters } from '@generative-ai-use-cases-jp/common';
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';
import { RetrievalFilterLabel } from '../components/KbFilter';
import KbFilter from '../components/KbFilter';
import { ExplicitFilterConfiguration } from 'generative-ai-use-cases-jp';
import { Option, SelectValue } from '../components/FilterSelect';
import { PiSlidersHorizontal } from 'react-icons/pi';

type StateType = {
  sessionId: string | undefined;
  content: string;
  filters: (RetrievalFilterLabel | null)[];
  setSessionId: (c: string | undefined) => void;
  setContent: (c: string) => void;
  setFilters: (f: (RetrievalFilterLabel | null)[]) => void;
};

const useRagKnowledgeBasePageState = create<StateType>((set) => {
  return {
    sessionId: undefined, // RetrieveAndGenerate は sessionId のアプリ側で指定できないため、null を初期値とする
    content: '',
    filters: userDefinedExplicitFilters.map(() => null),
    setSessionId: (s: string | undefined) => {
      set(() => ({
        sessionId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    setFilters: (f: (RetrievalFilterLabel | null)[]) => {
      set(() => ({
        filters: f,
      }));
    },
  };
});

const RagKnowledgeBasePage: React.FC = () => {
  const { sessionId, content, filters, setContent, setFilters, setSessionId } =
    useRagKnowledgeBasePageState();
  const { pathname, search } = useLocation();
  const {
    getModelId,
    setModelId,
    loading,
    isEmpty,
    messages,
    clear,
    postChat,
    updateSystemContextByModel,
  } = useChat(pathname);
  const { scrollableContainer, setFollowing } = useFollow();
  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);
  const [expanded, setExpanded] = useState(window.innerWidth > 1024);

  const RetrievalFilterLabelToRetrievalFilter = (
    f: RetrievalFilterLabel | null,
    filterConfig: ExplicitFilterConfiguration
  ): RetrievalFilter | null => {
    if (f === null) return null;
    const selectValueToValue = (
      selectValue: SelectValue,
      filterConfig: ExplicitFilterConfiguration
    ): string[] | string | number | boolean | null => {
      if (selectValue === null) return null;
      if (filterConfig.type === 'STRING_LIST' || Array.isArray(selectValue)) {
        return (selectValue as Option[]).map((v) => v.value);
      } else if (selectValue.value === null) {
        return null;
      } else if (filterConfig.type === 'STRING') {
        return (selectValue as Option).value;
      } else if (filterConfig.type === 'BOOLEAN') {
        return (selectValue as Option).value === 'true';
      } else if (filterConfig.type === 'NUMBER') {
        return (selectValue as Option).value === '' ||
          isNaN(Number((selectValue as Option).value))
          ? null
          : Number((selectValue as Option).value);
      }
      return null;
    };
    return Object.entries(f).map(([key, filterAttributeLabel]) => ({
      [key]: {
        key: filterAttributeLabel.key,
        value: selectValueToValue(filterAttributeLabel.value, filterConfig),
      },
    }))[0] as unknown as RetrievalFilter;
  };

  useEffect(() => {
    updateSystemContextByModel();
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter]);

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

    // フィルターがある場合はextraDataに追加
    const extraData = filters
      .map((f, index) =>
        RetrievalFilterLabelToRetrievalFilter(
          f,
          userDefinedExplicitFilters[index]
        )
      )
      .filter(
        (f: RetrievalFilter | null) =>
          f !== null &&
          Object.values(f).filter((v) => v.value != null).length > 0
      )
      .map((f) => ({
        type: 'json',
        name: 'filter',
        source: {
          type: 'json',
          mediaType: 'application/json',
          data: JSON.stringify(f),
        },
      }));

    postChat(
      content,
      false,
      undefined,
      undefined,
      sessionId,
      undefined,
      extraData,
      'bedrockKb',
      setSessionId
    );
    setContent('');
  }, [
    content,
    sessionId,
    filters,
    postChat,
    setContent,
    setFollowing,
    setSessionId,
  ]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    setFilters(userDefinedExplicitFilters.map(() => null));
    setSessionId(undefined);
  }, [clear, setContent, setFilters, setSessionId]);

  return (
    <>
      <div
        className={`${!isEmpty ? 'screen:pb-36' : ''} relative ${
          expanded ? 'lg:mr-64' : ''
        }`}>
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

        <div
          className={`fixed right-4 top-[calc(50vh-2rem)] z-0 ${
            expanded ? 'lg:pr-64' : ''
          }`}>
          <ScrollTopBottom />
        </div>

        <div
          className={`fixed bottom-0 z-0 flex w-full flex-col items-center justify-center print:hidden ${
            expanded ? 'lg:pr-128' : 'lg:pr-64'
          }`}>
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

      <div
        className={`fixed top-0 transition-all ${
          expanded ? 'right-0 z-50' : '-right-64 z-30'
        } pointer-events-none flex h-full justify-center`}>
        <div
          className="bg-aws-smile pointer-events-auto mt-16 flex size-12 cursor-pointer items-center justify-center rounded-l-full"
          onClick={() => {
            setExpanded(!expanded);
          }}>
          <PiSlidersHorizontal className="text-aws-squid-ink size-6" />
        </div>
        <div className="bg-aws-squid-ink scrollbar-thin scrollbar-thumb-white pointer-events-auto h-full w-64 overflow-y-scroll break-words p-3 text-sm text-white">
          <div className="my-2 flex items-center text-sm font-semibold">
            <PiSlidersHorizontal className="mr-1.5 text-lg" />
            高度なオプション
          </div>
          {userDefinedExplicitFilters.length > 0 && (
            <ExpandableField
              label="フィルタ"
              className="relative w-full"
              defaultOpened={true}>
              <KbFilter
                filterConfigs={userDefinedExplicitFilters}
                filters={filters}
                setFilters={setFilters}
              />
            </ExpandableField>
          )}
        </div>
      </div>
    </>
  );
};

export default RagKnowledgeBasePage;
