import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Location, useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useConversation from '../hooks/useConversation';
import ChatMessage from '../components/ChatMessage';
import PromptList from '../components/PromptList';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import ButtonIcon from '../components/ButtonIcon';
import useScroll from '../hooks/useScroll';
import { PiX, PiNotePencil, PiRobot } from 'react-icons/pi';
import { create } from 'zustand';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import { ChatPageLocationState } from '../@types/navigate';
import { SelectField } from '@aws-amplify/ui-react';
import { MODELS } from '../hooks/useModel';

type StateType = {
  modelId: string;
  content: string;
  inputSystemContext: string;
  setModelId: (c: string) => void;
  setContent: (c: string) => void;
  setInputSystemContext: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    modelId: '',
    content: '',
    inputSystemContext: '',
    setModelId: (s: string) => {
      set(() => ({
        modelId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    setInputSystemContext: (s: string) => {
      set(() => ({
        inputSystemContext: s,
      }));
    },
  };
});

const ChatPage: React.FC = () => {
  const {
    modelId,
    content,
    inputSystemContext,
    setModelId,
    setContent,
    setInputSystemContext,
  } = useChatPageState();
  const { state, pathname } = useLocation() as Location<ChatPageLocationState>;
  const { chatId } = useParams();

  const {
    loading,
    loadingMessages,
    isEmpty,
    messages,
    rawMessages,
    clear,
    postChat,
    updateSystemContext,
    getCurrentSystemContext,
  } = useChat(pathname, chatId);
  const { scrollToBottom, scrollToTop } = useScroll();
  const { getConversationTitle } = useConversation();
  const { modelIds: availableModels, textModels } = MODELS;

  const title = useMemo(() => {
    if (chatId) {
      return getConversationTitle(chatId) || 'チャット';
    } else {
      return 'チャット';
    }
  }, [chatId, getConversationTitle]);

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);

      if (state.systemContext !== '') {
        updateSystemContext(state.systemContext);
      }
    }
  }, [state, setContent, updateSystemContext]);

  useEffect(() => {
    if (!modelId) {
      setModelId(availableModels[0]);
    }
  }, [modelId, availableModels, setModelId]);

  const onSend = useCallback(() => {
    postChat(
      content,
      false,
      textModels.find((m) => m.modelId === modelId)
    );
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, content]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const [showSystemContext, setShowSystemContext] = useState(false);

  const showingMessages = useMemo(() => {
    if (showSystemContext) {
      return rawMessages;
    } else {
      return messages;
    }
  }, [showSystemContext, rawMessages, messages]);

  const [showSystemContextModal, setShowSystemContextModal] = useState(false);

  const currentSystemContext = useMemo(() => {
    const systemContext = getCurrentSystemContext();
    return systemContext;
  }, [getCurrentSystemContext]);

  useEffect(() => {
    setInputSystemContext(currentSystemContext);
  }, [currentSystemContext, setInputSystemContext]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold print:visible print:my-5 print:h-min lg:visible lg:my-5 lg:h-min">
          {title}
        </div>

        <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
          <SelectField
            label="モデル"
            labelHidden
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectField>
        </div>

        {loadingMessages && chatId && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <BedrockIcon className="animate-pulse fill-gray-400" />
          </div>
        )}

        {isEmpty && !loadingMessages && !chatId && !showSystemContextModal && (
          <>
            <div className="flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
              <div className="flex w-3/4 flex-col items-center justify-center text-gray-500 lg:w-1/2">
                <div className="mb-2 flex items-center text-sm font-bold">
                  <PiRobot className="mr-1 text-base" />
                  システムコンテキスト
                </div>
                <div className="mb-4 max-h-64 w-full overflow-y-scroll whitespace-break-spaces text-center">
                  {currentSystemContext}
                </div>
              </div>
              <Button
                className=""
                onClick={() => {
                  setShowSystemContextModal(true);
                }}
                outlined>
                <PiNotePencil className="mr-1" />
                変更
              </Button>
            </div>
          </>
        )}

        {isEmpty && !loadingMessages && !chatId && showSystemContextModal && (
          <>
            <div
              className="fixed left-0 top-0 z-[60] h-screen w-screen bg-gray-900/90"
              onClick={() => {
                setShowSystemContextModal(false);
              }}></div>
            <div className="h-[calc(100vh-9rem)] w-full">
              <div className="absolute left-1/2 top-1/2 z-[70] flex w-3/4 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 bg-white p-4 shadow-lg lg:w-1/2">
                <div className="mb-3 flex w-full items-center justify-between">
                  <div></div>
                  <div className="text-sm font-bold lg:text-lg">
                    システムコンテキストの設定
                  </div>
                  <ButtonIcon
                    onClick={() => {
                      setShowSystemContextModal(false);
                    }}>
                    <PiX />
                  </ButtonIcon>
                </div>
                <div className="w-full">
                  <Textarea
                    value={inputSystemContext}
                    onChange={setInputSystemContext}
                    rows={5}
                  />
                </div>
                <div className="flex w-full justify-end">
                  <Button
                    className="mr-1"
                    onClick={() => {
                      clear();
                      setInputSystemContext(currentSystemContext);
                      setShowSystemContextModal(false);
                    }}
                    outlined>
                    初期化
                  </Button>
                  <Button
                    onClick={() => {
                      updateSystemContext(inputSystemContext);
                      setShowSystemContextModal(false);
                    }}
                    disabled={inputSystemContext === currentSystemContext}>
                    変更
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {!isEmpty && !loadingMessages && (
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
              <div className="peer-checked:bg-aws-smile peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
              <span className="ml-1 text-xs font-medium">
                システムコンテキストの表示
              </span>
            </label>
          </div>
        )}

        {!isEmpty &&
          showingMessages.map((chat, idx) => (
            <div key={idx}>
              {idx === 0 && (
                <div className="w-full border-b border-gray-300"></div>
              )}
              <ChatMessage
                chatContent={chat}
                loading={loading && idx === showingMessages.length - 1}
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}

        <div className="fixed bottom-0 z-0 flex w-full items-end justify-center print:hidden lg:pr-64">
          <InputChatContent
            content={content}
            disabled={loading}
            onChangeContent={setContent}
            resetDisabled={!!chatId}
            onSend={() => {
              onSend();
            }}
            onReset={onReset}
          />
        </div>
      </div>

      {isEmpty && <PromptList />}
    </>
  );
};

export default ChatPage;
