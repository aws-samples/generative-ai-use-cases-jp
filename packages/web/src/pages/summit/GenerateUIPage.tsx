import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../../components/InputChatContent';
import useChat from '../../hooks/useChat';
import Button from '../../components/Button';
import ExpandableField from '../../components/ExpandableField';
import Select from '../../components/Select';
import useScroll from '../../hooks/useScroll';
import { PiArrowClockwiseBold } from 'react-icons/pi';
import { create } from 'zustand';
import BedrockIcon from '../../assets/bedrock.svg?react';
import { MODELS } from '../../hooks/useModel';
import { getPrompter } from '../../prompts';
import useFiles from '../../hooks/useFiles';
import Switch from '../../components/Switch';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

const GenerateUIPage: React.FC = () => {
  const { content, inputSystemContext, setContent, setInputSystemContext } =
    useChatPageState();
  const { clear: clearFiles, uploadedFiles, uploadFiles } = useFiles();
  const { chatId } = useParams();
  // uselocation
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
  const { scrollToBottom, scrollToTop } = useScroll();
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
  }, [prompter]);

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

  const [isOver, setIsOver] = useState(false);
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

  return (
    <>
      <div
        onDragOver={fileUpload ? handleDragOver : undefined}
        className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          ウェブサイト生成
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
          {!isEmpty && (
            <div className="mb-2">
              <Switch
                label="ソースコードを表示"
                checked={showCode}
                onSwitch={() => setShowCode((flg) => !flg)}
              />
            </div>
          )}
        </div>

        {((isEmpty && !loadingMessages) || loadingMessages) && (
          <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <BedrockIcon
              className={`fill-gray-400 ${
                loadingMessages ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-gray-400">Generate UI</span>
          </div>
        )}

        {!isEmpty && (
          <div className="flex gap-2 p-2">
            <div className={`${showCode ? 'w-1/2' : 'w-full'} pt-2`}>
              <iframe
                className="h-[calc(100vh-30rem)] w-full rounded-md border"
                srcDoc={code}
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
            </div>
            <div className={`${showCode ? 'w-1/2' : 'hidden'}`}>
              <SyntaxHighlighter
                language="html"
                style={atomDark}
                className="h-[calc(100vh-30rem)] whitespace-pre-wrap">
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        {/* History Container */}
        {!isEmpty && (
          <div className="m-2 rounded-md border border-gray-300 p-2">
            <h2 className="p-2 text-lg">History</h2>
            <div className="mb-4 flex w-11/12 gap-2 overflow-x-auto p-2">
              {showingMessages
                .filter((msg) => msg.role === 'assistant')
                .map((msg) => {
                  return (
                    <div
                      onClick={() => setCode(msg.content)}
                      className="h-36 w-1/6 cursor-pointer">
                      <iframe
                        className="pointer-events-none relative origin-top-left select-none rounded-[36px] border border-black opacity-80 transition-opacity"
                        sandbox="allow-scripts allow-same-origin"
                        loading="lazy"
                        srcDoc={msg.content}
                        title="Generated UI from the prompt"
                        style={{
                          width: '1024px',
                          height: '576px',
                          transform: 'scale(0.24)',
                        }}
                      />
                    </div>
                  );
                })}
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
            {examplePrompts.map(({ value, label }) => (
              <RoundedButton onClick={() => setContent(value)} key={label}>
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
    label: '観葉植物のECサイト',
    value: `観葉植物を専門に取り扱うECサイトを作ってください。

レイアウトのイメージは Amazon.com です。
この EC サイトの名前は「Green Village」です。

ショッピングカートに追加する機能を作ってください。
買い物カゴに追加すると、アニメーションもつけてください。
現在何が買い物カゴに入っているのか確認し、合計金額の計算もできます。
ページ遷移は行わず、SPAのように1ページで処理を行ってください。`,
  },
  {
    label: '動画配信サイト',
    value: `Youtube のような動画配信サイトを作ってください。動画のURLは以下のとおりです。
    
埋め込み動画の形式で表示してください。タイトルから類推してWebページのレイアウトは工夫してください。
以下は、Amazon Web Services Japan 公式 YouTube チャンネルにある動画のURLの一部です。

AWS Dev Live Show
- モダンフロントエンド ~ レンダリングパターンから考える UX 最適化 ~ #AWSDevLiveShow
  - https://www.youtube.com/watch?v=R2YQG5gQMXo&
- 適材適所で上手に活用！コンテナとサーバーレスの使い分けを探る #AWSDevLiveShow
  - https://www.youtube.com/watch?v=iaBO_tUlqSc
- オブザーバビリティを活用した DevOpsの推進 ~ ODD のご紹介と導入 ~ #AWSDevLiveShow
  - https://www.youtube.com/watch?v=MXlJer9dYU4

AWS Dev Day 2023 Tokyo
- [GS-1-1] Invent and Simplify - クラウドとAIを活用したソフトウェア開発の未来 | AWS Dev Day 2023 Tokyo #AWSDevDay
  - https://www.youtube.com/watch?v=6Jkn_qaLph8
- [GS-1-2] 『質とスピード』特別編 〜 現代のソフトウェア開発にキャッチアップしていくヒント〜） | AWS Dev Day 2023 Tokyo #AWSDevDay
  - https://www.youtube.com/watch?v=-yPPfe13bb0
- [GS-2-1] Be Confident. To make your Engineering Life Better.- 開発者としての「居場所」を考える
  - https://www.youtube.com/watch?v=z0FvKCfVN_I

AWS AI Week for Developers
- 生成系AIアプリケーションへの挑戦を全方位で支援するAmazon Web Services | AWS AI Week for Developers ゼネラルセッション
  - https://www.youtube.com/watch?v=55RmC8hZQ5Q&list=PLzWGOASvSx6GpTyGBB6rLapnY9N_xrBKW&index=1
- 生成系 AI のユースケースと AWS サービスの活用例 | AWS AI Week for Developers (ビギナートラック)
  - https://www.youtube.com/watch?v=PhlpsCT_NPw&list=PLzWGOASvSx6GpTyGBB6rLapnY9N_xrBKW&index=3
`,
  },
  {
    label: 'TODOアプリ',
    value: `TODOアプリを SPA で実装してください。`,
  },
  {
    label: 'CSVデータの可視化',
    value: `以下をウェブサイトでグラフとして可視化してください。
    
購買データCSVファイル      
customer_id,product_id,purchase_date,purchase_amount
C001,P001,2023-04-01,50.00
C002,P002,2023-04-02,75.00
C003,P003,2023-04-03,100.00
C001,P002,2023-04-04,60.00
C002,P001,2023-04-05,40.00
C003,P003,2023-04-06,90.00
C001,P001,2023-04-07,30.00
C002,P002,2023-04-08,80.00
C003,P001,2023-04-09,45.00
C001,P003,2023-04-10,120.00


このCSVファイルには、以下のような情報が含まれています。

- 'customer_id': 顧客ID
- 'product_id': 商品ID
- 'purchase_date': 購買日
- 'purchase_amount': 購買金額`,
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

export default GenerateUIPage;
