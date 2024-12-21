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

const slidesSample = `<!-- .slide: data-background-image="https://images.pexels.com/photos/316466/pexels-photo-316466.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" -->

# Gen Deck


生成 AI でスライドを作成しよう

---

## 使い方

|No|手順|
|--|--|
|1| 入力フォームにスライドの内容を指示 <ul><li>「新商品のプレゼン資料を作って」</li><li>「自己紹介スライドを作って」etc...</li></ul>|
|2| AIがスライドを生成|
|3| 必要に応じて編集|

---
<!-- style="display: flex; flex-direction: column; align-items: center; justify-content: center;" -->
<h3>画像も表示できます</h3>
<img style="height: 30%" src="https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" />

---

## コード表示も可能 ✍️

\`\`\`javascript
const greet = () => {
  console.log('Hello, World!');
}
\`\`\`

---
<!-- .slide: data-background-image="https://images.pexels.com/photos/8386487/pexels-photo-8386487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" style="color: white"-->

<h2 style="color: white">さあ、はじめよう！</h2>
<ul>
  <li>サンプルプロンプトを試す</li>
  <li>自分でプロンプトを書く</li>
  <li>生成されたスライドを編集する</li>  
</ul>
`;

const examplePrompts = [
  {
    label: 'AWS の紹介',
    value:
      'AWS の良さを熱く語るスライドを作成してください。クラウドコンピューティングの未来も含めて、エモーショナルな表現で魅力を伝えてください。',
  },
  {
    label: 'AWS Lambda 入門',
    value: `「AWS Lambda で始めるサーバーレス開発」というタイトルで、AWS Lambda の入門者向けプレゼンテーションを作成してください。
1. Lambda の基本概念と利点
2. 簡単なNode.jsのコード例
3. 主要な制限値（クォータ）を表形式で
4. ユースケース例`,
  },
  {
    label: 'プロジェクト管理入門',
    value: `効果的なプロジェクト管理の基礎に関するプレゼンテーションを作成してください。
以下の内容を含めてください：
- プロジェクト管理の重要性
- 主要なプロジェクト管理手法（ウォーターフォール、アジャイルなど）
- タスク管理とガントチャートの例
- コミュニケーション戦略
- リスク管理の基本

タイトル: プロジェクト成功への道：効果的な管理の秘訣`,
  },
  {
    label: '働き方改革',
    value:
      '日本企業における働き方改革の現状と課題についてのスライドを作成してください。統計データやグラフを用いて、テレワークの普及率、残業時間の推移、従業員満足度などを示し、今後の展望も含めてください。',
  },
  {
    label: 'ストレス管理とメンタルヘルス',
    value:
      'オフィスワーカーのためのストレス管理とメンタルヘルスケアに関するスライドを作成してください。ストレスの原因、症状、対処法を説明し、職場でのメンタルヘルス対策や、ワークライフバランスの重要性について触れてください。簡単な瞑想やデスクでできるストレッチなども含めてください。',
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
    getCurrentSystemContext,
  } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;
  const [showCode, setShowCode] = React.useState(false);

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
  }, []);

  const systemPrompt = getCurrentSystemContext();
  const getGeneratedText = (information: string) => {
    postChat(`${systemPrompt}\n\n${information}`, false);
  };

  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setText(_response.trim());
  }, [messages, setText, loading]);

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

          <div className="mt-4 flex justify-between">
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

        <div className="mb-8 mt-2 grid grid-cols-3 gap-2">
          <div className={`${showCode ? 'col-span-2' : 'col-span-3'}`}>
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="border-aws-sky size-6 animate-spin rounded-full border-4 border-t-transparent"></div>
              </div>
            ) : (
              <SlidePreview
                text={text}
                mode="markdown"
                className={'aspect-video rounded border border-black/30'}
                onSlideReady={handleSlideReady}
              />
            )}
          </div>

          {showCode && (
            <div className={`${showCode ? 'col-span-1' : 'col-span-0'}`}>
              <textarea
                className="h-full w-full whitespace-pre-wrap break-words rounded border border-black/30 p-1.5 font-mono text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateSlidePage;
