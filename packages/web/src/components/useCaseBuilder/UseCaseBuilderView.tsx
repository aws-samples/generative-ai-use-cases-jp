import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import ButtonFavorite from './ButtonFavorite';
import ButtonShare from './ButtonShare';
import ButtonUseCaseEdit from './ButtonUseCaseEdit';
import Skeleton from '../Skeleton';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import { UseCaseInputExample } from 'generative-ai-use-cases-jp';
import {
  NOLABEL,
  extractPlaceholdersFromPromptTemplate,
  getItemsFromPlaceholders,
} from '../../utils/UseCaseBuilderUtils';
import useRagKnowledgeBaseApi from '../../hooks/useRagKnowledgeBaseApi';
import useRagApi from '../../hooks/useRagApi';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';

type Props = {
  modelId?: string;
  title: string;
  promptTemplate: string;
  description?: string;
  inputExamples?: UseCaseInputExample[];
  fixedModelId: string;
  isLoading?: boolean;
} & (
  | {
      previewMode?: false;
      useCaseId: string;
      isFavorite: boolean;
      isShared: boolean;
      canEdit?: boolean;
      onToggleFavorite: () => void;
      onToggleShared: () => void;
    }
  | {
      previewMode: true;
    }
);

type StateType = {
  text: string;
  setText: (s: string) => void;
  values: string[];
  setValue: (index: number, value: string) => void;
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
    setValue: (index, value) => {
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

  const { text, setText, values, setValue, clear } =
    useUseCaseBuilderViewState();
  const {
    getModelId,
    setModelId,
    loading,
    setLoading,
    messages,
    postChat,
    clear: clearChat,
  } = useChat(pathname);
  const modelId = useMemo(() => {
    if (props.fixedModelId !== '') {
      return props.fixedModelId;
    } else {
      return getModelId();
    }
  }, [getModelId, props.fixedModelId]);
  const { modelIds: availableModels } = MODELS;
  const { setTypingTextInput, typingTextOutput } = useTyping(loading);
  const { updateRecentUseUseCase } = useMyUseCases();
  const { retrieve: retrieveKendra } = useRagApi();
  const { retrieve: retrieveKnowledgeBase } = useRagKnowledgeBaseApi();
  const [warnMessages, setWarnMessages] = useState<string[]>([]);

  const placeholders = useMemo(() => {
    return extractPlaceholdersFromPromptTemplate(props.promptTemplate);
  }, [props.promptTemplate]);

  const items = useMemo(() => {
    return getItemsFromPlaceholders(placeholders);
  }, [placeholders]);

  useEffect(() => {
    clear(items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    setModelId(
      availableModels.includes(props.modelId ?? '')
        ? props.modelId!
        : availableModels[0]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, props.modelId, pathname]);

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

  useEffect(() => {
    const hasKendra =
      items.filter((i) => i.inputType === 'retrieveKendra').length > 0;
    const hasKnowledgeBase =
      items.filter((i) => i.inputType === 'retrieveKnowledgeBase').length > 0;
    const tmpWarnMessages = [];

    if (hasKendra && !ragEnabled) {
      tmpWarnMessages.push(
        'プロンプトテンプレート内で {{retrieveKendra}} が指定されていますが GenU で RAG チャット (Amazon Kendra) が有効になっていません。'
      );
    }

    if (hasKnowledgeBase && !ragKnowledgeBaseEnabled) {
      tmpWarnMessages.push(
        'プロンプトテンプレート内で {{retrieveKnowledgeBase}} が指定されていますが GenU で RAG チャット (Knowledge Base) が有効になっていません。'
      );
    }

    setWarnMessages(tmpWarnMessages);
  }, [setWarnMessages, items]);

  const onClickExec = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setText('');

    let prompt = props.promptTemplate;

    for (const [idx, item] of items.entries()) {
      let placeholder;

      if (item.label !== NOLABEL) {
        placeholder = `{{${item.inputType}:${item.label}}}`;
      } else {
        placeholder = `{{${item.inputType}}}`;
      }

      if (item.inputType === 'text') {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), values[idx]);
      } else if (item.inputType === 'retrieveKendra') {
        if (ragEnabled) {
          const res = await retrieveKendra(values[idx]);
          const resJson = JSON.stringify(res.data.ResultItems);
          prompt = prompt.replace(new RegExp(placeholder, 'g'), resJson);
        }
      } else if (item.inputType === 'retrieveKnowledgeBase') {
        if (ragKnowledgeBaseEnabled) {
          const res = await retrieveKnowledgeBase(values[idx]);
          const resJson = JSON.stringify(res.data.retrievalResults);
          prompt = prompt.replace(new RegExp(placeholder, 'g'), resJson);
        }
      }
    }

    postChat(prompt, true);
    if (!props.previewMode) {
      updateRecentUseUseCase(props.useCaseId);
    }
  }, [
    loading,
    items,
    postChat,
    props,
    updateRecentUseUseCase,
    values,
    setLoading,
    retrieveKendra,
    retrieveKnowledgeBase,
    setText,
  ]);

  // リセット
  const onClickClear = useCallback(() => {
    clear(items.length);
    clearChat();
  }, [clear, clearChat, items.length]);

  const fillInputsFromExamples = useCallback(
    (examples: Record<string, string>) => {
      Object.entries(examples).forEach(([key, value]) => {
        const idx = items.findIndex((item) => item.label === key);
        if (idx >= 0) {
          setValue(idx, value);
        }
      });
    },
    [items, setValue]
  );

  return (
    <div>
      <div className="mb-4 flex flex-col-reverse text-xl font-semibold md:flex-row">
        {!props.previewMode && <div className="flex-1" />}
        <div
          className={`${props.previewMode ? '' : 'hidden lg:block'} flex flex-row justify-center`}>
          {props.isLoading
            ? '読み込み中...'
            : props.title
              ? props.title
              : '[タイトル未入力]'}
        </div>
        {!props.previewMode && (
          <div className="mb-2 flex min-w-48 flex-1 flex-row items-start justify-end md:mb-0">
            <div className="flex items-center">
              <ButtonFavorite
                isFavorite={props.isFavorite}
                disabled={props.isLoading}
                onClick={props.onToggleFavorite}
              />

              {props.canEdit && (
                <>
                  <ButtonUseCaseEdit useCaseId={props.useCaseId} />
                  <ButtonShare
                    className="ml-2"
                    isShared={props.isShared}
                    disabled={props.isLoading}
                    onClick={props.onToggleShared}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {warnMessages.length > 0 &&
        warnMessages.map((m, idx) => (
          <div
            key={idx}
            className="text-aws-squid-ink mb-2 rounded bg-red-200 p-2 text-sm">
            {m}
          </div>
        ))}

      {props.description && (
        <div className="pb-4 text-sm text-gray-600">{props.description}</div>
      )}

      {!props.isLoading && props.fixedModelId === '' && (
        <div className="mb-2 flex w-full flex-col justify-between sm:flex-row">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: m };
            })}
          />
        </div>
      )}

      {props.isLoading && (
        <div className="my-3 flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}
      {!props.isLoading && (
        <>
          <div className="flex flex-col ">
            {items.map((item, idx) => (
              <div key={idx}>
                <Textarea
                  label={item.label !== NOLABEL ? item.label : undefined}
                  rows={item.inputType === 'text' ? 2 : 1}
                  value={values[idx]}
                  onChange={(v) => {
                    setValue(idx, v);
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-1 items-end justify-between">
        <div>
          {props.inputExamples && props.inputExamples.length > 0 && (
            <>
              <div className="mb-1 text-sm font-bold text-gray-600">入力例</div>
              <div className="flex flex-wrap gap-2">
                {props.inputExamples.map((inputExample, idx) => {
                  return (
                    <button
                      key={idx}
                      className="cursor-pointer rounded-full border px-4 py-1 text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => {
                        fillInputsFromExamples(inputExample.examples);
                      }}>
                      {inputExample.title ? inputExample.title : '[未入力]'}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-3 ">
          <Button
            outlined
            onClick={onClickClear}
            disabled={props.isLoading || loading}>
            クリア
          </Button>

          <Button onClick={onClickExec} disabled={props.isLoading || loading}>
            実行
          </Button>
        </div>
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
