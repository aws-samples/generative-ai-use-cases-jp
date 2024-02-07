import React, { useCallback, useEffect, useMemo } from 'react';
import { Location, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import Markdown from '../components/Markdown';
import ButtonCopy from '../components/ButtonCopy';
import useChat from '../hooks/useChat';
import useTyping from '../hooks/useTyping';
import { create } from 'zustand';
import { generateTextPrompt } from '../prompts';
import { GenerateTextPageLocationState } from '../@types/navigate';
import { SelectField } from '@aws-amplify/ui-react';
import { MODELS } from '../hooks/useModel';

type StateType = {
  modelId: string;
  setModelId: (c: string) => void;
  information: string;
  setInformation: (s: string) => void;
  context: string;
  setContext: (s: string) => void;
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

const useGenerateTextPageState = create<StateType>((set) => {
  const INIT_STATE = {
    modelId: '',
    information: '',
    context: '',
    text: '',
  };
  return {
    ...INIT_STATE,
    setModelId: (s: string) => {
      set(() => ({
        modelId: s,
      }));
    },
    setInformation: (s: string) => {
      set(() => ({
        information: s,
      }));
    },
    setContext: (s: string) => {
      set(() => ({
        context: s,
      }));
    },
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

const GenerateTextPage: React.FC = () => {
  const {
    modelId,
    setModelId,
    information,
    setInformation,
    context,
    setContext,
    text,
    setText,
    clear,
  } = useGenerateTextPageState();
  const { state, pathname } =
    useLocation() as Location<GenerateTextPageLocationState>;
  const { loading, messages, postChat, clear: clearChat } = useChat(pathname);
  const { setTypingTextInput, typingTextOutput } = useTyping(loading);
  const { modelIds: availableModels, textModels } = MODELS;

  const disabledExec = useMemo(() => {
    return information === '' || loading;
  }, [information, loading]);

  useEffect(() => {
    if (state !== null) {
      setInformation(state.information);
      setContext(state.context);
    }
  }, [state, setInformation, setContext]);

  useEffect(() => {
    setTypingTextInput(text);
  }, [text, setTypingTextInput]);

  useEffect(() => {
    if (!modelId) {
      setModelId(availableModels[0]);
    }
  }, [modelId, availableModels, setModelId]);

  const getGeneratedText = (
    modelId: string,
    information: string,
    context: string
  ) => {
    postChat(
      generateTextPrompt.generatePrompt({
        information,
        context,
      }),
      true,
      textModels.find((m) => m.modelId === modelId)
    );
  };

  // リアルタイムにレスポンスを表示
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setText(_response.replace(/(<output>|<\/output>)/g, '').trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 要約を実行
  const onClickExec = useCallback(() => {
    if (loading) return;
    getGeneratedText(modelId, information, context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, information, context, loading]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        文章生成
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="文章の元になる情報">
          <div className="mb-4 flex w-full">
            <SelectField
              label="モデル"
              labelHidden
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}>
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </SelectField>
          </div>

          <Textarea
            placeholder="入力してください"
            value={information}
            onChange={setInformation}
            maxHeight={-1}
          />

          <Textarea
            placeholder="文章の形式を指示してください。(マークダウン、ブログ、ビジネスメールなど)"
            value={context}
            onChange={setContext}
          />

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
            {!loading && text === '' && (
              <div className="text-gray-500">
                生成された文章がここに表示されます
              </div>
            )}
            {loading && (
              <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}
            <div className="flex w-full justify-end">
              <ButtonCopy text={text} interUseCasesKey="text"></ButtonCopy>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateTextPage;
