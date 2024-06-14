import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import useFiles, { extractBaseURL } from '../../hooks/useFiles';
import Switch from '../../components/Switch';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useDebounce } from '../../hooks/useDebounce';
import ButtonIcon from '../../components/ButtonIcon';
import { UploadedFileType } from 'generative-ai-use-cases-jp';
import useFileApi from '../../hooks/useFileApi';

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
    continueGenerate,
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

  // Summit用
  const onContinueGenerate = useCallback(() => {
    continueGenerate(false, undefined, undefined, undefined);
  }, [continueGenerate]);

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

  const [selectedExamplePrompt, setSelectedExamplePrompt] =
    useState<string>('');

  // AWS Summit ではキーボード操作はあまりしたくないと想定されるので、あらかじめ追加で入力したくなるプロンプトを用意しておき、選択するだけでインタラクティブな操作ができるようにしておく
  const additionalRecommennds = examplePrompts
    .filter((examplePrompt) => examplePrompt.label === selectedExamplePrompt)[0]
    ?.additionalExamplePrompts?.map(({ label, value }) => {
      return (
        <RoundedButton
          onClick={() => {
            setContent(value);
          }}
          key={label}>
          {label} ↗️
        </RoundedButton>
      );
    });

  // Video Feature
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [devices, setDevices] = useState<{ value: string; label: string }[]>(
    []
  );
  const [deviceId, setDeviceId] = useState('');
  const [sending, setSending] = useState(false);
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const callbackRef = useRef<() => void>();
  const { getSignedUrl, uploadFile } = useFileApi();

  useEffect(() => {
    const getDevices = async () => {
      // 新規で画面を開いたユーザーにカメラの利用を要求する (ダミーのリクエスト)
      const dummyStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      if (dummyStream) {
        // 録画ボタンがついてしまうため消す
        dummyStream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => {
            return {
              value: device.deviceId,
              label: device.label.replace(/\s\(.*?\)/g, ''),
            };
          });
        setDevices(videoDevices);
      }
    };

    getDevices();
  }, []);

  useEffect(() => {
    if (deviceId.length === 0 && devices.length > 0) {
      setDeviceId(devices[0].value);
    }
  }, [deviceId, devices]);

  const sendFrame = useCallback(() => {
    if (!videoElement.current) return;

    setSending(true);

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.current.videoWidth;
    canvas.height = videoElement.current.videoHeight;
    const context = canvas.getContext('2d');
    context!.drawImage(videoElement.current, 0, 0, canvas.width, canvas.height);
    // toDataURL() で返す値は以下の形式 (;base64, 以降のみを使う)
    // ```
    // data:image/png;base64,<以下base64...>
    // ```
    const imageBase64 = canvas.toDataURL('image/png').split(';base64,')[1];

    canvas.toBlob(async (blob) => {
      const file = new File([blob!], 'tmp.png', { type: 'image/png' });
      const signedUrl = (await getSignedUrl({ mediaFormat: 'png' })).data;
      await uploadFile(signedUrl, { file });
      const baseUrl = extractBaseURL(signedUrl);
      const uploadedFiles: UploadedFileType[] = [
        {
          file,
          s3Url: baseUrl,
          base64EncodedImage: imageBase64,
          uploading: false,
        },
      ];

      postChat(
        prompter.videoAnalyzerPrompt({
          content,
        }),
        false,
        undefined,
        undefined,
        undefined,
        uploadedFiles
      );

      setSending(false);
    });
  }, [prompter, content, postChat, getSignedUrl, uploadFile]);

  const startRecording = useCallback(async () => {
    try {
      if (videoElement.current) {
        setRecording(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: {
              exact: deviceId,
            },
          },
        });
        videoElement.current.srcObject = stream;
        videoElement.current.play();

        setMediaStream(stream);
      }
    } catch (e) {
      console.error('ウェブカメラにアクセスできませんでした:', e);
    }
  }, [setRecording, videoElement, deviceId]);

  // ビデオの停止
  const stopRecording = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
  }, [mediaStream]);

  // Callback 関数を常に最新にしておく
  useEffect(() => {
    callbackRef.current = stopRecording;
  }, [stopRecording]);

  // Unmount 時 (画面を離れた時) の処理
  useEffect(() => {
    return () => {
      if (callbackRef.current) {
        callbackRef.current();
        callbackRef.current = undefined;
      }
    };
  }, []);

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
            <div className="mb-2 hidden lg:inline-block">
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
            {!recording && (
              <BedrockIcon
                className={`fill-gray-400 ${
                  loadingMessages ? 'animate-pulse' : ''
                }`}
              />
            )}
            {!recording && <span className="text-gray-400">Generate UI</span>}

            <div className="justify-center">
              <video ref={videoElement} className={recording ? '' : 'hidden'} />
              {recording && (
                <div className="flex flex-col">
                  <span className="pb-2 pt-2 text-gray-400">
                    手書きのスケッチを読み込ませてみましょう
                  </span>
                  <Select
                    value={deviceId}
                    options={devices}
                    clearable={false}
                    onChange={setDeviceId}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!isEmpty && (
          <div className="flex gap-2 p-2">
            <div className={`${showCode ? 'w-1/2' : 'w-full'} pt-2`}>
              <iframe
                className="h-[calc(100vh-30rem)] w-full rounded-md border"
                srcDoc={debouncedCode}
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
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
                language="html"
                style={atomDark}
                className="h-[calc(100vh-30rem)] whitespace-pre-wrap">
                {debouncedCode}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        {/* History Container */}
        {!isEmpty && (
          <div className="m-2 rounded-md border border-gray-300 p-2">
            <h2 className="p-2 text-lg">History</h2>
            <div className="mb-4 flex w-11/12 gap-4 overflow-x-auto p-2">
              {showingMessages.map((msg, index) => {
                if (msg.role === 'user') return;
                return (
                  <div
                    onClick={() => {
                      setCode(msg.content);
                      setContent(showingMessages[index - 1].content);
                    }}
                    key={index + '-msg'}
                    className="h-36 w-60 cursor-pointer opacity-60 transition-opacity duration-300 hover:opacity-100">
                    {loading && index === showingMessages.length - 1 ? (
                      <div
                        className="relative origin-top-left animate-pulse rounded-[36px] border border-gray-400 bg-gray-300"
                        style={{
                          width: '1024px',
                          height: '576px',
                          transform: 'scale(0.24)',
                        }}></div>
                    ) : (
                      <iframe
                        className="pointer-events-none relative origin-top-left select-none rounded-[36px] border border-gray-400"
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
                    )}
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

          {recording ? (
            <InputChatContent
              onSend={() => {
                sendFrame();
                stopRecording();
              }}
              disabled={
                !recording || loading || sending || content.length === 0
              }
              loading={loading}
              disableMarginBottom={true}
              hideReset={true}
              content={content}
              onChangeContent={setContent}
            />
          ) : (
            <InputChatContent
              content={content}
              disabled={loading}
              onChangeContent={setContent}
              resetDisabled={!!chatId}
              onSend={() => {
                onSend();
              }}
              onContinueGenerate={() => {
                onContinueGenerate();
              }}
              onReset={onReset}
              fileUpload={fileUpload}
            />
          )}

          {/* Recommended Button Container */}
          <div className="mb-4 flex gap-2">
            {!showingMessages.length &&
              examplePrompts.map(({ value, label }) => (
                <RoundedButton
                  onClick={() => {
                    setContent(value);
                    setSelectedExamplePrompt(label);
                  }}
                  key={label}>
                  {label} ↗️
                </RoundedButton>
              ))}
            {!showingMessages.length && (
              <RoundedButton
                onClick={() => {
                  setContent(
                    'カメラから読み取った画像を参考にウェブサイトを実装してください'
                  );

                  startRecording();
                }}>
                手書きスケッチ ↗️
              </RoundedButton>
            )}

            {showingMessages.length > 0 && !loading && additionalRecommennds}
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
    additionalExamplePrompts: [
      {
        label: 'ヘッダーとフッターを追加',
        value: 'ヘッダーとフッターをつけてください。',
      },
      {
        label: '他のページを追加する',
        value:
          'ユーザのプロフィールページ、買い物カゴの一覧を確認するページを追加して遷移可能にしてください。',
      },
    ],
  },
  {
    label: 'ECサイトの管理画面',
    value: `ECサイトの管理画面を作ってください。

サイドバーナビゲーションがあるダッシュボードを実装してください。
ダッシュボードには直近の注文を表示するテーブルがあり、発注などのステータス管理ができます。

この EC サイトの名前は「Green Village」です。観葉植物を専門に取り扱うECサイトです。`,
    additionalExamplePrompts: [
      {
        label: 'ページング',
        value:
          'ページング実装をしてください。デフォルトで１画面に１０件まで表示でき、１ページあたりの表示件数も調整できるようにします。',
      },
      {
        label: 'グラフを描画する',
        value: '日毎の注文数の推移を折線グラフとして描画してください。',
      },
    ],
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
    additionalExamplePrompts: [
      {
        label: 'おすすめエリアの作成',
        value:
          'ユーザに推奨する動画をピックアップしておすすめする領域を作ってください。',
      },
      {
        label: '他のページを追加する',
        value:
          'ユーザのプロフィールページ、買い物カゴの一覧を確認するページを追加して遷移可能にしてください。',
      },
    ],
  },
  {
    label: 'TODOアプリ',
    value: `TODOアプリを SPA で実装してください。`,
    additionalExamplePrompts: [
      {
        label: 'アニメーションをつけて',
        value:
          'TODOリストに追加したとき、削除したときにアニメーションをつけてください。',
      },
    ],
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
    additionalExamplePrompts: [
      {
        label: 'パイチャートも',
        value: '商品別に購入された比率をパイチャートとしても表示してください。',
      },
      {
        label: '購買傾向の未来予測',
        value:
          '購入された実績から、今後の傾向を予測してデータを生成、プロットしてください。予測値のデータは色を変えて表示して欲しいです。また、その予測される理由を文章として説明するWebページにしてください。',
      },
    ],
  },
  {
    label: 'VRアプリ',
    value: `宇宙感のある3Dモデルを表示するWebサイトを作ってください

3D モデルの例
https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf

特に指定がなければ Vue.js は使わずにシンプルに実装してください。
`,
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
