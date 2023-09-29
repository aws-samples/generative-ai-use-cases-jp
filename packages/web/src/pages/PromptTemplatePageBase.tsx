import React, { useCallback, useEffect } from 'react';
import { BaseProps } from '../@types/common';
import useChat from '../hooks/useChat';
import Card from '../components/Card';
import Markdown from '../components/Markdown';
import InputChatContent from '../components/InputChatContent';
import ButtonCopy from '../components/ButtonCopy';
import ButtonFeedback from '../components/ButtonFeedback';
import Tooltip from '../components/Tooltip';
import useScroll from '../hooks/useScroll';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';

type Props = BaseProps & {
  title: string;
  systemContext: string;
  inputPromptComponent?: React.ReactNode;
  children: React.ReactNode;
};

type StateType = {
  content: {
    [pathname: string]: string;
  };
  setContent: (pathname: string, s: string) => void;
};

const usePromptTemplatePageBaseState = create<StateType>((set) => {
  return {
    content: {},
    setContent: (pathname: string, s: string) => {
      set((state) => ({
        content: {
          ...state.content,
          [pathname]: s,
        },
      }));
    },
  };
});

const PromptTemplatePageBase: React.FC<Props> = (props) => {
  const { pathname } = useLocation();
  const { loading, messages, clearChats, postChat } = useChat(
    pathname,
    props.systemContext
  );
  const { scrollToBottom, scrollToTop } = useScroll();

  const { content, setContent } = usePromptTemplatePageBaseState((state) => ({
    content: state.content[pathname] ?? '',
    setContent: state.setContent,
  }));

  const onSend = useCallback(() => {
    postChat(content);
    setContent(pathname, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const onReset = useCallback(() => {
    clearChats(props.systemContext);
    setContent(pathname, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.systemContext, pathname]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div
      className={`${props.className ?? ''} flex flex-col ${
        messages.length > 1 ? 'pb-32' : 'pb-16'
      }`}>
      <div className="grid grid-cols-12">
        <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
          {props.title}
        </div>

        <div className="col-span-12 col-start-1 mx-2 lg:col-span-10 lg:col-start-2 xl:col-span-8 xl:col-start-3">
          {props.children}
        </div>

        {messages.map((message, idx) => (
          <div
            key={idx}
            className="col-span-12 col-start-1 lg:col-span-10 lg:col-start-2 xl:col-span-8 xl:col-start-3 ">
            {idx > 0 && (
              <Card
                className={`mx-2 mt-3 ${
                  message.role === 'assistant' ? 'bg-gray-100/70' : ''
                }`}
                label={message.role === 'user' ? 'あなた' : 'AIアシスタント'}>
                {message.role === 'user' ? (
                  <div className="break-all">
                    {message.content.split('\n').map((c, jdx) => (
                      <div key={jdx}>{c}</div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Markdown>
                      {message.content +
                        `${
                          loading &&
                          idx === messages.length - 1 &&
                          messages[idx].content !== ''
                            ? '▍'
                            : ''
                        }`}
                    </Markdown>
                    {loading &&
                      message.role === 'assistant' &&
                      idx === messages.length - 1 &&
                      messages[idx].content === '' && (
                        <div className="animate-pulse text-gray-700">▍</div>
                      )}
                    <div className="flex justify-end">
                      <ButtonCopy
                        className="mr-0.5 text-gray-400"
                        text={message.content}
                      />
                      <Tooltip message="未実装です">
                        <ButtonFeedback
                          className="mx-0.5"
                          message={message}
                          feedback="good"
                          onClick={() => {}}
                          disabled={false}
                        />
                      </Tooltip>
                      <Tooltip message="未実装です">
                        <ButtonFeedback
                          className="ml-0.5"
                          message={message}
                          feedback="bad"
                          onClick={() => {}}
                          disabled={false}
                        />
                      </Tooltip>
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
        ))}

        {messages.length > 1 && (
          <div className="absolute bottom-0 z-0 flex w-full justify-center">
            {props.inputPromptComponent ? (
              props.inputPromptComponent
            ) : (
              <InputChatContent
                content={content}
                placeholder="チャット形式で結果を改善していくことができます。"
                disabled={loading}
                onChangeContent={(c) => setContent(pathname, c)}
                onSend={() => {
                  onSend();
                }}
                onReset={() => {
                  onReset();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptTemplatePageBase;
