import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useChatApi from '../hooks/useChatApi';
import useSystemContextApi from '../hooks/useSystemContextApi';
import useConversation from '../hooks/useConversation';
import ChatMessage from '../components/ChatMessage';
import PromptList from '../components/PromptList';
import Button from '../components/Button';
import ButtonCopy from '../components/ButtonCopy';
import ModalDialog from '../components/ModalDialog';
import Textarea from '../components/Textarea';
import ExpandableField from '../components/ExpandableField';
import Switch from '../components/Switch';
import Select from '../components/Select';
import useScroll from '../hooks/useScroll';
import { PiArrowClockwiseBold, PiShareFatFill } from 'react-icons/pi';
import { create } from 'zustand';
import BedrockIcon from '../assets/bedrock.svg?react';
import { ChatPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { getPrompter } from '../prompts';
import queryString from 'query-string';
import useFiles from '../hooks/useFiles';
import { SystemContext } from 'generative-ai-use-cases-jp';

type StateType = {
  content: string;
  inputSystemContext: string;
  saveSystemContext: string;
  saveSystemContextTitle: string;
  setContent: (c: string) => void;
  setInputSystemContext: (c: string) => void;
  setSaveSystemContext: (c: string) => void;
  setSaveSystemContextTitle: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    content: '',
    inputSystemContext: '',
    saveSystemContext: '',
    saveSystemContextTitle: '',
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
    setSaveSystemContext: (s: string) => {
      set(() => ({
        saveSystemContext: s,
      }));
    },
    setSaveSystemContextTitle: (s: string) => {
      set(() => ({
        saveSystemContextTitle: s,
      }));
    },
  };
});

const ChatPage: React.FC = () => {
  const {
    content,
    inputSystemContext,
    saveSystemContext,
    saveSystemContextTitle,
    setContent,
    setInputSystemContext,
    setSaveSystemContext,
    setSaveSystemContextTitle,
  } = useChatPageState();
  const { clear: clearFiles, uploadedFiles, uploadFiles } = useFiles();
  const { pathname, search } = useLocation();
  const { chatId } = useParams();

  const { listSystemContexts, deleteSystemContext } = useSystemContextApi();
  const [systemContextList, setSystemContextList] = useState<SystemContext[]>(
    []
  );
  const { data: systemContextResponse, mutate } = listSystemContexts();
  useEffect(() => {
    setSystemContextList(systemContextResponse ? systemContextResponse : []);
  }, [systemContextResponse, setSystemContextList]);

  const {
    getModelId,
    setModelId,
    loading,
    loadingMessages,
    isEmpty,
    messages,
    rawMessages,
    clear,
    postChat,
    updateSystemContext,
    updateSystemContextByModel,
    getCurrentSystemContext,
  } = useChat(pathname, chatId);
  const { createShareId, findShareId, deleteShareId } = useChatApi();
  const { createSystemContext } = useSystemContextApi();
  const { scrollToBottom, scrollToTop } = useScroll();
  const { getConversationTitle } = useConversation();
  const { modelIds: availableModels } = MODELS;
  const { data: share, mutate: reloadShare } = findShareId(chatId);
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  useEffect(() => {
    // 会話履歴のページではモデルを変更してもシステムコンテキストを変更しない
    if (!chatId) {
      updateSystemContextByModel();
    }
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter]);

  const title = useMemo(() => {
    if (chatId) {
      return getConversationTitle(chatId) || 'チャット';
    } else {
      return 'チャット';
    }
  }, [chatId, getConversationTitle]);

  const fileUpload = useMemo(() => {
    return MODELS.multiModalModelIds.includes(modelId);
  }, [modelId]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;

    if (search !== '') {
      const params = queryString.parse(search) as ChatPageQueryParams;
      if (params.systemContext && params.systemContext !== '') {
        updateSystemContext(params.systemContext);
      } else {
        clear();
        setInputSystemContext(currentSystemContext);
      }
      setContent(params.content ?? '');
      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, setContent, availableModels, pathname]);

  const onSend = useCallback(() => {
    postChat(
      prompter.chatPrompt({ content }),
      false,
      undefined,
      undefined,
      undefined,
      fileUpload ? uploadedFiles : undefined
    );
    setContent('');
    clearFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, uploadedFiles, fileUpload]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear]);

  const [creatingShareId, setCreatingShareId] = useState(false);
  const [deletingShareId, setDeletingShareId] = useState(false);
  const [showShareIdModal, setShowShareIdModal] = useState(false);
  const [showSystemContextModal, setShowSystemContextModal] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const onCreateShareId = useCallback(async () => {
    try {
      setCreatingShareId(true);
      await createShareId(chatId!);
      reloadShare();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingShareId(false);
    }
  }, [chatId, createShareId, reloadShare]);

  const onCreateSystemContext = useCallback(async () => {
    try {
      await createSystemContext(saveSystemContextTitle, saveSystemContext);
    } catch (e) {
      console.error(e);
    } finally {
      setShowSystemContextModal(false);
      setInputSystemContext(saveSystemContext);
      setSaveSystemContextTitle('');
      mutate();
      setSystemContextList(systemContextResponse ?? []);
    }
  }, [
    saveSystemContextTitle,
    saveSystemContext,
    systemContextResponse,
    createSystemContext,
    setShowSystemContextModal,
    setInputSystemContext,
    setSaveSystemContextTitle,
    mutate,
    setSystemContextList,
  ]);
  const onDeleteShareId = useCallback(async () => {
    try {
      setDeletingShareId(true);
      await deleteShareId(share!.shareId.split('#')[1]);
      reloadShare();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingShareId(false);
    }
  }, [share, deleteShareId, reloadShare]);

  const shareLink = useMemo(() => {
    if (share) {
      return `${window.location.origin}/share/${share.shareId.split('#')[1]}`;
    } else {
      return null;
    }
  }, [share]);

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

  const currentSystemContext = useMemo(() => {
    return getCurrentSystemContext();
  }, [getCurrentSystemContext]);

  useEffect(() => {
    setInputSystemContext(currentSystemContext);
  }, [currentSystemContext, setInputSystemContext]);

  const onClickSamplePrompt = useCallback(
    (params: ChatPageQueryParams) => {
      setContent(params.content ?? '');
      updateSystemContext(params.systemContext ?? '');
    },
    [setContent, updateSystemContext]
  );

  const onClickDeleteSystemContext = async (systemContextId: string) => {
    try {
      const idx = systemContextList.findIndex(
        (item) => item.systemContextId === systemContextId
      );
      if (idx >= 0) {
        setSystemContextList(systemContextList.filter((_, i) => i !== idx));
      }
      await deleteSystemContext(systemContextId);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    // ファイルドラッグ時にオーバーレイを表示
    event.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    // ファイルドラッグ時にオーバーレイを非表示
    event.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    // ファイルドロップ時にファイルを追加
    event.preventDefault();
    setIsOver(false);
    if (event.dataTransfer.files) {
      // ファイルを反映しアップロード
      uploadFiles(Array.from(event.dataTransfer.files));
    }
  };

  return (
    <>
      <div
        onDragOver={fileUpload ? handleDragOver : undefined}
        className={`${!isEmpty ? 'screen:pb-36' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          {title}
        </div>

        {isOver && fileUpload && (
          <div
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="fixed bottom-0 left-0 right-0 top-0 z-[999] bg-slate-300 p-10 text-center">
            <div className="flex h-full w-full items-center justify-center outline-dashed">
              <div className="font-bold">
                ファイルをドロップしてアップロード
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: m };
            })}
          />
        </div>

        {((isEmpty && !loadingMessages) || loadingMessages) && (
          <div className="relative flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <BedrockIcon
              className={`fill-gray-400 ${
                loadingMessages ? 'animate-pulse' : ''
              }`}
            />
          </div>
        )}

        {!isEmpty && !loadingMessages && (
          <div className="my-2 flex flex-col items-end pr-3">
            {chatId && (
              <div>
                <button
                  className="mb-1 flex items-center justify-center text-xs hover:underline"
                  onClick={() => {
                    setShowShareIdModal(true);
                  }}>
                  <PiShareFatFill className="mr-1" />
                  {share ? <>シェア中</> : <>シェアする</>}
                </button>
              </div>
            )}
            <Switch
              checked={showSystemContext}
              onSwitch={setShowSystemContext}
              label="システムコンテキストの表示"
            />
          </div>
        )}

        {!isEmpty &&
          showingMessages.map((chat, idx) => (
            <div key={showSystemContext ? idx : idx + 1}>
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

        <div className="fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden">
          {isEmpty && !loadingMessages && !chatId && (
            <ExpandableField
              label="システムコンテキスト"
              className="relative w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
              <>
                <div className="absolute -top-2 right-0 mb-2 flex justify-end">
                  <Button
                    outlined
                    className="text-xs"
                    onClick={() => {
                      clear();
                      setInputSystemContext(currentSystemContext);
                    }}>
                    初期化
                  </Button>
                  <Button
                    outlined
                    className="ml-1 text-xs"
                    onClick={() => {
                      setSaveSystemContext(inputSystemContext);
                      setShowSystemContextModal(true);
                    }}>
                    保存
                  </Button>
                </div>

                <InputChatContent
                  disableMarginBottom={true}
                  content={inputSystemContext}
                  onChangeContent={setInputSystemContext}
                  fullWidth={true}
                  resetDisabled={true}
                  disabled={inputSystemContext === currentSystemContext}
                  sendIcon={<PiArrowClockwiseBold />}
                  onSend={() => {
                    updateSystemContext(inputSystemContext);
                  }}
                  hideReset={true}
                />
              </>
            </ExpandableField>
          )}
          <InputChatContent
            content={content}
            disabled={loading}
            onChangeContent={setContent}
            resetDisabled={!!chatId}
            onSend={() => {
              onSend();
            }}
            onReset={onReset}
            fileUpload={fileUpload}
          />
        </div>
      </div>

      {isEmpty && !loadingMessages && (
        <PromptList
          onClick={onClickSamplePrompt}
          systemContextList={systemContextList as SystemContext[]}
          onClickDeleteSystemContext={onClickDeleteSystemContext}
        />
      )}

      <ModalDialog
        title="システムコンテキストの作成"
        isOpen={showSystemContextModal}
        onClose={() => {
          setShowSystemContextModal(false);
        }}>
        <div className="py-2.5">タイトル</div>

        <Textarea
          placeholder="入力してください"
          value={saveSystemContextTitle}
          onChange={setSaveSystemContextTitle}
          maxHeight={-1}
          className="text-aws-font-color"
        />

        <div className="py-2.5">システムコンテキスト</div>
        <Textarea
          placeholder={saveSystemContext ?? '入力してください'}
          value={saveSystemContext}
          onChange={setSaveSystemContext}
          maxHeight={500}
          className="text-aws-font-color"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button
            outlined
            onClick={() => setShowSystemContextModal(false)}
            className="p-2">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowSystemContextModal(false);
              onCreateSystemContext();
            }}
            className="bg-red-500 p-2 text-white"
            disabled={
              saveSystemContext === '' || saveSystemContextTitle === ''
            }>
            作成
          </Button>
        </div>
      </ModalDialog>

      <ModalDialog
        isOpen={showShareIdModal}
        title="会話履歴のシェア"
        onClose={() => {
          setShowShareIdModal(false);
        }}>
        <div className="py-3 text-xs text-gray-600">
          {share ? (
            <>リンクを削除することで、会話履歴の公開を停止できます。</>
          ) : (
            <>
              リンクを作成することで、このアプリケーションにログイン可能な全ユーザーに対して会話履歴を公開します。
            </>
          )}
        </div>
        {shareLink && (
          <div className="bg-aws-squid-ink my-2 flex flex-row items-center justify-between rounded px-2 py-1 text-white">
            <div className="break-all text-sm">{shareLink}</div>
            <ButtonCopy text={shareLink} />
          </div>
        )}
        <div className="flex justify-end py-3">
          {share ? (
            <div className="flex">
              <Button
                onClick={() => {
                  window.open(shareLink!, '_blank', 'noreferrer');
                }}
                outlined
                className="mr-1"
                loading={deletingShareId}>
                リンクを開く
              </Button>
              <Button
                onClick={onDeleteShareId}
                loading={deletingShareId}
                className="bg-red-500">
                リンクの削除
              </Button>
            </div>
          ) : (
            <Button onClick={onCreateShareId} loading={creatingShareId}>
              リンクの作成
            </Button>
          )}
        </div>
      </ModalDialog>
    </>
  );
};

export default ChatPage;
