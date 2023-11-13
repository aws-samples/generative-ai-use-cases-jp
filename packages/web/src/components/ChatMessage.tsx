import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Markdown from './Markdown';
import ButtonCopy from './ButtonCopy';
import ButtonFeedback from './ButtonFeedback';
import { PiUserFill } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import useChat from '../hooks/useChat';

type Props = BaseProps & {
  chatContent?: ShownMessage;
  loading?: boolean;
};

const ChatMessage: React.FC<Props> = (props) => {
  const chatContent = useMemo(() => {
    return props.chatContent;
  }, [props]);

  const { pathname } = useLocation();
  const { sendFeedback } = useChat(pathname);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const disabled = useMemo(() => {
    return isSendingFeedback || !props.chatContent?.id;
  }, [isSendingFeedback, props]);

  const onSendFeedback = async (feedback: string) => {
    if (!disabled) {
      setIsSendingFeedback(true);
      if (feedback !== chatContent?.feedback) {
        await sendFeedback(props.chatContent!.createdDate!, feedback);
      } else {
        await sendFeedback(props.chatContent!.createdDate!, 'none');
      }
      setIsSendingFeedback(false);
    }
  };

  return (
    <div
      className={`flex justify-center ${
        chatContent?.role === 'assistant' ? 'bg-gray-100/70' : ''
      }`}>
      <div
        className={`${
          props.className ?? ''
        } m-3 flex w-full flex-col justify-between md:w-11/12 lg:-ml-24 lg:w-4/6 lg:flex-row xl:w-3/6`}>
        <div className="flex">
          {chatContent?.role === 'user' && (
            <div className="bg-aws-sky h-min rounded p-2 text-xl text-white">
              <PiUserFill />
            </div>
          )}
          {chatContent?.role === 'assistant' && (
            <div className="bg-aws-ml h-min rounded p-1">
              <BedrockIcon className="h-7 w-7 fill-white" />
            </div>
          )}

          <div className="ml-5 grow ">
            {chatContent?.role === 'user' && (
              <div className="break-all">
                {chatContent.content.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {chatContent?.role === 'assistant' && (
              <Markdown>
                {chatContent.content +
                  `${
                    props.loading && (chatContent?.content ?? '') !== ''
                      ? '▍'
                      : ''
                  }`}
              </Markdown>
            )}
            {props.loading && (chatContent?.content ?? '') === '' && (
              <div className="animate-pulse">▍</div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-end print:hidden lg:-mr-24">
          {chatContent?.role === 'user' && <div className="lg:w-8"></div>}
          {chatContent?.role === 'assistant' && !props.loading && (
            <>
              <ButtonCopy
                className="mr-0.5 text-gray-400"
                text={chatContent.content}
              />
              {chatContent && (
                <>
                  <ButtonFeedback
                    className="mx-0.5"
                    feedback="good"
                    message={chatContent}
                    disabled={disabled}
                    onClick={() => {
                      onSendFeedback('good');
                    }}
                  />
                  <ButtonFeedback
                    className="ml-0.5"
                    feedback="bad"
                    message={chatContent}
                    disabled={disabled}
                    onClick={() => onSendFeedback('bad')}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
