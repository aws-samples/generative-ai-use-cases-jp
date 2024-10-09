import React, { useCallback, useEffect, useMemo } from 'react';
import Select from '../Select';
import Button from '../Button';
import useChat from '../../hooks/useChat';
import { useLocation } from 'react-router-dom';
import { MODELS } from '../../hooks/useModel';
import Markdown from '../Markdown';
import ButtonCopy from '../ButtonCopy';
import useTyping from '../../hooks/useTyping';
import { create } from 'zustand';
import Textarea from '../Textarea';

type Props = {
  modelId?: string;
  title: string;
  promptTemplate: string;
};

type StateType = {
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

const useUseCaseBuilderViewState = create<StateType>((set) => {
  const INIT_STATE = {
    text: '',
  };
  return {
    ...INIT_STATE,
    setText: (s: string) => {
      set(() => ({
        text: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const UseCaseBuilderView: React.FC<Props> = (props) => {
  const { pathname } = useLocation();

  const { text, setText, clear } = useUseCaseBuilderViewState();
  const {
    getModelId,
    setModelId,
    loading,
    messages,
    postChat,
    clear: clearChat,
  } = useChat(pathname);
  const modelId = getModelId();
  const { modelIds: availableModels } = MODELS;
  const { setTypingTextInput, typingTextOutput } = useTyping(loading);

  useEffect(() => {
    setModelId(
      availableModels.includes(props.modelId ?? '')
        ? props.modelId!
        : availableModels[0]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, props.modelId]);

  useEffect(() => {
    setTypingTextInput(text);
  }, [text, setTypingTextInput]);

  // リアルタイムにレスポンスを表示
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setText(_response.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 要約を実行
  const onClickExec = useCallback(() => {
    if (loading) return;
    postChat(props.promptTemplate, true);
  }, [loading, postChat, props.promptTemplate]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeholders = useMemo(() => {
    return (
      props.promptTemplate.match(/\{\{(.+)\}\}/g)?.map((match) => {
        const [inputType, label] = match.split(':');
        return {
          inputType,
          label,
        };
      }) ?? []
    );
  }, [props.promptTemplate]);

  return (
    <div>
      <div className="col-span-12 mb-8 flex h-0 items-center justify-center text-xl font-semibold">
        {props.title}
      </div>
      <div className="mb-2 flex w-full flex-col justify-between sm:flex-row">
        <Select
          value={modelId}
          onChange={setModelId}
          options={availableModels.map((m) => {
            return { value: m, label: m };
          })}
        />
      </div>

      <div className="flex flex-col">
        {placeholders.map((p, idx) => (
          <div key={idx}>
            <Textarea label={p.label} />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button outlined onClick={onClickClear}>
          クリア
        </Button>

        <Button onClick={onClickExec}>実行</Button>
      </div>

      <div className="mt-5 rounded border border-black/30 p-1.5">
        <Markdown>{typingTextOutput}</Markdown>
        {!loading && text === '' && (
          <div className="text-gray-500">実行結果がここに表示されます</div>
        )}
        {loading && (
          <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
        )}
        <div className="flex w-full justify-end">
          <ButtonCopy text={text} interUseCasesKey="text"></ButtonCopy>
        </div>
      </div>
    </div>
  );
};

export default UseCaseBuilderView;
