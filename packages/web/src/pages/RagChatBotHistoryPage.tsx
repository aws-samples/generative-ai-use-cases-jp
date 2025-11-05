import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeft,
  PiChatCircleText,
  PiCalendar,
  PiRobot,
  PiClock,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import { Assistant, AssistantMessage } from 'generative-ai-use-cases';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';

interface AssistantWithMessages {
  assistant: Assistant;
  messages: AssistantMessage[];
  messageCount: number;
  lastMessageAt?: string;
}

const RagChatBotHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { listAssistants, listMessages } = useAssistantApi();

  const [assistants, setAssistants] = useState<AssistantWithMessages[]>([]);
  const [filteredAssistants, setFilteredAssistants] = useState<
    AssistantWithMessages[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAssistantsWithMessages();
  }, []);

  useEffect(() => {
    filterAssistants();
  }, [assistants, searchQuery]);

  const fetchAssistantsWithMessages = async () => {
    setLoading(true);
    try {
      const response = await listAssistants({ limit: 100 });
      const assistantsWithMessages: AssistantWithMessages[] = await Promise.all(
        response.assistants.map(async (assistant) => {
          try {
            const messagesResponse = await listMessages(assistant.assistantId, {
              limit: 100,
            });
            const messages = messagesResponse.messages || [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

            return {
              assistant,
              messages,
              messageCount: messages.length,
              lastMessageAt: lastMessage?.createdDate,
            };
          } catch (error) {
            console.error(`Failed to fetch messages for ${assistant.assistantId}:`, error);
            return {
              assistant,
              messages: [],
              messageCount: 0,
            };
          }
        })
      );

      setAssistants(assistantsWithMessages);
    } catch (error) {
      console.error('Failed to fetch assistants:', error);
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAssistants = () => {
    let filtered = [...assistants];

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.assistant.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by most recent message first
    filtered.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.assistant.createdDate || 0).getTime();
      const dateB = new Date(b.lastMessageAt || b.assistant.createdDate || 0).getTime();
      return dateB - dateA;
    });

    setFilteredAssistants(filtered);
  };

  const handleOpenAssistant = (assistantId: string) => {
    navigate(`/rag-chat-bot/chat/${assistantId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('ragChatBot.history.noDate');

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return t('ragChatBot.history.minutesAgo', { minutes: diffMinutes });
      }
      return t('ragChatBot.history.hoursAgo', { hours: diffHours });
    } else if (diffDays === 1) {
      return t('ragChatBot.history.yesterday');
    } else if (diffDays < 7) {
      return t('ragChatBot.history.daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderAssistantCard = (item: AssistantWithMessages) => {
    const { assistant, messageCount, lastMessageAt } = item;

    return (
      <div
        key={assistant.assistantId}
        onClick={() => handleOpenAssistant(assistant.assistantId)}
        className="cursor-pointer">
        <Card className="mb-4 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start gap-3">
              <PiRobot className="mt-1 text-2xl text-blue-600" />

              <div className="flex-1">
                <div className="mb-1">
                  <h3 className="text-lg font-semibold">{assistant.name}</h3>
                  {assistant.description && (
                    <p className="text-sm text-gray-600">
                      {assistant.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <PiCalendar />
                    Created: {formatDate(assistant.createdDate)}
                  </span>
                  {lastMessageAt && (
                    <span className="flex items-center gap-1">
                      <PiClock />
                      {t('ragChatBot.history.lastMessage')}:{' '}
                      {formatDate(lastMessageAt)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <PiChatCircleText />
                    {t('ragChatBot.history.messageCount', {
                      count: messageCount,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                outlined
                onClick={() => {
                  handleOpenAssistant(assistant.assistantId);
                }}
                className="flex items-center gap-1 text-sm">
                <PiChatCircleText />
                {t('ragChatBot.history.open')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button
          outlined
          onClick={() => navigate('/rag-chat-bot')}
          className="flex items-center gap-1">
          <PiArrowLeft />
          {t('ragChatBot.history.back')}
        </Button>
        <h1 className="flex-1 text-2xl font-bold">
          {t('ragChatBot.history.title')}
        </h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={t('ragChatBot.history.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border border-black/30 p-2 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingWave />
        </div>
      ) : filteredAssistants.length === 0 ? (
        <div className="py-12 text-center">
          <PiChatCircleText className="mx-auto mb-4 text-6xl text-gray-300" />
          <p className="text-gray-500">
            {t('ragChatBot.history.noConversations')}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            {t('ragChatBot.history.showing', {
              count: filteredAssistants.length,
            })}
          </div>
          {filteredAssistants.map((item) => renderAssistantCard(item))}
        </div>
      )}
    </div>
  );
};

export default RagChatBotHistoryPage;
