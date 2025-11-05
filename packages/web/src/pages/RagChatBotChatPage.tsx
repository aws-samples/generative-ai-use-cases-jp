import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeft,
  PiPaperPlaneTilt,
  PiRobot,
  PiUser,
  PiInfo,
  PiTrash,
  PiDownloadSimple,
  PiCopy,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import { Assistant, AssistantMessage } from 'generative-ai-use-cases';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import Markdown from '../components/Markdown';

const RagChatBotChatPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { botId } = useParams<{
    botId?: string;
  }>();

  const { getAssistant, listMessages, createMessage } = useAssistantApi();

  const [bot, setBot] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showBotInfo, setShowBotInfo] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (botId) {
      fetchBot();
      fetchMessages();
    }
  }, [botId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBot = async () => {
    if (!botId) return;

    setLoading(true);
    try {
      const assistant = await getAssistant(botId);
      setBot(assistant);
    } catch (error) {
      console.error('Failed to fetch assistant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!botId) return;

    try {
      const response = await listMessages(botId, { limit: 100 });
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !botId) return;

    const userMessageContent = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      // Send message and get response
      await createMessage(botId, { content: userMessageContent });

      // Refresh messages to get both user and assistant messages
      await fetchMessages();

      setSending(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setSending(false);
      alert(t('ragChatBot.chatPage.sendError', 'Failed to send message'));
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
    if (window.confirm(t('ragChatBot.chatPage.confirmClear'))) {
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
    a.download = `conversation-${botId || 'unknown'}.txt`;
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
                title={t('ragChatBot.chatPage.copy')}>
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
            {bot?.name || t('ragChatBot.chatPage.title')}
          </h1>
          {bot?.description && (
            <p className="text-sm text-gray-600">{bot.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            outlined
            onClick={() => setShowBotInfo(!showBotInfo)}
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

      {showBotInfo && bot && (
        <Card className="m-4 p-4">
          <h3 className="mb-2 font-semibold">
            {t('ragChatBot.chatPage.botInfo')}
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>{t('ragChatBot.chatPage.instruction')}:</strong>{' '}
              {bot.instruction}
            </p>
            <p>
              <strong>Model:</strong> {bot.modelId}
            </p>
            {bot.ragEnabled && (
              <>
                <p>
                  <strong>{t('ragChatBot.chatPage.syncStatus')}:</strong>{' '}
                  {bot.syncStatus}
                </p>
                <p className="text-green-600">RAG Enabled</p>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center">
            <PiRobot className="mx-auto mb-4 text-6xl text-gray-300" />
            <p className="text-gray-500">
              {t('ragChatBot.chatPage.noMessages')}
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
            placeholder={t('ragChatBot.chatPage.inputPlaceholder')}
            disabled={sending || !botId}
            className="flex-1 rounded border border-black/30 p-1.5 outline-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sending || !botId}
            className="flex items-center gap-1">
            <PiPaperPlaneTilt />
            {t('ragChatBot.chatPage.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RagChatBotChatPage;
