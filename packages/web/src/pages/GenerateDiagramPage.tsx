import React, { useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import ExpandableField from '../components/ExpandableField';
import { create } from 'zustand';
import { MODELS } from '../hooks/useModel';
import queryString from 'query-string';
import useDiagram from '../hooks/useDiagram';
import { DiagramPageQueryParams } from '../@types/navigate';
import Markdown from '../components/Markdown';
import { RiRobot2Line, RiMindMap } from 'react-icons/ri';
import { BiAbacus } from 'react-icons/bi';
import { BsDiagram3 } from 'react-icons/bs';
import { GrCluster } from 'react-icons/gr';
import { VscTypeHierarchy } from 'react-icons/vsc';
import { FaChartGantt, FaTimeline } from 'react-icons/fa6';
import { PiChartPieDuotone } from 'react-icons/pi';
import { GoChecklist } from 'react-icons/go';
import { LiaMailBulkSolid } from 'react-icons/lia';
import {
  TbGitBranch,
  TbRoute,
  TbChartSankey,
  TbChartDots3,
  TbMathXy,
  TbBrandAws,
  TbPackages,
  TbMathSymbols,
} from 'react-icons/tb';

const DiagramRenderer = lazy(() => import('../components/DiagramRenderer'));

type StateType = {
  content: string;
  setContent: (s: string) => void;
  diagramCode: string;
  setDiagramCode: (s: string) => void;
  diagramSentence: string;
  setDiagramSentence: (s: string) => void;
  selectedType: DiagramType;
  setSelectedType: (s: DiagramType) => void;
  diagramGenerationError: Error | null;
  setDiagramGenerationError: (e: Error | null) => void;
  clear: () => void;
};

const useDiagramPageState = create<StateType>((set) => {
  const INIT_STATE = {
    content: '',
    diagramCode: '',
    diagramSentence: '',
    selectedType: 'AI' as DiagramType,
    diagramGenerationError: null,
  };
  return {
    ...INIT_STATE,
    setContent: (s: string) => set({ content: s }),
    setDiagramCode: (s: string) => set({ diagramCode: s }),
    setDiagramSentence: (s: string) => set({ diagramSentence: s }),
    setSelectedType: (type: DiagramType) => set({ selectedType: type }),
    setDiagramGenerationError: (e: Error | null) =>
      set({ diagramGenerationError: e }),
    clear: () => set(INIT_STATE),
  };
});

type DiagramType =
  | 'AI'
  | 'flowchart'
  | 'piechart'
  | 'mindmap'
  | 'quadrantchart'
  | 'sequencediagram'
  | 'timeline'
  | 'gitgraph'
  | 'erdiagram'
  | 'classdiagram'
  | 'statediagram'
  | 'xychart'
  | 'blockdiagram'
  | 'architecture'
  | 'ganttchart'
  | 'userjourney'
  | 'sankeychart'
  | 'requirementdiagram'
  | 'networkpacket';

type DiagramInfo = {
  id: DiagramType;
  icon: React.ElementType;
  title: string;
  description: string;
  example: {
    title: string;
    content: string;
  };
  category: 'main' | 'other';
};

const DiagramData: Record<DiagramType, DiagramInfo> = {
  AI: {
    id: 'AI',
    icon: RiRobot2Line,
    title: 'AI',
    description: 'AIが最適な図を選択',
    example: {
      title: 'AIによる図の生成の例',
      content: `会社の一般的な経費生産フローを色つきで図示してください。`,
    },
    category: 'main',
  },
  flowchart: {
    id: 'flowchart',
    icon: VscTypeHierarchy,
    title: 'フローチャート',
    description: 'プロセスの流れを視覚化',
    example: {
      title: 'フローチャートの例',
      content: `朝の準備の流れをフローチャートで表現したいです。以下の手順を含めてください: 
目覚める、ベッドから出る、顔を洗う、歯を磨く、朝食を食べる、服を着替える、家を出る、

途中で「時間に余裕があるか？」という判断ポイントを入れ、余裕がある場合は「コーヒーを飲む」というステップを追加してください。
時間に余裕がない場合は、そのまま「家を出る」に進むようにしてください。

簡潔で見やすいデザインの図にしてください。`,
    },
    category: 'main',
  },
  piechart: {
    id: 'piechart',
    icon: PiChartPieDuotone,
    title: '円グラフ',
    description: 'データの割合を表示',
    example: {
      title: '円グラフの例',
      content: `東京都内の20代、30代の通勤・通学手段の割合を示す円グラフを作成したいです。

電車、自転車、徒歩、車、バスの5つの手段について、それぞれの割合を適当に設定してください。
グラフのタイトルは「東京都内20-30代の通勤・通学手段」としてください。`,
    },
    category: 'main',
  },
  mindmap: {
    id: 'mindmap',
    icon: RiMindMap,
    title: 'マインドマップ',
    description: 'アイデアや概念を放射状に整理',
    example: {
      title: 'マインドマップの例',
      content: `生成AIのユースケースについて、様々なアイデアを考えてマインドマップで図示してください。`,
    },
    category: 'main',
  },
  quadrantchart: {
    id: 'quadrantchart',
    icon: TbMathSymbols,
    title: '4象限チャート',
    description: '項目を4つの領域に分類して表示',
    example: {
      title: '4象限チャートの例',
      content: `ソーシャルメディアプラットフォームの特性を比較する4象限チャートを作成してください。
タイトルは「ソーシャルメディアプラットフォーム分析」。 
X軸は「テキスト中心」から「視覚中心」へと変化し、
Y軸は「プロフェッショナル」から「カジュアル」へと変化する。

各象限には以下のようにラベルを付けてください: 
右上の象限: 「視覚的カジュアル」
左上の象限: 「テキスト的カジュアル」
左下の象限: 「テキスト的プロフェッショナル」
右下の象限: 「視覚的プロフェッショナル」

次のソーシャルメディアプラットフォームをチャート上にプロットしてください:
Twitter: テキスト寄りでややカジュアル、
Instagram: 非常に視覚的でかなりカジュアル、
LinkedIn: テキスト寄りで非常にプロフェッショナル、
TikTok: 非常に視覚的で最もカジュアル、
Facebook: X軸とY軸の中間あたり。 

可能であれば、各プラットフォームを異なる色で表示してください。`,
    },
    category: 'other',
  },
  sequencediagram: {
    id: 'sequencediagram',
    icon: BiAbacus,
    title: 'シーケンス図',
    description: 'オブジェクト間の相互作用を時系列で表現',
    example: {
      title: 'シーケンス図の例',
      content: `Webアプリケーションで、ユーザーがログインボタンを押してから認証が完了するまでの流れを示してください。

フロントエンド、認証サーバー、データベースの3つのコンポーネントが関係します。`,
    },
    category: 'other',
  },
  timeline: {
    id: 'timeline',
    icon: FaTimeline,
    title: 'タイムライン図',
    description: '出来事を時系列で表示',
    example: {
      title: 'タイムライン図の例',
      content: `2000年から2020年までのソーシャルメディアの主要な進化と転換点をタイムラインで表現してください。
        
以下の要素を含めてください: 
ブログの普及期
写真共有プラットフォームの台頭
マイクロブログの登場
動画共有サービスの発展
モバイルファースト型SNSの広がり
ショート動画プラットフォームの台頭

各転換点について、その時期に起きた重要な技術革新や社会的変化（例: スマートフォンの普及、高速モバイルインターネットの実現など）も1-2個ずつ追記してください。`,
    },
    category: 'other',
  },
  gitgraph: {
    id: 'gitgraph',
    icon: TbGitBranch,
    title: 'Gitグラフ',
    description: 'Gitのブランチと操作の履歴を視覚化',
    example: {
      title: 'Gitグラフの例',
      content: `メインブランチから、ログイン機能とプロフィール編集機能の2つのfeatureブランチが分岐する開発フローを表現してください。

ログイン機能の開発では、フォーム実装やバリデーション追加などの複数回のコミットを行い、最終的にPull Requestでmainブランチにマージします。
一方、プロフィール編集機能の開発中には、mainブランチに加えられた最新の変更を取り込む必要が生じます。

各マージポイントでは「Reviewed and merged login feature #123」のような、コードレビューを経た実際のプロジェクトらしいコミットメッセージを含めてください。`,
    },
    category: 'other',
  },
  erdiagram: {
    id: 'erdiagram',
    icon: GrCluster,
    title: 'ER図',
    description: 'データベース設計を表現',
    example: {
      title: 'ER図の例',
      content: `ブログシステムのデータベース設計を示してください。

以下のテーブルがあり、それぞれ適切にリレーションが設定されています。:        
記事（posts）
ユーザー（users）
コメント（comments）
カテゴリー（categories）
タグ（tags）`,
    },
    category: 'other',
  },
  classdiagram: {
    id: 'classdiagram',
    icon: BsDiagram3,
    title: 'クラス図',
    description: 'クラスの構造と関係を表示',
    example: {
      title: 'クラス図の例',
      content: `ECサイトのドメインモデルを作成してください。

以下のクラスが存在します: 
User（ユーザー）
Product（商品）
Order（注文）
CartItem（カート内商品）

各クラスには適切なプロパティとメソッドを含めてください。`,
    },
    category: 'other',
  },
  statediagram: {
    id: 'statediagram',
    icon: TbChartDots3,
    title: '状態遷移図',
    description: '物の状態変化を図示',
    example: {
      title: '状態図の例',
      content: `オンラインショッピングカートの状態遷移を示してください。
「空」、「商品追加済み」、「チェックアウト中」、「支払い完了」などの状態を含めます。`,
    },
    category: 'other',
  },
  xychart: {
    id: 'xychart',
    icon: TbMathXy,
    title: 'XYチャート',
    description: '2つの変数の関係を図示',
    example: {
      title: 'XYチャートの例',
      content: `過去10年間の日本の平均睡眠時間と労働時間の関係を示すXYチャートを作成してください。

X軸を1日の平均労働時間、Y軸を1日の平均睡眠時間とし、各年のデータポイントをプロットしてください。`,
    },
    category: 'other',
  },
  blockdiagram: {
    id: 'blockdiagram',
    icon: TbPackages,
    title: 'ブロック図',
    description: 'システムの構成要素と接続を表現',
    example: {
      title: 'ブロック図の例',
      content: `スマートフォンのハードウェアコンポーネントを示すブロック図を作成してください。

以下の要素を含めます:
プロセッサ
メモリ
ストレージ
ディスプレイ
カメラ
各種センサーなど。`,
    },
    category: 'other',
  },
  architecture: {
    id: 'architecture',
    icon: TbBrandAws,
    title: 'アーキテクチャ図',
    description: 'システム全体の構造を表現',
    example: {
      title: 'アーキテクチャ図の例',
      content: `クラウドベースのWeb アプリケーションのアーキテクチャを示してください。

以下のコンポーネントを含めます:
フロントエンド
バックエンド
データベース
キャッシュ
ロードバランサー
CDNなど`,
    },
    category: 'other',
  },
  ganttchart: {
    id: 'ganttchart',
    icon: FaChartGantt,
    title: 'ガントチャート',
    description: 'プロジェクトのスケジュールを視覚化',
    example: {
      title: 'ガントチャートの例',
      content: `Webアプリケーション開発プロジェクトのスケジュールを示してください。
要件定義、設計、開発、テスト、デプロイメントの各フェーズを含めます。`,
    },
    category: 'other',
  },
  userjourney: {
    id: 'userjourney',
    icon: TbRoute,
    title: 'ユーザージャーニー図',
    description: 'ユーザー体験の流れを図示',
    example: {
      title: 'ユーザージャーニーの例',
      content: `オンラインショッピングサイトでの顧客の購買体験を示してください。

以下の流れを含めてください:
商品検索
商品閲覧
カートへの追加
チェックアウト
支払い
配送追跡`,
    },
    category: 'other',
  },
  sankeychart: {
    id: 'sankeychart',
    icon: TbChartSankey,
    title: 'サンキーチャート',
    description: 'フローの量や割合を視覚化',
    example: {
      title: 'サンキーチャートの例',
      content: `Webサイトのユーザーフローを示すサンキーチャートを作成してください。
ランディングページから始まり、各ページの遷移と離脱率を表示します。`,
    },
    category: 'other',
  },
  requirementdiagram: {
    id: 'requirementdiagram',
    icon: GoChecklist,
    title: '要件図',
    description: 'システム要件を構造化して表現',
    example: {
      title: '要求図の例',
      content: `スマートホームシステムの主要な機能要件を示してください。
照明制御、温度管理、セキュリティ、エネルギー効率化などの要件を含めます。`,
    },
    category: 'other',
  },
  networkpacket: {
    id: 'networkpacket',
    icon: LiaMailBulkSolid,
    title: 'ネットワークパケット図',
    description: 'ネットワーク通信のパケット構造を図示',
    example: {
      title: 'ネットワークパケット図の例',
      content: `HTTPリクエストパケットの構造を示す図を作成してください。
ヘッダーとボディの主要な要素を含めます。`,
    },
    category: 'other',
  },
} as const;

const MainTypeOptions = Object.values(DiagramData).filter(
  (diagram) => diagram.category === 'main'
);
const OtherTypeOption = Object.values(DiagramData).filter(
  (diagram) => diagram.category === 'other'
);

const DiagramTypeButton: React.FC<{
  option: DiagramInfo;
  isSelected: boolean;
  onClick: (id: DiagramType) => void;
}> = ({ option, isSelected, onClick }) => (
  <button
    onClick={() => onClick(option.id)}
    className={`min-h-[155px] w-[calc(25%)] min-w-[110px] max-w-[130px] flex-col rounded-lg border px-1 hover:bg-blue-50
      ${isSelected ? 'border-blue-600 bg-blue-100' : 'border-gray-500 bg-white'}`}>
    <div className="text-2xl">
      {React.createElement(option.icon, {
        size: '1.5rem',
        className: `mx-auto ${isSelected ? 'text-gray-900' : 'text-gray-500'}`,
      })}
    </div>
    <div
      className={`my-3 text-xs font-bold ${isSelected ? 'text-black' : 'text-gray-500'}`}>
      {option.title}
    </div>
    <div
      className={`text-xs ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
      {option.description}
    </div>
  </button>
);

const GenerateDiagramPage: React.FC = () => {
  const {
    content,
    setContent,
    diagramCode,
    setDiagramCode,
    diagramSentence,
    setDiagramSentence,
    selectedType,
    setSelectedType,
    diagramGenerationError,
    setDiagramGenerationError,
    clear,
  } = useDiagramPageState();
  const { pathname, search } = useLocation();
  const {
    loading,
    getModelId,
    setModelId,
    clear: clearChat,
    setLoading,
    messages,
    isEmpty,
    postDiagram,
    diagramType,
  } = useDiagram(pathname);

  const { modelIds: availableModels } = MODELS;
  const modelId = getModelId();

  const disabledExec = useMemo(() => {
    return content === '' || loading;
  }, [content, loading]);

  const handleMarkdownChange = (markdown: string) => {
    setDiagramCode(markdown);
  };

  useEffect(() => {
    (() => {
      if (search) {
        const params = queryString.parse(search) as DiagramPageQueryParams;
        const modelIdFromParams = params.modelId;

        if (params.content) {
          setContent(params.content);
        }

        if (modelIdFromParams && availableModels.includes(modelIdFromParams)) {
          setModelId(modelIdFromParams);
        } else {
          setModelId(availableModels[0]);
        }
      } else {
        setModelId(availableModels[0]);
      }
    })();
    // 無限ループ回避のため以下の依存関係のみ残す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, search]);

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    const currentMessage = lastMessage.content;

    if (currentMessage.toLowerCase().includes('```mermaid')) {
      const mermaidCode = currentMessage
        .split('```mermaid')[1]
        .split('```')[0]
        .trim();
      setDiagramCode(mermaidCode);
    }

    if (currentMessage.toLowerCase().includes('<description>')) {
      const mermaidDescription = currentMessage
        .split(/<description>/i)[1]
        .split(/<\/description>/i)[0]
        .trim();
      setDiagramSentence(mermaidDescription);
    } else if (
      currentMessage.includes(
        'ただいまアクセスが集中しているため時間をおいて試してみてください。'
      )
    ) {
      setDiagramSentence(
        'ただいまアクセスが集中しているため時間をおいて試してみてください。'
      );
    } else {
      setDiagramSentence(currentMessage);
    }
  }, [messages, setDiagramCode, setDiagramSentence]);

  const onClickExec = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    // 前の結果は消したいので、content 以外 clear
    setDiagramGenerationError(null);
    setDiagramCode('');
    setDiagramSentence('');

    try {
      await postDiagram(content, selectedType);
    } catch (error: unknown) {
      if (error instanceof Error) setDiagramGenerationError(error);
      else setDiagramGenerationError(new Error(`${error}`));
    }
  }, [
    content,
    loading,
    postDiagram,
    selectedType,
    setDiagramCode,
    setDiagramGenerationError,
    setDiagramSentence,
    setLoading,
  ]);

  const onClickClear = useCallback(() => {
    clear();
    clearChat();
  }, [clear, clearChat]);

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <div className="invisible col-span-12 my-0 ml-5 h-0 items-center text-xl font-semibold lg:visible lg:mb-0 lg:mt-5 lg:h-min print:visible print:my-5 print:h-min">
        ダイアグラム生成
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:h-[calc(100vh-4rem)] lg:flex-row">
        {/* 左カラム: 入力エリア */}
        <div className="w-full lg:w-[45%]">
          <Card
            label="ダイアグラム生成元の文章"
            className="flex h-full flex-col">
            <div className="overflow-y-auto pb-5 pl-1">
              <div className="mb-2">
                <Select
                  value={modelId}
                  onChange={setModelId}
                  options={availableModels.map((m) => ({
                    value: m,
                    label: m,
                  }))}
                  label="モデル"
                />
              </div>
              {/* 主要の種類を選択 */}
              <div className="mb-2">
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  <>
                    図の種類を選択{' '}
                    <span className="font-normal">
                      - {DiagramData[selectedType].title}
                    </span>
                  </>
                </label>
                <div className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 flex gap-2 overflow-x-auto pb-2">
                  {MainTypeOptions.map((option) => (
                    <DiagramTypeButton
                      key={option.id}
                      option={option}
                      isSelected={selectedType === option.id}
                      onClick={setSelectedType}
                    />
                  ))}
                </div>
              </div>

              {/* その他の種類を選択 */}
              <ExpandableField label="他の図の種類を見る">
                <div className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 flex gap-2 overflow-x-auto pb-2">
                  {OtherTypeOption.map((option) => (
                    <DiagramTypeButton
                      key={option.id}
                      option={option}
                      isSelected={selectedType === option.id}
                      onClick={setSelectedType}
                    />
                  ))}
                </div>
              </ExpandableField>

              <div className="my-4">
                <Textarea
                  placeholder="生成元の文章を入力してください"
                  value={content}
                  onChange={setContent}
                  className="w-full resize-none overflow-y-auto"
                />
              </div>

              {/* 入力例とボタンを配置 */}
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                {/* 入力例 */}
                <div className="w-full sm:w-auto">
                  <div className="mb-1 text-sm font-bold text-gray-600">
                    入力例
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="cursor-pointer rounded-full border px-4 py-1 text-sm text-gray-600 hover:bg-gray-50"
                      onClick={() =>
                        setContent(DiagramData[selectedType].example.content)
                      }
                      outlined>
                      {DiagramData[selectedType].example.title}
                    </Button>
                  </div>
                </div>

                {/* クリア＆生成ボタン */}
                <div className="mr-2 flex flex-col gap-1 sm:flex-row">
                  <Button
                    outlined
                    onClick={onClickClear}
                    disabled={disabledExec}>
                    クリア
                  </Button>
                  <Button disabled={disabledExec} onClick={onClickExec}>
                    生成
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 右カラム: 出力エリア */}
        <div className="w-full lg:w-[55%]">
          <Card label="生成結果" className="flex h-full flex-col px-3">
            <div className="min-h-0 flex-1 overflow-auto">
              {/* 生成ステータス表示 */}
              {loading && (
                <div className="mb-4 space-y-2">
                  {/* Step1 表示 */}
                  {diagramType === '' ? (
                    <div className="flex min-h-[40px] items-center justify-center rounded-md bg-gray-50 p-3">
                      <span className="text-gray-600">
                        ステップ１: 最適なダイアグラムを選んでいます
                      </span>
                      <div className="border-aws-sky ml-2 size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="flex min-h-[40px] flex-col items-center justify-center rounded-md bg-blue-50 p-3">
                      <span className="text-gray-600">ステップ１: 完了</span>
                      <span className="mt-1 text-gray-600">
                        {
                          DiagramData[diagramType as keyof typeof DiagramData]
                            ?.title
                        }
                        を選択
                      </span>
                    </div>
                  )}

                  {/* Step2 表示 */}
                  {diagramType !== '' && (
                    <div className="flex min-h-[40px] items-center justify-center rounded-md bg-gray-50 p-3">
                      <span className="text-gray-600">
                        ステップ２: 図を生成しています
                      </span>
                      <div className="border-aws-sky ml-2 size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              )}

              {/* ダイアグラムと説明の表示 */}
              <div className="space-y-4">
                {diagramSentence.length > 0 && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 text-lg font-medium">回答</h3>
                    <div className="flex justify-start whitespace-pre-wrap">
                      {diagramSentence}
                    </div>
                  </div>
                )}

                {diagramCode.length > 0 && (
                  <div className="rounded-lg bg-gray-50">
                    <h3 className="border-b border-gray-200 p-4 text-lg font-medium">
                      {DiagramData[diagramType as keyof typeof DiagramData]
                        ?.title || 'チャート'}
                    </h3>
                    {loading ? (
                      <div className="p-3">
                        <Markdown>
                          {['```mermaid', diagramCode, '```'].join('\n')}
                        </Markdown>
                      </div>
                    ) : (
                      <div className="p-3">
                        <Suspense fallback={<div>Loading...</div>}>
                          <DiagramRenderer
                            code={diagramCode}
                            handleMarkdownChange={handleMarkdownChange}
                          />
                        </Suspense>
                      </div>
                    )}
                  </div>
                )}

                {!loading && isEmpty && (
                  <div className="rounded-lg py-8 text-center text-gray-500">
                    ダイアグラムがここに表示されます
                  </div>
                )}

                {diagramGenerationError && (
                  <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    {diagramGenerationError.message}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GenerateDiagramPage;
