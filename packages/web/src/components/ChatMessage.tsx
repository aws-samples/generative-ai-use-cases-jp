import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Markdown from './Markdown';
import ButtonCopy from './ButtonCopy';
import ButtonFeedback from './ButtonFeedback';
import ZoomUpImage from './ZoomUpImage';
import { PiUserFill, PiChalkboardTeacher } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import useChat from '../hooks/useChat';
import useTyping from '../hooks/useTyping';
import useFileApi from '../hooks/useFileApi';

type Props = BaseProps & {
  idx?: number;
  chatContent?: ShownMessage;
  loading?: boolean;
  hideFeedback?: boolean;
};

const ChatMessage: React.FC<Props> = (props) => {
  const chatContent = useMemo(() => {
    return props.chatContent;
  }, [props]);

  const { pathname } = useLocation();
  const { sendFeedback } = useChat(pathname);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const { getDocDownloadSignedUrl } = useFileApi();

  const { setTypingTextInput, typingTextOutput } = useTyping(
    chatContent?.role === 'assistant' && props.loading
  );

  useEffect(() => {
    if (chatContent?.content) {
      setTypingTextInput(chatContent?.content);
    }
  }, [chatContent, setTypingTextInput]);

  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (chatContent?.extraData) {
      Promise.all(
        chatContent.extraData.map(async (file) => {
          return await getDocDownloadSignedUrl(file.source.data);
        })
      ).then((results) => setSignedUrls(results));
    } else {
      setSignedUrls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatContent]);

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
        chatContent?.role === 'assistant' || chatContent?.role === 'system'
          ? 'bg-gray-100/70'
          : ''
      }`}>
      <div
        className={`${
          props.className ?? ''
        } m-3 flex w-full flex-col justify-between md:w-11/12 lg:-ml-24 lg:w-4/6 lg:flex-row xl:w-3/6`}>
        <div className="flex grow">
          {chatContent?.role === 'user' && (
            <div className="bg-aws-sky h-min rounded p-2 text-xl text-white">
              <PiUserFill />
            </div>
          )}
          {chatContent?.role === 'assistant' && (
            <div className="bg-aws-ml h-min rounded p-1">
              <BedrockIcon className="size-7 fill-white" />
            </div>
          )}
          {chatContent?.role === 'system' && (
            <div className="bg-aws-sky h-min rounded p-2 text-xl text-white">
              <PiChalkboardTeacher />
            </div>
          )}

          <div className="ml-5 grow ">
            {chatContent?.role === 'user' && (
              <div className="break-all">
                {signedUrls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {signedUrls.map((url) => (
                      <ZoomUpImage key={url} src={url} size={32} />
                    ))}
                  </div>
                )}
                {typingTextOutput.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {chatContent?.role === 'assistant' && (
              <Markdown prefix={`${props.idx}`}>
                {typingTextOutput +
                  `${
                    props.loading && (chatContent?.content ?? '') !== ''
                      ? '▍'
                      : ''
                  }`}
              </Markdown>
            )}
            {chatContent?.role === 'system' && (
              <div className="break-all">
                {typingTextOutput.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {props.loading && (chatContent?.content ?? '') === '' && (
              <div className="animate-pulse">▍</div>
            )}

            {chatContent?.role === 'assistant' && (
              <div className="mb-1 mt-2 text-right text-xs text-gray-400 lg:mb-0">
                {chatContent?.llmType}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-end lg:-mr-24 print:hidden">
          {(chatContent?.role === 'user' || chatContent?.role === 'system') && (
            <div className="lg:w-8"></div>
          )}
          {chatContent?.role === 'assistant' &&
            !props.loading &&
            !props.hideFeedback && (
              <>
                <ButtonCopy
                  className="mr-0.5 text-gray-400"
                  text={chatContent?.content || ''}
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
