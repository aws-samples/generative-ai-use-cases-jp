import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useChatApi from '../hooks/useChatApi';
import ChatMessage from '../components/ChatMessage';
import BedrockIcon from '../assets/bedrock.svg?react';

const SharedChatPage: React.FC = () => {
  const { shareId } = useParams();
  const { getSharedChat } = useChatApi();
  const { data: chatAndMessages, isLoading, error } = getSharedChat(shareId!);

  const title = useMemo(() => {
    if (chatAndMessages) {
      return chatAndMessages.chat.title;
    } else {
      return '';
    }
  }, [chatAndMessages]);

  const rawMessages = useMemo(() => {
    if (chatAndMessages) {
      return chatAndMessages.messages;
    } else {
      return [];
    }
  }, [chatAndMessages]);

  const messages = useMemo(() => {
    return rawMessages.filter((message) => message.role !== 'system');
  }, [rawMessages]);

  const [showSystemContext, setShowSystemContext] = useState(false);

  const showingMessages = useMemo(() => {
    if (showSystemContext) {
      return rawMessages;
    } else {
      return messages;
    }
  }, [showSystemContext, rawMessages, messages]);

  return (
    <>
      <div className="relative">
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          {title}
        </div>

        {isLoading && (
          <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <BedrockIcon className="animate-pulse fill-gray-400" />
          </div>
        )}

        {!isLoading && chatAndMessages && (
          <>
            <div className="my-2 flex justify-end pr-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  value=""
                  className="peer sr-only"
                  checked={showSystemContext}
                  onChange={() => {
                    setShowSystemContext(!showSystemContext);
                  }}
                />
                <div className="peer-checked:bg-aws-smile peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
                <span className="ml-1 text-xs font-medium">
                  システムコンテキストの表示
                </span>
              </label>
            </div>

            {showingMessages.map((chat, idx) => (
              <div key={showSystemContext ? idx : idx + 1}>
                {idx === 0 && (
                  <div className="w-full border-b border-gray-300"></div>
                )}
                <ChatMessage
                  chatContent={chat}
                  loading={isLoading && idx === showingMessages.length - 1}
                  hideFeedback={true}
                />
                <div className="w-full border-b border-gray-300"></div>
              </div>
            ))}
          </>
        )}

        {!isLoading && error && (
          <div className="flex h-[calc(100vh-13rem)] flex-col items-center justify-center text-lg font-bold">
            Error {error.response.status}
            {error.response.status === 404 ? (
              <div className="mt-2 text-sm">
                ページが見つかりませんでした。会話履歴がシェアされていないか、削除された可能性があります。
              </div>
            ) : (
              <div className="mt-2 text-sm">管理者に問い合わせてください。</div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SharedChatPage;
