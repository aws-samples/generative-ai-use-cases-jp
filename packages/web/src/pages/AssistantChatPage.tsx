import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  PiArrowLeft,
  PiPaperPlaneTilt,
  PiRobot,
  PiUser,
  PiInfo,
  PiTrash,
  PiDownloadSimple,
  PiCopy,
  PiSpinnerGap,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import { Assistant, AssistantMessage, KnowledgeSource } from 'generative-ai-use-cases';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import Markdown from '../components/Markdown';
import Alert from '../components/Alert';
import {
  getStatusInfo,
  isSyncBlocking,
  isStatusFinal,
} from '../components/assistants/statusMetadata';

const AssistantChatPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { assistantId } = useParams<{
    assistantId?: string;
  }>();

  const { getAssistant, listMessages, createMessage } = useAssistantApi();

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAssistantInfo, setShowAssistantInfo] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive status info
  const statusInfo = useMemo(() => {
    if (!assistant?.ragEnabled) return null;
    return getStatusInfo(assistant.syncStatus);
  }, [assistant]);

  const isBlocked = useMemo(() => {
    return assistant?.ragEnabled && isSyncBlocking(assistant.syncStatus);
  }, [assistant]);

  useEffect(() => {
    if (assistantId) {
      fetchAssistant();
      fetchMessages();
    }
  }, [assistantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling for assistant with non-final sync status
  useEffect(() => {
    if (!assistantId || !assistant?.ragEnabled) {
      return;
    }

    if (isStatusFinal(assistant.syncStatus)) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const result = await getAssistant(assistantId);
        setAssistant((prev) => {
          // Show success toast when transitioning to SUCCEEDED
          if (
            prev &&
            prev.syncStatus !== 'SUCCEEDED' &&
            result.syncStatus === 'SUCCEEDED'
          ) {
            toast.success(t('assistant.chatPage.syncSucceeded'));
          }
          return result;
        });
      } catch (error) {
        console.error('Failed to poll assistant status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [assistantId, assistant, getAssistant, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAssistant = async () => {
    if (!assistantId) return;

    setLoading(true);
    try {
      const result = await getAssistant(assistantId);
      setAssistant(result);
    } catch (error) {
      console.error('Failed to fetch assistant:', error);
      // Redirect to assistants page if access is forbidden (403)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          navigate('/chat/assistants');
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!assistantId) return;

    try {
      const response = await listMessages(assistantId, { limit: 100 });
      // Sort messages chronologically (oldest first)
      // Backend returns newest first (ScanIndexForward: false), so we reverse
      // createdDate is stored as numeric string (timestamp), so parse it
      // Normalize to handle both numeric strings and potential legacy ISO strings
      const normalizeTimestamp = (value?: string): number => {
        const parsed = parseInt(value ?? '', 10);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const sortedMessages = [...(response.messages || [])].sort((a, b) => {
        const timeA = normalizeTimestamp(a.createdDate);
        const timeB = normalizeTimestamp(b.createdDate);
        return timeA - timeB;
      });
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !assistantId) return;

    // Block sending if sync is in blocking state
    if (isBlocked) {
      toast.warning(t('assistant.statusMessage.blocking'));
      return;
    }

    const userMessageContent = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      // Send message and get response
      await createMessage(assistantId, { content: userMessageContent });

      // Refresh messages to get both user and assistant messages
      await fetchMessages();

      setSending(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setSending(false);
      toast.error(t('assistant.chatPage.sendError'));
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 日本語入力の変換中はEnterキーで送信しない
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleClearConversation = () => {
    if (window.confirm(t('assistant.chatPage.confirmClear'))) {
      // Just clear local messages - server will handle message history
      setMessages([]);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadConversation = () => {
    const content = messages
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${assistantId || 'unknown'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessage = (message: AssistantMessage) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    return (
      <div
        key={message.messageId}
        className={`mb-4 flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {isAssistant && (
          <div className="shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <PiRobot className="text-blue-600" />
            </div>
          </div>
        )}

        <div className="flex max-w-[70%] flex-col gap-2">
          <div
            className={`${
              isUser
                ? 'rounded-l-lg rounded-br-lg bg-blue-600 text-white'
                : 'rounded-r-lg rounded-bl-lg bg-gray-100 text-gray-900'
            } p-3`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <Markdown>{message.content}</Markdown>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => handleCopyMessage(message.content)}
                className="text-xs opacity-60 hover:opacity-100"
                title={t('assistant.chatPage.copy')}>
                <PiCopy />
              </button>
            </div>
          </div>

          {/* Display sources if available (RAG) */}
          {isAssistant && message.sources && message.sources.length > 0 && (
            <div className="rounded bg-gray-50 p-2 text-xs">
              <div className="mb-1 font-semibold text-gray-700">Sources:</div>
              {message.sources.map((source, idx) => (
                <div key={idx} className="mb-1">
                  <span className="text-gray-600">{source.name}</span>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline">
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isUser && (
          <div className="shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <PiUser className="text-green-600" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-4 border-b bg-white px-4 py-3">
        <Button
          outlined
          onClick={() => navigate('/chat/assistants')}
          className="flex items-center gap-1">
          <PiArrowLeft />
        </Button>

        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <PiRobot />
            {assistant?.name || t('assistant.chatPage.title')}
          </h1>
          {assistant?.description && (
            <p className="text-sm text-gray-600">{assistant.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            outlined
            onClick={() => setShowAssistantInfo(!showAssistantInfo)}
            className="flex items-center gap-1">
            <PiInfo />
          </Button>
          <Button
            outlined
            onClick={handleDownloadConversation}
            disabled={messages.length === 0}
            className="flex items-center gap-1">
            <PiDownloadSimple />
          </Button>
          <Button
            outlined
            onClick={handleClearConversation}
            disabled={messages.length === 0}
            className="flex items-center gap-1">
            <PiTrash />
          </Button>
        </div>
      </div>

      {showAssistantInfo && assistant && (
        <Card className="m-4 p-4">
          <h3 className="mb-2 font-semibold">
            {t('assistant.chatPage.assistantInfo')}
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>{t('assistant.chatPage.instruction')}:</strong>{' '}
              {assistant.instruction}
            </p>
            <p>
              <strong>Model:</strong> {assistant.modelId}
            </p>
            {assistant.ragEnabled && (
              <>
                <p>
                  <strong>{t('assistant.chatPage.syncStatus')}:</strong>{' '}
                  {assistant.syncStatus}
                </p>
                <p className="text-green-600">RAG Enabled</p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Status Banners */}
      {assistant?.ragEnabled && statusInfo && (
        <>
          {/* QUEUED/SYNCING Banner */}
          {(assistant.syncStatus === 'QUEUED' ||
            assistant.syncStatus === 'SYNCING') && (
            <Alert severity="info" className="m-4">
              <div className="flex items-start gap-2">
                <PiSpinnerGap className="mt-0.5 animate-spin text-lg" />
                <div className="flex-1">
                  <div className="font-semibold">
                    {t('assistant.chatPage.syncingAlertTitle')}
                  </div>
                  <div className="mt-1 text-xs">
                    {t('assistant.chatPage.syncingAlertMessage')}
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* FAILED Banner */}
          {assistant.syncStatus === 'FAILED' && (
            <Alert severity="error" className="m-4">
              <div className="flex-1">
                <div className="font-semibold">
                  {t('assistant.chatPage.failedAlertTitle')}
                </div>
                <div className="mt-1 text-xs">
                  {assistant.syncStatusReason ||
                    t('assistant.statusMessage.failed')}
                </div>
                <Button
                  outlined
                  onClick={() =>
                    navigate(`/chat/assistants/edit/${assistant.assistantId}`)
                  }
                  className="mt-2 text-xs">
                  {t('assistant.editTitle')}
                </Button>
              </div>
            </Alert>
          )}

          {/* PARTIAL Banner */}
          {assistant.syncStatus === 'PARTIAL' && (
            <Alert severity="warning" className="m-4">
              <div className="flex-1">
                <div className="font-semibold">
                  {t('assistant.chatPage.partialAlertTitle')}
                </div>
                <div className="mt-1 text-xs">
                  {(() => {
                    const failedSources = assistant.knowledgeSources?.filter(
                      (s: KnowledgeSource) => s.status === 'FAILED'
                    );
                    const failedCount = failedSources?.length ?? 0;
                    return failedCount > 0
                      ? t('assistant.chatPage.partialAlertMessage', { count: failedCount }) + (assistant.syncStatusReason ? ` ${assistant.syncStatusReason}` : '')
                      : t('assistant.statusMessage.partial');
                  })()}
                </div>
              </div>
            </Alert>
          )}
        </>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center">
            <PiRobot className="mx-auto mb-4 text-6xl text-gray-300" />
            <p className="text-gray-500">
              {t('assistant.chatPage.noMessages')}
            </p>
          </div>
        ) : (
          <div>
            {messages.map(renderMessage)}
            {sending && (
              <div className="mb-4 flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <PiRobot className="text-blue-600" />
                </div>
                <div className="rounded-r-lg rounded-bl-lg bg-gray-100 p-3">
                  <LoadingWave />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={
              isBlocked
                ? t('assistant.chatPage.syncingPlaceholder')
                : t('assistant.chatPage.inputPlaceholder')
            }
            disabled={sending || !assistantId || isBlocked}
            className="flex-1 rounded border border-black/30 p-1.5 outline-none disabled:bg-gray-100 disabled:text-gray-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              !inputMessage.trim() || sending || !assistantId || isBlocked
            }
            className="flex items-center gap-1">
            <PiPaperPlaneTilt />
            {t('assistant.chatPage.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssistantChatPage;
