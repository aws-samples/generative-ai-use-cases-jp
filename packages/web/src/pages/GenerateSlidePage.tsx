import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Select from '../components/Select';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import { GenerateTextPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
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


### 生成 AI でスライドを作成しよう

---

## 使い方

|No|手順|
|--|--|
|1| 入力フォームにスライドの内容を指示 <ul><li>「新商品のプレゼン資料を作って」</li><li>「自己紹介スライドを作って」etc...</li></ul>|
|2| AIがスライドを生成|
|3| 必要に応じて編集|

---

<section style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
  <h3>画像も表示できます</h3>
  <img style="height: 30%" src="https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" />
</section>

---

## コード表示も可能 ✍️

\`\`\`javascript
const greet = () => {
  console.log('Hello, World!');
}
\`\`\`

---
<section data-background-image="https://images.pexels.com/photos/8386487/pexels-photo-8386487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" style="color: white">
<h2 style="color: white">さあ、はじめよう！</h2>
<ul>
  <li>サンプルプロンプトを試す</li>
  <li>自分でプロンプトを書く</li>
  <li>生成されたスライドを編集</li>  
</ul>
</section>
`;

const systemPrompt = `あなたは reveal.js でサポートされるプレゼンテーション資料を作成する専門家です。
以下の要件に従って、マークダウン形式、または HTML 形式を組み合わせてスライドを作成してください：
内容は専門家として適切に構造化し、聴衆を惹きつける魅力的な表現を心がけてください。

<rules>
1. 説明は一切不要です。\`\`\`yaml のような接頭語も一切不要です。Markdown のテキストだけ生成してください。
2. スライドの区切りには "---" を使用します
3. 各スライドの構成：
 - 明確な見出し
 - 簡潔な本文（1スライドあたり3〜4行程度）
 - 箇条書きや番号付きリストを効果的に使用
4. プレゼンテーションの基本原則：
 - 1枚のスライドにつき1つの主要メッセージ
 - 情報は簡潔に
 - 視覚的な階層構造を意識
5. テーブルレイアウトを記述する場合：
  - ヘッダーとボディの間の区切りは -- のように半角ハイフンを２つ並べてください。３つ以上にしてはいけません。これは絶対のルールです。
6. コードブロックを含める場合：
 - シンタックスハイライトのための言語指定を含める
 - コードは簡潔で理解しやすいものに
7. 画像を含める場合：
 - 画像は pexels から適当なものを参照してください。指定があればそれ以外から参照することも可能です。
 - 画像はスライド全体の 3 割程度に含めてください。
8. グラフの表示は行いません。\`\`\`mermaid のような出力は不要です。
</rules>

<example>
# Gen Deck


### 生成 AI でスライドを作成しよう

---

## 使い方

|No|手順|
|--|--|
|1| 入力フォームにスライドの内容を指示 <ul><li>「新商品のプレゼン資料を作って」</li><li>「自己紹介スライドを作って」etc...</li></ul>|
|2| AIがスライドを生成|
|3| 必要に応じて編集|

---

<section style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
  <h3>画像も表示できます</h3>
  <img style="height: 30%" src="https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" />
</section>

---

## コード表示も可能 ✍️

\`\`\`javascript
const greet = () => {
  console.log('Hello, World!');
}
\`\`\`

---
<section data-background-image="https://images.pexels.com/photos/8386487/pexels-photo-8386487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" style="color: white">
<h2 style="color: white">さあ、はじめよう！</h2>
<ul>
  <li>サンプルプロンプトを試す</li>
  <li>自分でプロンプトを書く</li>
  <li>生成されたスライドを編集</li>  
</ul>
</section>
`;

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

  const getGeneratedText = (information: string) => {
    postChat(`${systemPrompt}\n\n${information}`, false);
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
            {loading ? (
              <div className="flex h-[700px] items-center justify-center">
                <div className="border-aws-sky size-6 animate-spin rounded-full border-4 border-t-transparent"></div>
              </div>
            ) : (
              <SlidePreview
                text={text}
                mode="markdown"
                className={'h-[700px]'}
                onSlideReady={handleSlideReady}
              />
            )}
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
