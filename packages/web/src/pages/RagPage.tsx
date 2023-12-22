import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useRag from '../hooks/useRag';
import { useLocation, Link, Location } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import useScroll from '../hooks/useScroll';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import { ReactComponent as KendraIcon } from '../assets/kendra.svg';
import { PiPlus } from 'react-icons/pi';
import { RagPageLocationState } from '../@types/navigate';
import { SelectField } from '@aws-amplify/ui-react';
import { MODELS } from '../hooks/useModel';

type StateType = {
  modelId: string;
  setModelId: (c: string) => void;
  content: string;
  setContent: (c: string) => void;
};

const useRagPageState = create<StateType>((set) => {
  return {
    modelId: '',
    content: '',
    setModelId: (s: string) => {
      set(() => ({
        modelId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const RagPage: React.FC = () => {
  const { modelId, setModelId, content, setContent } = useRagPageState();
  const { state, pathname } = useLocation() as Location<RagPageLocationState>;
  const { postMessage, clear, loading, messages, isEmpty } = useRag(pathname);
  const { scrollToBottom, scrollToTop } = useScroll();
  const { modelIds: availableModels, textModels } = MODELS;

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
  }, [state, setContent]);

  useEffect(() => {
    if (!modelId) {
      setModelId(availableModels[0]);
    }
  }, [modelId, availableModels, setModelId]);

  const onSend = useCallback(() => {
    postMessage(content, textModels.find((m) => m.modelId === modelId)!);
    setContent('');
  }, [textModels, modelId, content, postMessage, setContent]);

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
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
          RAG チャット
        </div>

        <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
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
          <div
            className={`absolute inset-x-0 top-28 m-auto flex justify-center`}>
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
              idx={idx}
              chatContent={chat}
              loading={loading && idx === messages.length - 1}
            />
            <div className="w-full border-b border-gray-300"></div>
          </div>
        ))}

        <div className="fixed bottom-0 z-0 flex w-full items-end justify-center print:hidden lg:pr-64">
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

export default RagPage;
