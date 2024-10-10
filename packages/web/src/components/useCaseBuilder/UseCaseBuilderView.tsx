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
import { produce } from 'immer';

type Props = {
  modelId?: string;
  title: string;
  promptTemplate: string;
};

type StateType = {
  text: string;
  setText: (s: string) => void;
  values: string[];
  setValues: (index: number, value: string) => void;
  clear: (valueLength: number) => void;
};

const useUseCaseBuilderViewState = create<StateType>((set, get) => {
  const INIT_STATE = {
    text: '',
    values: [],
  };
  return {
    ...INIT_STATE,
    setText: (s: string) => {
      set(() => ({
        text: s,
      }));
    },
    setValues: (index, value) => {
      set(() => ({
        values: produce(get().values, (draft) => {
          draft[index] = value;
        }),
      }));
    },
    clear: (valueLength: number) => {
      set({
        ...INIT_STATE,
        values: new Array(valueLength).fill(''),
      });
    },
  };
});

const UseCaseBuilderView: React.FC<Props> = (props) => {
  const { pathname } = useLocation();

  const { text, setText, values, setValues, clear } =
    useUseCaseBuilderViewState();
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

  const placeholders = useMemo(() => {
    return props.promptTemplate.match(/\{\{(.+)\}\}/g) ?? [];
  }, [props.promptTemplate]);

  const items = useMemo(() => {
    return (
      placeholders.map((match) => {
        const [inputType, label] = match.replace(/^\{\{|\}\}$/g, '').split(':');
        return {
          inputType,
          label,
        };
      }) ?? []
    );
  }, [placeholders]);

  useEffect(() => {
    clear(placeholders.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholders]);

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

    let prompt = props.promptTemplate;
    placeholders.forEach((p, idx) => {
      prompt = prompt.replace(p, values[idx]);
    });
    postChat(
      prompt +
        '出力は要約内容を <output></output> の xml タグで囲って出力してください。例外はありません。',
      true
    );
  }, [loading, placeholders, postChat, props.promptTemplate, values]);

  // リセット
  const onClickClear = useCallback(() => {
    clear(placeholders.length);
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {items.map((item, idx) => (
          <div key={idx}>
            <Textarea
              label={item.label}
              rows={2}
              value={values[idx]}
              onChange={(v) => {
                setValues(idx, v);
              }}
            />
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
