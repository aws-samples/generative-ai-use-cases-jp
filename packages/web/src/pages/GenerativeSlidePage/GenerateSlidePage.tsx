import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../../components/Card';
import Select from '../../components/Select';
import useChat from '../../hooks/useChat';
import { create } from 'zustand';
import { GenerateTextPageQueryParams } from '../../@types/navigate';
import { MODELS } from '../../hooks/useModel';
import queryString from 'query-string';
import InputChatContent from '../../components/InputChatContent';
import Switch from '../../components/Switch';
import Button from '../../components/Button';
import SlidePreview from '../../components/SlidePreview';
import { PiArrowsCounterClockwise, PiDownload, PiCode } from 'react-icons/pi';
import { PresentationConverter } from '../../utils/PresentationConverter';
import SlideMarkdownHelp from '../../components/SlideMarkdownHelp';
import { SlidePreviewKeyboardShortcutHelp } from '../../components/SlidePreviewKeyboardShortcutHelp';
import { useDebounce } from '../../hooks/useDebounce';
import { examplePrompts, slidesSample } from './constants';

type StateType = {
  information: string;
  setInformation: (s: string) => void;
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

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
  > & {
    small?: boolean;
  }
) => {
  const { small, ...rest } = props;
  return (
    <button
      className={`cursor-pointer rounded-full border p-2 hover:border-gray-300 hover:bg-gray-50 ${
        small ? 'text-xs' : 'text-sm'
      }`}
      {...rest}
    />
  );
};

const GenerateSlidePage: React.FC = () => {
  const { information, setInformation, text, setText } =
    useGenerateSlidePageState();

  const [inputText, setInputText] = useState(text);
  const debouncedText = useDebounce(inputText, 300);
  useEffect(() => {
    setText(debouncedText);
  }, [debouncedText]);

  const { pathname, search } = useLocation();
  const { getModelId, setModelId, loading, messages, postChat, isEmpty } =
    useChat(pathname);
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

  const getGeneratedText = (information: string) => {
    postChat(`${information}`);
  };

  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setInputText(_response.trim());
  }, [messages, setInputText, loading]);

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
      <div className="col-span-12 lg:col-span-10 lg:col-start-2">
        <Card label="スライドの元になる情報">
          <div className="mb-2 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-64">
              <Select
                value={getModelId()}
                onChange={setModelId}
                options={availableModels.map((m) => ({
                  value: m,
                  label: m,
                }))}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* 小さい画面ではアイコンボタン、大きい画面ではスイッチを表示 */}
              <div className="block lg:hidden">
                <RoundedButton onClick={() => setShowCode(!showCode)}>
                  <PiCode className={showCode ? 'text-blue-600' : ''} />
                </RoundedButton>
              </div>
              <div className="hidden lg:block">
                <Switch
                  label="Markdown テキストを表示"
                  checked={showCode}
                  onSwitch={setShowCode}
                />
              </div>
            </div>
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
            rows={5}
          />

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-bold text-gray-600">入力例：</div>
              {examplePrompts.map(({ value, label }) => (
                <RoundedButton
                  small
                  onClick={() => setInformation(value)}
                  key={label}>
                  {label}
                </RoundedButton>
              ))}
            </div>
            {!loading && !isEmpty && (
              <Button
                className="h-9 whitespace-nowrap text-sm"
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

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">スライドプレビュー</h3>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2 whitespace-nowrap"
            outlined>
            <PiDownload className="h-5 w-5" />
            <span className="hidden sm:inline">
              パワーポイント形式でダウンロード
            </span>
            <span className="sm:hidden">エクスポート</span>
          </Button>
        </div>

        <div className="mb-8 mt-2 grid gap-4 lg:grid-cols-3">
          <div
            className={`${showCode ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col gap-2`}>
            {loading ? (
              <div className="flex aspect-video h-full flex-col items-center justify-center gap-2 rounded border border-black/30">
                <div className="border-aws-sky size-6 animate-spin rounded-full border-4 border-t-transparent"></div>
                <span className="text-xs text-gray-500">
                  スライドのプレビューを生成中
                </span>
              </div>
            ) : (
              <SlidePreview
                text={text}
                mode="markdown"
                className="aspect-video rounded border border-black/30"
                onSlideReady={handleSlideReady}
              />
            )}

            {/* Help */}
            <SlidePreviewKeyboardShortcutHelp />
            <SlideMarkdownHelp />
          </div>

          {showCode && (
            <div className="lg:col-span-1">
              <textarea
                className="h-full min-h-[200px] w-full whitespace-pre-wrap break-words rounded border border-black/30 p-1.5 font-mono text-sm lg:h-full"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateSlidePage;
