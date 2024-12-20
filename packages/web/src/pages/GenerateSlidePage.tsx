import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Select from '../components/Select';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import { GenerateTextPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { getPrompter } from '../prompts';
import queryString from 'query-string';
import InputChatContent from '../components/InputChatContent';
import Switch from '../components/Switch';
import Button from '../components/Button';
import SlidePreview from '../components/SlidePreview';
import { PiArrowsCounterClockwise, PiDownload } from 'react-icons/pi';
import { PresentationConverter } from '../utils/PresentationConverter';

type StateType = {
  information: string;
  setInformation: (s: string) => void;
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

const slidesSample = `# Gen Deck

## 生成AIでスライド作成

- チャット形式で簡単作成
- マークダウン形式で編集可能
- リアルタイムプレビュー

---

## 使い方

1. 入力フォームにスライドの内容を指示
2. AIがスライドを生成
3. 必要に応じて編集

以下のような指示ができます：
- 「新商品のプレゼン資料を作って」
- 「自己紹介スライドを作って」

---

## コード表示も可能

\`\`\`javascript
const greet = () => {
  console.log('Hello, World!');
}
\`\`\`

---

## さあ、はじめよう！

1. サンプルプロンプトを試す
2. 自分でプロンプトを書く
3. 生成されたスライドを編集`;

const useGenerateSlidePageState = create<StateType>((set) => {
  const INIT_STATE = {
    information: '',
    text: slidesSample,
  };
  return {
    ...INIT_STATE,
    setInformation: (s: string) => {
      set(() => ({
        information: s,
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

const GenerateSlidePage: React.FC = () => {
  const { information, setInformation, text, setText } =
    useGenerateSlidePageState();
  const { pathname, search } = useLocation();
  const {
    getModelId,
    setModelId,
    loading,
    messages,
    postChat,
    updateSystemContextByModel,
  } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;
  const [showCode, setShowCode] = React.useState(false);

  // モデルIDの初期設定を1回だけ行う
  useEffect(() => {
    const params = queryString.parse(search) as GenerateTextPageQueryParams;
    const paramModelId = params.modelId;

    if (paramModelId && availableModels.includes(paramModelId)) {
      setModelId(paramModelId);
    } else if (availableModels.length > 0) {
      setModelId(availableModels[0]);
    }

    if (params.information) {
      setInformation(params.information);
    }
  }, []); // 空の依存配列で1回だけ実行

  // システムコンテキストの更新
  useEffect(() => {
    updateSystemContextByModel();
  }, []);

  const prompter = useMemo(() => getPrompter(getModelId()), [getModelId]);

  const getGeneratedText = (information: string) => {
    const systemPrompt = `あなたはプレゼンテーション資料を作成する専門家です。
以下の要件に従って、マークダウン形式でスライドを作成してください：

1. スライドの区切りには "---" を使用
2. 各スライドの構成：
   - 明確な見出し
   - 簡潔な本文（1スライドあたり3〜4行程度）
   - 箇条書きや番号付きリストを効果的に使用
3. プレゼンテーションの基本原則：
   - 1枚のスライドにつき1つの主要メッセージ
   - 情報は簡潔に
   - 視覚的な階層構造を意識
4. コードブロックを含める場合：
   - シンタックスハイライトのための言語指定を含める
   - コードは簡潔で理解しやすいものに

内容は専門家として適切に構造化し、聴衆を惹きつける魅力的な表現を心がけてください。`;

    postChat(`${systemPrompt}\n\n${information}`, true);
  };

  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setText(_response.trim());
  }, [messages, setText]);

  const onClickExecGenerateDeck = useCallback(() => {
    if (loading) return;
    getGeneratedText(information);
  }, [information, loading]);

  const examplePrompts = [
    {
      label: 'AWS の紹介',
      value:
        'AWS の良さを熱く語るスライドを作成してください。クラウドコンピューティングの未来も含めて、エモーショナルな表現で魅力を伝えてください。',
    },
    {
      label: 'AWS Lambda 入門',
      value: `AWS Lambda の入門者向けプレゼンテーションを作成してください。
以下の内容を含めてください：
- Lambda の基本概念と利点
- 簡単なNode.jsのコード例
- 主要な制限値（クォータ）を表形式で
- ユースケース例

タイトル: AWS Lambda で始めるサーバーレス開発`,
    },
    {
      label: '技術トレンド',
      value:
        'プログラミング言語のトレンドについて分析するスライドを作成してください。人気言語のランキングやグラフ表現を含め、今後の展望まで示してください。',
    },
    {
      label: 'チーム紹介',
      value: `以下のチーム情報をスライドにまとめてください。

チーム名: イノベーションチーム
メンバー: 5名（企画2名、開発2名、デザイン1名）
特徴: 
- アジャイル開発を採用
- 週次でリリース
- ユーザーフィードバックを重視

実績:
- 新規アプリのローンチ（3ヶ月で10万ユーザー）
- 社内改善プロジェクト主導
- 技術勉強会の定期開催`,
    },
  ];
  const slideContainerRef = useRef<HTMLDivElement | null>(null);

  const handleExport = useCallback(async () => {
    if (!slideContainerRef.current) return;

    try {
      const converter = new PresentationConverter();
      await converter.convertFromRevealDOM(slideContainerRef.current);
    } catch (error) {
      console.error('Failed to export presentation:', error);
    }
  }, []);

  const handleSlideReady = useCallback((container: HTMLDivElement) => {
    slideContainerRef.current = container;
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        スライド生成
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="スライドの元になる情報">
          <div className="mb-2 flex w-full content-center justify-between">
            <Select
              value={getModelId()}
              onChange={setModelId}
              options={availableModels.map((m) => {
                return { value: m, label: m };
              })}
            />

            <Switch
              label="Markdown テキストを表示する"
              checked={showCode}
              onSwitch={setShowCode}
            />
          </div>

          <InputChatContent
            onSend={onClickExecGenerateDeck}
            placeholder="出力したいスライドの内容を入力してください"
            disabled={loading}
            loading={loading}
            fullWidth={true}
            disableMarginBottom={true}
            hideReset={true}
            content={information}
            onChangeContent={setInformation}
          />

          <div className="mb-2 mt-4 flex justify-between">
            <div className="mb-2 flex flex-wrap gap-2">
              {examplePrompts.map(({ value, label }) => (
                <RoundedButton
                  onClick={() => setInformation(value)}
                  key={label}>
                  {label} ↗️
                </RoundedButton>
              ))}
            </div>

            {!loading && text && (
              <Button
                className="h-9 text-sm"
                outlined
                disabled={loading}
                onClick={() => {
                  setText(slidesSample);
                  setInformation('');
                }}>
                <PiArrowsCounterClockwise className="mr-2" />
                最初からやり直す
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">スライドプレビュー</h3>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2"
            outlined>
            <PiDownload className="h-5 w-5" />
            パワーポイント形式でダウンロード
          </Button>
        </div>

        <div className="flex gap-2">
          <div
            className={`mt-2 rounded border border-black/30 ${
              showCode ? 'w-1/2' : 'w-full'
            }`}>
            <SlidePreview
              markdown={text}
              className={showCode ? 'h-[700px]' : 'h-[700px]'}
              onSlideReady={handleSlideReady}
            />
          </div>

          {showCode && (
            <textarea
              className="mt-2 h-[700px] w-1/2 whitespace-pre-wrap break-words rounded border border-black/30 p-1.5 font-mono text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateSlidePage;
