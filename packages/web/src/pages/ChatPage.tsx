import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import InputChatContent from '../components/InputChatContent';
import useChat from '../hooks/useChat';
import useChatApi from '../hooks/useChatApi';
import useChatList from '../hooks/useChatList';
import ChatMessage from '../components/ChatMessage';
import Button from '../components/Button';
import ButtonCopy from '../components/ButtonCopy';
import ModalDialog from '../components/ModalDialog';
import ExpandableField from '../components/ExpandableField';
import ModelSelector from '../components/ModelSelector';
import useFollow from '../hooks/useFollow';
import { create } from 'zustand';
import { ChatPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import { getPrompter } from '../prompts';
import queryString from 'query-string';
import useFiles from '../hooks/useFiles';
import {
  AdditionalModelRequestFields,
  FileLimit,
} from 'generative-ai-use-cases';
import ModelParameters from '../components/ModelParameters';
import { AcceptedDotExtensions } from '../utils/MediaUtils';
import { useTranslation } from 'react-i18next';

const fileLimit: FileLimit = {
  accept: AcceptedDotExtensions,
  maxFileCount: 5,
  maxFileSizeMB: 4.5,
  maxImageFileCount: 20,
  maxImageFileSizeMB: 3.75,
  maxVideoFileCount: 1,
  maxVideoFileSizeMB: 1000, // 1 GB for S3 input
};

const FIXED_SYSTEM_CONTEXT = 'あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、正確で分かりやすい回答を提供してください。';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const useChatPageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const ChatPage: React.FC = () => {
  const { content, setContent } = useChatPageState();
  const { pathname, search } = useLocation();
  const {
    clear: clearFiles,
    uploadedFiles,
    uploadFiles,
    base64Cache,
  } = useFiles(pathname);
  const { chatId } = useParams();


  const {
    getModelId,
    setModelId,
    loading,
    writing,
    isEmpty,
    messages,
    clear,
    postChat,
    editChat,
    updateSystemContext,
    retryGeneration,
    forceToStop,
  } = useChat(pathname, chatId);
  const { createShareId, findShareId, deleteShareId } = useChatApi();
  const { scrollableContainer, setFollowing } = useFollow();
  const { getChatTitle } = useChatList();
  const {
    modelIds: availableModels,
    modelDisplayName,
    modelMetadata,
    featuredModelIds,
  } = MODELS;
  const { data: share, mutate: reloadShare } = findShareId(chatId);
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);
  const [overrideModelParameters, setOverrideModelParameters] = useState<
    AdditionalModelRequestFields | undefined
  >(undefined);
  const [showSetting, setShowSetting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Set fixed system context
    if (!chatId) {
      updateSystemContext(FIXED_SYSTEM_CONTEXT);
    }
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [chatId]);

  const title = useMemo(() => {
    if (chatId) {
      return getChatTitle(chatId) || t('chat.title');
    } else {
      return t('chat.title');
    }
  }, [chatId, getChatTitle, t]);

  const accept = useMemo(() => {
    if (!modelId) return [];
    const feature = MODELS.modelMetadata[modelId];
    if (!feature) return [];
    return [
      ...(feature.flags.doc ? fileLimit.accept.doc : []),
      ...(feature.flags.image ? fileLimit.accept.image : []),
      ...(feature.flags.video ? fileLimit.accept.video : []),
    ];
  }, [modelId]);
  const fileUpload = useMemo(() => {
    return accept.length > 0;
  }, [accept]);
  const setting = useMemo(() => {
    return MODELS.modelMetadata[modelId]?.flags.reasoning ?? false;
  }, [modelId]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;

    if (search !== '') {
      const params = queryString.parse(search) as ChatPageQueryParams;
      if (params.systemContext && params.systemContext !== '') {
        updateSystemContext(params.systemContext);
      } else {
        clear();
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
    setFollowing(true);
    postChat(
      prompter.chatPrompt({ content }),
      false,
      undefined,
      undefined,
      undefined,
      fileUpload ? uploadedFiles : undefined,
      undefined,
      undefined,
      undefined,
      base64Cache,
      overrideModelParameters
    );
    setContent('');
    clearFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, base64Cache, fileUpload, setFollowing, overrideModelParameters]);

  const onRetry = useCallback(() => {
    retryGeneration(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      base64Cache,
      overrideModelParameters
    );
  }, [retryGeneration, base64Cache, overrideModelParameters]);

  const onStop = useCallback(() => {
    forceToStop();
  }, [forceToStop]);

  const onEdit = useCallback(
    (modifiedPrompt: string) => {
      setFollowing(true);
      editChat(
        modifiedPrompt,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        base64Cache,
        overrideModelParameters
      );
    },
    [editChat, base64Cache, setFollowing, overrideModelParameters]
  );

  const [creatingShareId, setCreatingShareId] = useState(false);
  const [deletingShareId, setDeletingShareId] = useState(false);
  const [showShareIdModal, setShowShareIdModal] = useState(false);
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

  const showingMessages = useMemo(() => {
    return messages;
  }, [messages]);

  const handleDragOver = (event: React.DragEvent) => {
    // When a file is dragged, display the overlay
    event.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    // When a file is dragged, hide the overlay
    event.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    // When a file is dropped, add the file
    event.preventDefault();
    setIsOver(false);
    if (event.dataTransfer.files) {
      // Reflect the file and upload it
      uploadFiles(Array.from(event.dataTransfer.files), fileLimit, accept);
    }
  };

  return (
    <>
      {/* Main Content */}
      <div
        onDragOver={fileUpload ? handleDragOver : undefined}
        className="relative h-screen flex flex-col">
        {isOver && fileUpload && (
          <div
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex fixed inset-0 justify-center items-center p-10 z-[999] bg-slate-300 outline-dashed">
            <p className="font-bold">{t('chat.drop_files')}</p>
          </div>
        )}

        {/* Header with Model Selector and Share Button */}
        <div className="flex items-center gap-4 my-5 print:hidden">
          {/* Model Selector */}
          <ModelSelector
            className="w-80"
            value={modelId}
            onChange={setModelId}
            models={availableModels.map((m) => {
              return {
                value: m,
                label: modelDisplayName(m),
                description: modelMetadata[m]?.description,
              };
            })}
            featuredModelIds={featuredModelIds}
          />

          {/* Spacer */}
          <div className="flex-1" />
        </div>

        {/* Print-only Title */}
        <h1 className="hidden print:block text-xl font-semibold my-5">
          {title}
        </h1>

        {/* Wrapper for messages and input to enable vertical centering when empty */}
        {isEmpty ? (
          <div className="flex-1 flex flex-col justify-center">
            <InputChatContent
              className="print:hidden mx-auto"
              content={content}
              disabled={loading && !writing}
              onChangeContent={setContent}
              hideReset={true}
              onSend={() => {
                if (!loading) {
                  onSend();
                } else {
                  onStop();
                }
              }}
              fileUpload={fileUpload}
              fileLimit={fileLimit}
              accept={accept}
              setting={setting}
              onSetting={() => {
                setShowSetting(true);
              }}
              canStop={writing}
            />
          </div>
        ) : (
          <>
            <div ref={scrollableContainer} className="flex-1 overflow-y-auto">
              {showingMessages.map((chat, idx) => (
                <ChatMessage
                  key={idx + 1}
                  chatContent={chat}
                  loading={loading && idx === showingMessages.length - 1}
                  allowRetry={idx === showingMessages.length - 1}
                  editable={idx === showingMessages.length - 2 && !loading}
                  onCommitEdit={
                    idx === showingMessages.length - 2 && !loading
                      ? onEdit
                      : undefined
                  }
                  retryGeneration={onRetry}
                />
              ))}
            </div>

            <div className="sticky bottom-0 print:hidden">
              <InputChatContent
                className="mx-auto my-4"
                content={content}
                disabled={loading && !writing}
                onChangeContent={setContent}
                hideReset={true}
                onSend={() => {
                  if (!loading) {
                    onSend();
                  } else {
                    onStop();
                  }
                }}
                fileUpload={fileUpload}
                fileLimit={fileLimit}
                accept={accept}
                setting={setting}
                onSetting={() => {
                  setShowSetting(true);
                }}
                canStop={writing}
              />
            </div>
          </>
        )}
      </div>

      <ModalDialog
        isOpen={showShareIdModal}
        title={t('chat.share_conversation')}
        onClose={() => {
          setShowShareIdModal(false);
        }}>
        <p className="py-3 text-xs text-gray-600">
          {share ? t('chat.delete_link_message') : t('chat.create_link_message')}
        </p>
        {shareLink && (
          <div className="flex justify-between items-center py-1 px-2 my-2 text-white rounded bg-aws-squid-ink">
            <span className="text-sm break-all">{shareLink}</span>
            <ButtonCopy text={shareLink} />
          </div>
        )}
        <div className="flex gap-1 justify-end py-3">
          {share ? (
            <>
              <Button
                onClick={() => {
                  window.open(shareLink!, '_blank', 'noreferrer');
                }}
                outlined
                loading={deletingShareId}>
                {t('chat.open_link')}
              </Button>
              <Button
                onClick={onDeleteShareId}
                loading={deletingShareId}
                className="bg-red-500">
                {t('chat.delete_link')}
              </Button>
            </>
          ) : (
            <Button onClick={onCreateShareId} loading={creatingShareId}>
              {t('chat.create_link')}
            </Button>
          )}
        </div>
      </ModalDialog>
      <ModalDialog
        isOpen={showSetting}
        onClose={() => {
          setShowSetting(false);
        }}
        title={t('chat.advanced_options')}>
        {setting && (
          <ExpandableField
            label={t('chat.model_parameters')}
            className="relative w-full"
            defaultOpened={true}>
            <ModelParameters
              modelFeatureFlags={MODELS.modelMetadata[modelId]?.flags}
              overrideModelParameters={overrideModelParameters}
              setOverrideModelParameters={setOverrideModelParameters}
            />
          </ExpandableField>
        )}
        <Button
          className="mt-4"
          onClick={() => {
            setShowSetting(false);
          }}>
          {t('chat.settings')}
        </Button>
      </ModalDialog>
    </>
  );
};

export default ChatPage;
