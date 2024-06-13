import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../../components/InputChatContent';
import useChat from '../../hooks/useChat';
import Button from '../../components/Button';
import ExpandableField from '../../components/ExpandableField';
import Select from '../../components/Select';
import { PiArrowClockwiseBold, PiCornersOut } from 'react-icons/pi';
import { create } from 'zustand';
import BedrockIcon from '../../assets/bedrock.svg?react';
import { MODELS } from '../../hooks/useModel';
import { getPrompter } from '../../prompts';
import useFiles from '../../hooks/useFiles';
import Switch from '../../components/Switch';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useDebounce } from '../../hooks/useDebounce';
import ButtonIcon from '../../components/ButtonIcon';
import { DrawIoEmbed } from 'react-drawio';

type StateType = {
  content: string;
  inputSystemContext: string;
  saveSystemContext: string;
  saveSystemContextTitle: string;
  setContent: (c: string) => void;
  setInputSystemContext: (c: string) => void;
  setSaveSystemContext: (c: string) => void;
  setSaveSystemContextTitle: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    content: '',
    inputSystemContext: '',
    saveSystemContext: '',
    saveSystemContextTitle: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    setInputSystemContext: (s: string) => {
      set(() => ({
        inputSystemContext: s,
      }));
    },
    setSaveSystemContext: (s: string) => {
      set(() => ({
        saveSystemContext: s,
      }));
    },
    setSaveSystemContextTitle: (s: string) => {
      set(() => ({
        saveSystemContextTitle: s,
      }));
    },
  };
});

const GenerateDiagramPage: React.FC = () => {
  const { content, inputSystemContext, setContent, setInputSystemContext } =
    useChatPageState();
  const { clear: clearFiles, uploadedFiles, uploadFiles } = useFiles();

  const { chatId } = useParams();
  const { pathname } = useLocation();

  const {
    getModelId,
    setModelId,
    loading,
    loadingMessages,
    isEmpty,
    messages,
    rawMessages,
    clear,
    postChat,
    updateSystemContext,
    updateSystemContextByModel,
    getCurrentSystemContext,
  } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;
  const availableMultiModalModels = useMemo(() => {
    return availableModels.filter((modelId) =>
      MODELS.multiModalModelIds.includes(modelId)
    );
  }, [availableModels]);

  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  useEffect(() => {
    // 会話履歴のページではモデルを変更してもシステムコンテキストを変更しない
    if (!chatId) {
      updateSystemContextByModel();
    }
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter, chatId]);

  const fileUpload = useMemo(() => {
    return MODELS.multiModalModelIds.includes(modelId);
  }, [modelId]);

  useEffect(() => {
    const _modelId = !modelId ? availableMultiModalModels[0] : modelId;
    setModelId(_modelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, availableMultiModalModels]);

  const onSend = useCallback(() => {
    postChat(
      prompter.chatPrompt({ content }),
      false,
      undefined,
      undefined,
      undefined,
      fileUpload ? uploadedFiles : undefined
    );
    setContent('');
    clearFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, uploadedFiles, fileUpload]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear]);

  const [showSystemContext] = useState(false);
  const showingMessages = useMemo(() => {
    if (showSystemContext) {
      return rawMessages;
    } else {
      return messages;
    }
  }, [showSystemContext, rawMessages, messages]);

  const currentSystemContext = useMemo(
    () => getCurrentSystemContext(),
    [getCurrentSystemContext]
  );

  useEffect(() => {
    setInputSystemContext(currentSystemContext);
  }, [currentSystemContext, setInputSystemContext]);

  const [isOver, setIsOver] = useState(false);
  const handleDragOver = (event: React.DragEvent) => {
    // ファイルドラッグ時にオーバーレイを表示
    event.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    // ファイルドラッグ時にオーバーレイを非表示
    event.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    // ファイルドロップ時にファイルを追加
    event.preventDefault();
    setIsOver(false);
    if (event.dataTransfer.files) {
      // ファイルを反映しアップロード
      uploadFiles(Array.from(event.dataTransfer.files));
    }
  };

  const codes = showingMessages
    .filter((msg) => msg.role === 'assistant')
    .map((msg) => msg.content);
  const latestCode = codes[codes.length - 1];

  const [code, setCode] = useState(latestCode);

  useEffect(() => {
    setCode(latestCode);
  }, [latestCode]);

  const [showCode, setShowCode] = useState(false);
  const debouncedCode = useDebounce(code, 100);

  return (
    <>
      <div
        onDragOver={fileUpload ? handleDragOver : undefined}
        className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          AWS 構成図生成
        </div>

        {isOver && fileUpload && (
          <div
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="fixed bottom-0 left-0 right-0 top-0 z-[999] bg-slate-300 p-10 text-center">
            <div className="flex h-full w-full items-center justify-center outline-dashed">
              <div className="font-bold">
                ファイルをドロップしてアップロード
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 flex w-full items-end justify-center gap-4 lg:mt-0">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableMultiModalModels.map((m) => {
              return { value: m, label: m };
            })}
          />
          {!isEmpty && !loading && (
            <div className="mb-2 hidden lg:inline-block">
              <Switch
                label="ソースコードを表示"
                checked={showCode}
                onSwitch={() => setShowCode((flg) => !flg)}
              />
            </div>
          )}
        </div>

        {((isEmpty && !loadingMessages) || loadingMessages || loading) && (
          <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <BedrockIcon
              className={`fill-gray-400 ${
                loadingMessages ? 'animate-pulse' : ''
              }`}
            />

            <span className="text-gray-400">AWS Diagram Generator</span>
            {loading && <SkeltonLoader>構成図を作成中です</SkeltonLoader>}
          </div>
        )}

        {!isEmpty && !loading && (
          <div className="flex gap-2 p-2">
            <div className={`${showCode ? 'w-1/2' : 'w-full'} pt-2`}>
              <div className="h-[calc(100vh-20rem)] w-full rounded-md border">
                {!loading && <DrawIoEmbed xml={debouncedCode} />}
              </div>
              <div className="relative -top-10 flex justify-end pr-1">
                <ButtonIcon
                  onClick={() => {
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                      iframe.requestFullscreen();
                    }
                  }}
                  children={<PiCornersOut />}
                  className="p-2"
                />
              </div>
            </div>
            <div className={`${showCode ? 'w-1/2' : 'hidden'}`}>
              <SyntaxHighlighter
                language="xml"
                style={atomDark}
                className="h-[calc(100vh-20rem)] whitespace-pre-wrap">
                {debouncedCode}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        <div className="fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden">
          {isEmpty && !loadingMessages && !chatId && (
            <ExpandableField
              label="システムコンテキスト"
              className="relative w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
              <>
                <div className="absolute -top-2 right-0 mb-2 flex justify-end">
                  <Button
                    outlined
                    className="text-xs"
                    onClick={() => {
                      clear();
                      setInputSystemContext(currentSystemContext);
                    }}>
                    初期化
                  </Button>
                </div>

                <InputChatContent
                  disableMarginBottom={true}
                  content={inputSystemContext}
                  onChangeContent={setInputSystemContext}
                  fullWidth={true}
                  resetDisabled={true}
                  disabled={inputSystemContext === currentSystemContext}
                  sendIcon={<PiArrowClockwiseBold />}
                  onSend={() => {
                    updateSystemContext(inputSystemContext);
                  }}
                  hideReset={true}
                />
              </>
            </ExpandableField>
          )}

          <InputChatContent
            content={content}
            disabled={loading}
            onChangeContent={setContent}
            resetDisabled={!!chatId}
            onSend={() => {
              onSend();
            }}
            onReset={onReset}
            fileUpload={fileUpload}
          />

          {/* Recommended Button Container */}
          <div className="mb-4 flex gap-2">
            {!showingMessages.length &&
              examplePrompts.map(({ value, label }) => (
                <RoundedButton
                  onClick={() => {
                    setContent(value);
                  }}
                  key={label}>
                  {label} ↗️
                </RoundedButton>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

const examplePrompts = [
  {
    label: 'サーバーレスなウェブアプリ',
    value: `サーバーレスなウェブアプリケーションの構成図を作ってください`,
  },
  {
    label: 'イベントドリブンアーキテクチャ',
    value: `イベントドリブンアーキテクチャの代表的な構成を作ってください。`,
  },
];

const RoundedButton = (
  props: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) => {
  return (
    <button
      className="cursor-pointer rounded-full border p-2 text-xs hover:border-gray-300 hover:bg-gray-50"
      {...props}
    />
  );
};

type SkeltonLoaderProps = {
  children: string;
};
const SkeltonLoader: React.FC<SkeltonLoaderProps> = ({ children }) => {
  return (
    <div className="flex max-w-sm animate-pulse flex-col">
      <div className="mt-2 h-6 w-96 rounded-full bg-gray-200 dark:bg-gray-700">
        <span className="flex animate-pulse justify-center">{children}</span>
      </div>
    </div>
  );
};

export default GenerateDiagramPage;
