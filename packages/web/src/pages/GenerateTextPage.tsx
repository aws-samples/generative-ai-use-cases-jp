import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import Markdown from '../components/Markdown';
import ButtonCopy from '../components/ButtonCopy';
import useChat from '../hooks/useChat';
import { create } from 'zustand';
import { generateTextPrompt } from '../prompts';

type StateType = {
  information: string;
  setInformation: (s: string) => void;
  context: string;
  setContext: (s: string) => void;
  text: string;
  setText: (s: string) => void;
  clear: () => void;
};

const useGenerateTextPageState = create<StateType>((set) => {
  const INIT_STATE = {
    information: '',
    context: '',
    text: '',
  };
  return {
    ...INIT_STATE,
    setInformation: (s: string) => {
      set(() => ({
        information: s,
      }));
    },
    setContext: (s: string) => {
      set(() => ({
        context: s,
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

const GenerateTextPage: React.FC = () => {
  const {
    information,
    setInformation,
    context,
    setContext,
    text,
    setText,
    clear,
  } = useGenerateTextPageState();
  const { state, pathname } = useLocation();
  const { loading, messages, postChat, clear: clearChat } = useChat(pathname);

  const disabledExec = useMemo(() => {
    return information === '' || loading;
  }, [information, loading]);

  useEffect(() => {
    if (state !== null) {
      setInformation(state.information);
      setContext(state.context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const getGeneratedText = (information: string, context: string) => {
    postChat(
      generateTextPrompt({
        information,
        context,
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
    setText(_response.replace(/(<output>|<\/output>)/g, '').trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 要約を実行
  const onClickExec = useCallback(() => {
    if (loading) return;
    getGeneratedText(information, context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [information, context, loading]);

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    clearChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-12">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        문장생성
      </div>
      <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-10 xl:col-start-2">
        <Card label="문장 원문">
          <Textarea
            placeholder="입력해주세요"
            value={information}
            onChange={setInformation}
            maxHeight={-1}
          />

          <Textarea
            placeholder="장의 형식을 지시해 주세요.(마크다운,블로그,비즈니스메일등)"
            value={context}
            onChange={setContext}
          />

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={disabledExec}>
              지우기
            </Button>

            <Button disabled={disabledExec} onClick={onClickExec}>
              실행
            </Button>
          </div>

          <div className="mt-5 rounded border border-black/30 p-1.5">
            <Markdown>{text}</Markdown>
            {!loading && text === '' && (
              <div className="text-gray-500">
                생성된 문장이 여기에 표시됩니다.
              </div>
            )}
            {loading && (
              <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}
            <div className="flex w-full justify-end">
              <ButtonCopy text={text}></ButtonCopy>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateTextPage;
