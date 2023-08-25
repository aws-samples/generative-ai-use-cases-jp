import React, { useMemo } from 'react';
import Markdown from './Markdown';
import ButtonCopy from './ButtonCopy';
import ButtonFeedback from './ButtonFeedback';
import Tooltip from './Tooltip';
import { PiChatCircleDotsFill, PiUserFill } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import { ReactComponent as MLLogo } from '../assets/model.svg';

type Props = BaseProps & {
  chatContent?: ShownMessage;
  loading?: boolean;
};

const ChatMessage: React.FC<Props> = (props) => {
  const chatContent = useMemo(() => {
    if (props.loading) {
      return {
        role: 'assistant',
        content: '',
      };
    }
    return props.chatContent;
  }, [props]);

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
              <MLLogo className="h-7 w-7 fill-white" />
            </div>
          )}

          <div className="ml-5 grow ">
            {JSON.stringify(props.chatContent)}
            {chatContent?.role === 'user' && (
              <div className="break-all">
                {chatContent.content.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {chatContent?.role === 'assistant' && !props.loading && (
              <Markdown>{chatContent.content}</Markdown>
            )}
            {props.loading && (
              <div className="animate-pulse text-2xl text-gray-400">
                <PiChatCircleDotsFill />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-end lg:-mr-24">
          {chatContent?.role === 'user' && <div className="lg:w-8"></div>}
          {chatContent?.role === 'assistant' && !props.loading && (
            <>
              <ButtonCopy
                className="mr-0.5 text-gray-400"
                text={chatContent.content}
              />
              <Tooltip message="未実装です">
                <ButtonFeedback className="mx-0.5" good={true} />
              </Tooltip>
              <Tooltip message="未実装です">
                <ButtonFeedback className="ml-0.5" good={false} />
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
