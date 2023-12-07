import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import RowItem from '../components/RowItem';
import ExpandableField from '../components/ExpandableField';
import Textarea from '../components/Textarea';
import Markdown from '../components/Markdown';
import ButtonCopy from '../components/ButtonCopy';
import useChat from '../hooks/useChat';
import useChatApi from '../hooks/useChatApi';
import { create } from 'zustand';
import { webContentPrompt } from '../prompts';

type StateType = {
  url: string;
  setUrl: (s: string) => void;
  fetching: boolean;
  setFetching: (b: boolean) => void;
  text: string;
  setText: (s: string) => void;
  context: string;
  setContext: (s: string) => void;
  content: string;
  setContent: (s: string) => void;
  clear: () => void;
};

const useWebContentPageState = create<StateType>((set) => {
  const INIT_STATE = {
    url: '',
    fetching: false,
    text: '',
    context: '',
    content: '',
  };
  return {
    ...INIT_STATE,
    setUrl: (s: string) => {
      set(() => ({
        url: s,
      }));
    },
    setFetching: (b: boolean) => {
      set(() => ({
        fetching: b,
      }));
    },
    setText: (s: string) => {
      set(() => ({
        text: s,
      }));
    },
    setContext: (s: string) => {
      set(() => ({
        context: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const WebContent: React.FC = () => {
  const {
    url,
    setUrl,
    fetching,
    setFetching,
    text,
    setText,
    context,
    setContext,
    content,
    setContent,
    clear,
  } = useWebContentPageState();

  const { state, pathname } = useLocation();
  const { loading, messages, postChat, clear: clearChat } = useChat(pathname);
  const { getWebText } = useChatApi();

  const disabledExec = useMemo(() => {
    return url === '' || loading || fetching;
  }, [url, loading, fetching]);

  useEffect(() => {
    if (state !== null) {
      setUrl(state.url);
      setContext(state.context);
    }
  }, [state, setUrl, setContext]);

  const getContent = useCallback(
    (text: string, context: string) => {
      postChat(
        webContentPrompt({
          text,
          context,
        }),
        true
      );
    },
    [postChat]
  );

  const onClickExec = useCallback(async () => {
    if (loading || fetching) return;
    setContent('');
    setFetching(true);

    const res = await getWebText({ url });
    setFetching(false);

    const text = res.data.text;
    setText(text);
    getContent(text, context);
  }, [
    url,
    context,
    loading,
    fetching,
    setContent,
    setFetching,
    setText,
    getContent,
    getWebText,
  ]);

  useEffect(() => {
    if (messages.length === 0) return;
    const _lastMessage = messages[messages.length - 1];
    if (_lastMessage.role !== 'assistant') return;
    const _response = messages[messages.length - 1].content;
    setContent(_response.replace(/(<output>|<\/output>)/g, '').trim());
  }, [messages, setContent]);

  const onClickClear = useCallback(() => {
    clear();
    clearChat();
  }, [clear, clearChat]);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
        Web コンテンツ抽出
      </div>

      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="コンテンツを抽出したい Web ページ">
          <RowItem>
            <input
              type="text"
              className="w-full rounded border border-black/30 p-1.5 outline-none"
              placeholder="URL を入力してください"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
              }}
            />
          </RowItem>

          <ExpandableField label="追加コンテキスト" optional>
            <Textarea
              placeholder="追加で考慮してほしい点を入力することができます（例: マークダウンで章立てして）"
              value={context}
              onChange={setContext}
            />
          </ExpandableField>

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={disabledExec}>
              クリア
            </Button>

            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
          </div>

          <ExpandableField
            label={`抽出前のテキスト (${
              fetching ? '読み込み中...' : text === '' ? '未取得' : '取得済'
            })`}>
            <div className="rounded border border-black/30 p-1.5">
              {text === '' && (
                <div className="text-gray-500">
                  未取得です。URL を入力して実行ボタンを押してください。
                </div>
              )}
              {text}
              <div className="flex w-full justify-end">
                <ButtonCopy text={text}></ButtonCopy>
              </div>
            </div>
          </ExpandableField>

          <div className="rounded border border-black/30 p-1.5">
            <Markdown>{content}</Markdown>
            {!loading && content === '' && (
              <div className="text-gray-500">
                抽出された文章がここに表示されます
              </div>
            )}
            {loading && (
              <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}
            <div className="flex w-full justify-end">
              <ButtonCopy text={content}></ButtonCopy>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WebContent;
