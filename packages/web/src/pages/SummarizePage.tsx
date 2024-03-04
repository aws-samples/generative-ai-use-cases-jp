import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import ExpandableField from '../components/ExpandableField';
import Textarea from '../components/Textarea';
import Markdown from '../components/Markdown';
import ButtonCopy from '../components/ButtonCopy';
import Select from '../components/Select';
import useChat from '../hooks/useChat';
import useTyping from '../hooks/useTyping';
import { create } from 'zustand';
import { SummarizePageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { getPrompter } from '../prompts';
import queryString from 'query-string';

type StateType = {
  sentence: string;
  setSentence: (s: string) => void;
  additionalContext: string;
  setAdditionalContext: (s: string) => void;
  summarizedSentence: string;
  setSummarizedSentence: (s: string) => void;
  clear: () => void;
};

const useSummarizePageState = create<StateType>((set) => {
  const INIT_STATE = {
    sentence: '',
    additionalContext: '',
    summarizedSentence: '',
  };
  return {
    ...INIT_STATE,
    setSentence: (s: string) => {
      set(() => ({
        sentence: s,
      }));
    },
    setAdditionalContext: (s: string) => {
      set(() => ({
        additionalContext: s,
      }));
    },
    setSummarizedSentence: (s: string) => {
      set(() => ({
        summarizedSentence: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const SummarizePage: React.FC = () => {
  const {
    sentence,
    setSentence,
    additionalContext,
    setAdditionalContext,
    summarizedSentence,
    setSummarizedSentence,
    clear,
  } = useSummarizePageState();
  const { pathname, search } = useLocation();
  const {
    getModelId,
    setModelId,
    loading,
    messages,
    postChat,
    clear: clearChat,
  } = useChat(pathname);
  const { setTypingTextInput, typingTextOutput } = useTyping(loading);
  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  const disabledExec = useMemo(() => {
    return sentence === '' || loading;
  }, [sentence, loading]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    if (search !== '') {
      const params = queryString.parse(search) as SummarizePageQueryParams;
      setSentence(params.sentence ?? '');
      setAdditionalContext(params.additionalContext ?? '');
      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSentence, setAdditionalContext, modelId, availableModels, search]);

  useEffect(() => {
    setTypingTextInput(summarizedSentence);
  }, [summarizedSentence, setTypingTextInput]);

  const getSummary = (sentence: string, context: string) => {
    postChat(
      prompter.summarizePrompt({
        sentence,
        context,
      }),
      true
    );
  };

  // リアルタイムにレスポンスを表示
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setSummarizedSentence(_response.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 要約を実行
  const onClickExec = useCallback(() => {
    if (loading) return;
    getSummary(sentence, additionalContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, additionalContext, loading]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        要約
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="要約したい文章">
          <div className="mb-2 flex w-full">
            <Select
              value={modelId}
              onChange={setModelId}
              options={availableModels.map((m) => {
                return { value: m, label: m };
              })}
            />
          </div>

          <Textarea
            placeholder="入力してください"
            value={sentence}
            onChange={setSentence}
            maxHeight={-1}
          />

          <ExpandableField label="追加コンテキスト" optional>
            <Textarea
              placeholder="追加で考慮してほしい点を入力することができます（カジュアルさ等）"
              value={additionalContext}
              onChange={setAdditionalContext}
            />
          </ExpandableField>

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={disabledExec}>
              クリア
            </Button>

            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
          </div>

          <div className="mt-5 rounded border border-black/30 p-1.5">
            <Markdown>{typingTextOutput}</Markdown>
            {!loading && summarizedSentence === '' && (
              <div className="text-gray-500">
                要約された文章がここに表示されます
              </div>
            )}
            {loading && (
              <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}
            <div className="flex w-full justify-end">
              <ButtonCopy
                text={summarizedSentence}
                interUseCasesKey="summarizedSentence"></ButtonCopy>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SummarizePage;
