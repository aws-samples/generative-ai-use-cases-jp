import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import usePromptFlowChat from '../hooks/usePromptFlowChat';
import ChatMessage from '../components/ChatMessage';
import Select from '../components/Select';
import useScroll from '../hooks/useScroll';
import { create } from 'zustand';
import BedrockIcon from '../assets/bedrock.svg?react';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const usePromptFlowChatPageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const PromptFlowChatPage: React.FC = () => {
  const { content, setContent } = usePromptFlowChatPageState();
  const { chatId } = useParams();

  const {
    messages,
    loading,
    error,
    flow,
    availableFlows,
    sendMessage,
    setFlow,
    clear: clearChat,
  } = usePromptFlowChat();

  const { scrollableContainer, scrolledAnchor, setFollowing } = useScroll();

  useEffect(() => {
    console.log(availableFlows);
    setFlow(availableFlows[0]);
  }, [availableFlows, setFlow]);

  const onSend = useCallback(() => {
    setFollowing(true);
    sendMessage(content);
    setContent('');
  }, [content, setFollowing, sendMessage, setContent]);

  const onReset = useCallback(() => {
    clearChat();
    setContent('');
  }, [clearChat, setContent]);

  const isEmpty = messages.length === 0;

  return (
    <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        Prompt Flow チャット
      </div>

      <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
        <Select
          value={flow?.flowId || ''}
          onChange={(id: string) =>
            setFlow(availableFlows.find((f) => f.flowId === id)!)
          }
          options={availableFlows.map((flow) => ({
            value: flow.flowId,
            label: flow.flowName,
          }))}
        />
      </div>

      {isEmpty && !loading && (
        <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
          <BedrockIcon
            className={`fill-gray-400 ${loading ? 'animate-pulse' : ''}`}
          />
        </div>
      )}

      <div ref={scrollableContainer}>
        {!isEmpty &&
          messages.map((message, idx) => (
            <div key={message.id}>
              {idx === 0 && (
                <div className="w-full border-b border-gray-300"></div>
              )}
              <ChatMessage
                chatContent={message}
                loading={loading && idx === messages.length - 1}
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}
      </div>
      <div ref={scrolledAnchor} />

      <div className="fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden">
        <InputChatContent
          content={content}
          description={flow?.description}
          disabled={loading}
          onChangeContent={setContent}
          resetDisabled={!!chatId}
          onSend={onSend}
          onReset={onReset}
          fileUpload={false}
        />
      </div>

      {error && (
        <div className="fixed bottom-20 left-0 right-0 z-10 mx-auto w-3/4 rounded-md bg-red-100 p-4 text-center text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default PromptFlowChatPage;