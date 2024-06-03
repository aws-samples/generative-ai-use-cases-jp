import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../../components/Card';
import Select from '../../components/Select';
import useChat from '../../hooks/useChat';
import { create } from 'zustand';
import { GenerateTextPageQueryParams } from '../../@types/navigate';
import { MODELS } from '../../hooks/useModel';
import { getPrompter } from '../../prompts';
import queryString from 'query-string';
import InputChatContent from '../../components/InputChatContent';
import { Marp, MarpRenderedSlide } from '@marp-team/marp-react';
import Switch from '../../components/Switch';
import Button from '../../components/Button';
import { PiArrowsCounterClockwise } from 'react-icons/pi';

type StateType = {
  information: string;
  setInformation: (s: string) => void;
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

const slidesSample = `---
theme: gaia
_class: lead
paginate: true
backgroundColor: #fff
backgroundImage: url('https://marp.app/assets/hero-background.svg')
---

# Gen Deck

### 生成AIにスライドをつくってもらおう

powerd by Amazon Bedrock ♡ Marp

---

## 入力フォームから作りたいスライドを文章で指示します

以下の様な指示をしてみてください。
- 「今度の新作商品のプレゼンに使うスライドを作って」
- 「私は田中太郎です。趣味は釣りです。自己紹介スライドを１枚にまとめて」

---

## コードも書けます

\`\`\`js
const greet = () => {
  console.log('Hello, World!');
}
\`\`\`
  `;

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

const customRenderer = (slides: MarpRenderedSlide[]) => (
  <div className="flex flex-col gap-4 overflow-y-auto p-4">
    {slides.map(({ slide, comments }, i: React.Key | null | undefined) => (
      <div className="min-w-full border" key={i}>
        {slide}
        {comments.map((comment, ci) => (
          <p key={ci}>{comment}</p>
        ))}
      </div>
    ))}
  </div>
);

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
  const modelId = getModelId();
  const prompter = useMemo(() => getPrompter(modelId), [modelId]);
  const [showCode, setShowCode] = React.useState(false);

  useEffect(() => {
    updateSystemContextByModel();
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    if (search !== '') {
      const params = queryString.parse(search) as GenerateTextPageQueryParams;
      setInformation(params.information ?? '');

      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInformation, modelId, availableModels, search]);

  const getGeneratedText = (information: string) => {
    postChat(
      prompter.generateDeckPrompt({
        information,
      }),
      true
    );
  };

  // リアルタイムにレスポンスを表示
  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setText(_response.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 要約を実行
  const onClickExecGenerateDeck = useCallback(() => {
    if (loading) return;
    getGeneratedText(information);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [information, loading]);

  const examplePrompts = [
    {
      label: 'AWS の紹介',
      value:
        'AWS の良さを熱く語るスライドを8枚にまとめてください。タイトルはエモい感じでお願いします。',
    },
    {
      label: 'AWS Lambda でプログラミング！',
      value: `AWS Lambda で Node.js ランタイムを使って、API の処理を実装したいです。
コード例を交えて説明するスライドを10枚にまとめてください。タイトルは以下の通りでお願いします。
スライドを読んだ人がワクワクするように意識してください。表形式で AWS Lambda のクォータに関しても補足してください。

タイトル: AWS Lambda で API を作ろう`,
    },
    {
      label: '半導体市場の動向',
      value:
        '半導体市場の動向について、現状分析と将来予測を行い、10枚のスライドにまとめてください。表形式で数値的エビデンスも提示してください。',
    },
    {
      label: 'アウトラインから作る',
      value:
        '以下は発表する内容を簡単に記載した骨子です。この内容をスライドにしてください。\n<<ここに文章を入力する>>',
    },
    {
      label: 'ブログをスライドにまとめる',
      value:
        'このブログを10枚のスライドにまとめてください。\n<<ここに文章を入力する>>',
    },
  ];

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        スライド生成
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="スライドの元になる情報">
          <div className="mb-2 flex w-full content-center justify-between">
            <Select
              value={modelId}
              onChange={setModelId}
              options={availableModels.map((m) => {
                return { value: m, label: m };
              })}
            />

            <button onClick={() => setShowCode((status) => !status)}></button>
            <Switch
              label="Markdown テキストを表示する"
              checked={showCode}
              onSwitch={setShowCode}
            />
          </div>

          <InputChatContent
            onSend={onClickExecGenerateDeck}
            placeholder="出力したいスライドに関する情報を入力"
            disabled={loading}
            loading={loading}
            fullWidth={true}
            disableMarginBottom={true}
            hideReset={true}
            content={information}
            onChangeContent={setInformation}
          />

          {/* Recommended Button Container */}
          <div className="mb-2 mt-4 flex justify-between">
            <div className="mb-2 flex gap-2">
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

        {/* 1/2 half window */}
        <div className="flex gap-2">
          {/* Deck Viewer */}

          <div
            className={`mt-5 rounded border border-black/30 ${showCode ? 'w-1/2' : 'w-full'}`}>
            <Marp markdown={text} render={customRenderer} />
          </div>

          {/* Markdown Editor */}
          <textarea
            className={`mt-5 whitespace-pre-wrap break-words rounded border border-black/30 p-1.5 ${showCode ? 'w-1/2' : 'hidden'}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default GenerateSlidePage;
