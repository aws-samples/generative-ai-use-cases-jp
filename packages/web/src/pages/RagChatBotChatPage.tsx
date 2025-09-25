import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
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
import useBedrockChatApi, {
  BedrockChatBot,
  BedrockChatMessage,
} from '../hooks/useBedrockChatApi';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';
import Markdown from '../components/Markdown';

interface Conversation {
  id: string;
  title: string;
  bot_id: string;
  messages: BedrockChatMessage[];
  created_at: string;
}

const RagChatBotChatPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { botId, conversationId } = useParams<{
    botId?: string;
    conversationId?: string;
  }>();

  const { getBotSummary, getConversation, sendMessage, deleteConversation } =
    useBedrockChatApi();

  const [bot, setBot] = useState<BedrockChatBot | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<BedrockChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showBotInfo, setShowBotInfo] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (botId) {
      fetchBot();
    }
    if (conversationId) {
      fetchConversation();
    } else if (botId) {
      // Generate a new conversation ID for new chats
      const newConversationId = ulid();
      setConversation({
        id: newConversationId,
        title: `Chat with Bot ${botId}`,
        bot_id: botId,
        messages: [],
        created_at: new Date().toISOString(),
      });
      navigate(`/rag-chat-bot/chat/${botId}/${newConversationId}`, {
        replace: true,
      });
    }
  }, [botId, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Start or stop polling based on isPolling flag
    if (isPolling && conversationId) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const updatedConversation = await getConversation(conversationId);
          const updatedMessages = updatedConversation.messages || [];

          console.log(
            'Polling - Updated messages count:',
            updatedMessages.length
          );

          // Check for new messages
          setMessages((prevMessages) => {
            // Compare message count or check if there's a new assistant message
            if (updatedMessages.length > prevMessages.length) {
              console.log(
                'New messages detected:',
                updatedMessages.length - prevMessages.length
              );

              // Check if the last message is from assistant
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                console.log('Assistant message received, stopping polling');
                setIsPolling(false);
                setSending(false);
              }
              return updatedMessages;
            } else if (
              updatedMessages.length === prevMessages.length &&
              prevMessages.length > 0
            ) {
              // Check if the last message content has changed (for streaming responses)
              const lastUpdatedMsg =
                updatedMessages[updatedMessages.length - 1];
              const lastPrevMsg = prevMessages[prevMessages.length - 1];

              if (
                lastUpdatedMsg &&
                lastPrevMsg &&
                lastUpdatedMsg.id === lastPrevMsg.id &&
                lastUpdatedMsg.content !== lastPrevMsg.content
              ) {
                console.log('Message content updated');

                // Check if it's an assistant message with content
                if (
                  lastUpdatedMsg.role === 'assistant' &&
                  lastUpdatedMsg.content
                ) {
                  console.log('Assistant message completed, stopping polling');
                  setIsPolling(false);
                  setSending(false);
                }
                return updatedMessages;
              }
            }
            return prevMessages;
          });
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 5000);
    } else if (!isPolling && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, conversationId, getConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBot = async () => {
    if (!botId) return;

    setLoading(true);
    try {
      const botData = await getBotSummary(botId);
      setBot(botData as unknown as BedrockChatBot);
    } catch (error) {
      console.error('Failed to fetch bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const conversationData = await getConversation(conversationId);
      console.log('Fetched conversation data:', conversationData);

      // Update conversation metadata
      setConversation({
        id: conversationData.id,
        title: conversationData.title,
        bot_id: conversationData.botId || botId || '',
        messages: conversationData.messages || [],
        created_at: new Date(conversationData.createTime * 1000).toISOString(),
      });

      // Update messages array
      const messages = conversationData.messages || [];
      console.log('Setting messages:', messages.length);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    setIsPolling(true);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversation) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMessage: BedrockChatMessage = {
      id: userMessageId,
      content: inputMessage,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    // Add user message optimistically
    setMessages((prev) => [...prev, userMessage]);
    const sentMessage = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      const response = await sendMessage(conversation.id, sentMessage, botId);

      // Extract text content from the response
      const messageData = response.message || response;
      const messageContent =
        messageData.content
          ?.filter((item: any) => item.contentType === 'text')
          .map((item: any) => item.body)
          .join('\n') || '';

      const assistantMessage: BedrockChatMessage = {
        id:
          response.messageId || response.message_id || `msg-${Date.now() + 1}`,
        content: messageContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSending(false);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Check if it's a 504 Gateway Timeout error
      if (error.response?.status === 504) {
        console.log('Gateway timeout detected, starting polling...');

        // Remove the optimistically added user message as it will come from the API
        setMessages((prev) => {
          // Keep the user message for now, but mark that we're polling
          // The polling will replace all messages with the server state
          return prev;
        });

        // Start polling for conversation updates
        // First do an immediate fetch to get the current state
        let shouldStartPolling = true;
        try {
          const conversationData = await getConversation(conversation.id);
          const serverMessages = conversationData.messages || [];
          if (serverMessages.length > 0) {
            setMessages(serverMessages);

            const lastServerMessage = serverMessages[serverMessages.length - 1];
            if (
              lastServerMessage &&
              lastServerMessage.role === 'assistant' &&
              lastServerMessage.content.trim().length > 0
            ) {
              shouldStartPolling = false;
              setSending(false);
            }
          }
        } catch (fetchError) {
          console.error(
            'Failed to fetch conversation after timeout:',
            fetchError
          );
        }

        // Start regular polling
        if (shouldStartPolling) {
          startPolling();
        } else {
          setIsPolling(false);
        }
      } else {
        // For other errors, show error message but don't add to messages
        console.error('Error sending message:', error);
        setSending(false);
        // Could show a toast or alert here instead of adding a system message
      }
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

  const handleClearConversation = async () => {
    if (conversation && window.confirm(t('ragChatBot.chatPage.confirmClear'))) {
      try {
        await deleteConversation(conversation.id);
        // Generate a new conversation ID
        const newConversationId = ulid();
        setConversation({
          id: newConversationId,
          title: `Chat with Bot ${botId}`,
          bot_id: botId || '',
          messages: [],
          created_at: new Date().toISOString(),
        });
        setMessages([]);
        navigate(`/rag-chat-bot/chat/${botId}/${newConversationId}`, {
          replace: true,
        });
      } catch (error) {
        console.error('Failed to clear conversation:', error);
      }
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
    a.download = `conversation-${conversation?.id || 'unknown'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessage = (message: BedrockChatMessage) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    // Only render user and assistant messages
    if (message.role !== 'user' && message.role !== 'assistant') {
      return null;
    }

    return (
      <div
        key={message.id}
        className={`mb-4 flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {isAssistant && (
          <div className="shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <PiRobot className="text-blue-600" />
            </div>
          </div>
        )}

        <div
          className={`max-w-[70%] ${
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
          onClick={() => navigate('/rag-chat-bot')}
          className="flex items-center gap-1">
          <PiArrowLeft />
        </Button>

        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <PiRobot />
            {bot?.title || t('ragChatBot.chatPage.title')}
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
              <strong>{t('ragChatBot.chatPage.syncStatus')}:</strong>{' '}
              {bot.syncStatus}
            </p>
            {bot.displayRetrievedChunks && (
              <p className="text-green-600">
                {t('ragChatBot.chatPage.chunksEnabled')}
              </p>
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
            {bot?.conversationQuickStarters &&
              bot.conversationQuickStarters.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-sm text-gray-600">
                    {t('ragChatBot.chatPage.quickStarters')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {bot.conversationQuickStarters.map(
                      (
                        starter: { title: string; example: string },
                        index: number
                      ) => (
                        <Button
                          key={index}
                          outlined
                          onClick={() => setInputMessage(starter.example)}
                          className="text-sm">
                          {starter.title}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}
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
            disabled={sending || !conversation}
            className="flex-1 rounded border border-black/30 p-1.5 outline-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sending || !conversation}
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
