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
import AssistantStatusTag from '../components/assistants/AssistantStatusTag';
import Tooltip from '../components/Tooltip';
import { isSyncBlocking, isStatusFinal } from '../components/assistants/statusMetadata';

interface AssistantWithMessages {
  assistant: Assistant;
  messages: AssistantMessage[];
  messageCount: number;
  lastMessageAt?: string;
}

const AssistantHistoryPage: React.FC = () => {
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

  // Polling for assistants with non-final sync status
  useEffect(() => {
    const hasNonFinalStatus = assistants.some(
      (item) =>
        item.assistant.ragEnabled && !isStatusFinal(item.assistant.syncStatus)
    );

    if (!hasNonFinalStatus) {
      return;
    }

    const pollInterval = setInterval(async () => {
      // Lightweight polling: only fetch assistant status, not messages
      try {
        const response = await listAssistants({ limit: 100 });
        setAssistants((prev) =>
          prev.map((item) => {
            const updated = response.assistants.find(
              (a) => a.assistantId === item.assistant.assistantId
            );
            if (updated) {
              return {
                ...item,
                assistant: {
                  ...item.assistant,
                  syncStatus: updated.syncStatus,
                  syncStatusReason: updated.syncStatusReason,
                },
              };
            }
            return item;
          })
        );
      } catch (error) {
        console.error('Failed to poll assistant statuses:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [assistants, listAssistants]);

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
    // Dates are stored as numeric strings (timestamps), so parse them
    // Normalize to handle both numeric strings and potential legacy ISO strings
    const normalizeTimestamp = (value?: string): number => {
      const parsed = parseInt(value ?? '', 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    filtered.sort((a, b) => {
      const dateA = normalizeTimestamp(a.lastMessageAt || a.assistant.createdDate);
      const dateB = normalizeTimestamp(b.lastMessageAt || b.assistant.createdDate);
      return dateB - dateA;
    });

    setFilteredAssistants(filtered);
  };

  const handleOpenAssistant = (assistant: Assistant) => {
    // Block navigation if sync is in blocking state
    if (assistant.ragEnabled && isSyncBlocking(assistant.syncStatus)) {
      alert(t('assistant.statusMessage.blocking'));
      return;
    }
    navigate(`/chat/assistants/chat/${assistant.assistantId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('assistant.history.noDate');

    // dateString is a numeric timestamp string, parse it first
    const timestamp = parseInt(dateString, 10);
    if (isNaN(timestamp)) return t('assistant.history.noDate');

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return t('assistant.history.minutesAgo', { minutes: diffMinutes });
      }
      return t('assistant.history.hoursAgo', { hours: diffHours });
    } else if (diffDays === 1) {
      return t('assistant.history.yesterday');
    } else if (diffDays < 7) {
      return t('assistant.history.daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderAssistantCard = (item: AssistantWithMessages) => {
    const { assistant, messageCount, lastMessageAt } = item;
    const isBlocked =
      assistant.ragEnabled && isSyncBlocking(assistant.syncStatus);

    const openButton = (
      <Button
        outlined
        disabled={isBlocked}
        onClick={() => {
          handleOpenAssistant(assistant);
        }}
        className="flex items-center gap-1 text-sm">
        <PiChatCircleText />
        {t('assistant.history.open')}
      </Button>
    );

    return (
      <div
        key={assistant.assistantId}
        onClick={() => handleOpenAssistant(assistant)}
        className={`cursor-pointer ${isBlocked ? 'cursor-not-allowed opacity-60' : ''}`}>
        <Card className="relative mb-4 transition-shadow hover:shadow-lg">
          {/* Status Tag - Top Right */}
          <div className="absolute right-3 top-3">
            <AssistantStatusTag assistant={assistant} />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start gap-3">
              <PiRobot className="mt-1 text-2xl text-blue-600" />

              <div className="flex-1">
                <div className="mb-1">
                  <h3 className="pr-20 text-lg font-semibold">
                    {assistant.name}
                  </h3>
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
                      {t('assistant.history.lastMessage')}:{' '}
                      {formatDate(lastMessageAt)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <PiChatCircleText />
                    {t('assistant.history.messageCount', {
                      count: messageCount,
                    })}
                  </span>
                </div>

                {/* Helper Text for Syncing */}
                {isBlocked && (
                  <p className="mt-2 text-xs text-gray-500">
                    {t('assistant.statusMessage.blocking')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {isBlocked ? (
                <Tooltip
                  message={t('assistant.statusMessage.blocking')}
                  position="left">
                  {openButton}
                </Tooltip>
              ) : (
                openButton
              )}
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
          onClick={() => navigate('/chat/assistants')}
          className="flex items-center gap-1">
          <PiArrowLeft />
          {t('assistant.history.back')}
        </Button>
        <h1 className="flex-1 text-2xl font-bold">
          {t('assistant.history.title')}
        </h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={t('assistant.history.searchPlaceholder')}
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
            {t('assistant.history.noConversations')}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            {t('assistant.history.showing', {
              count: filteredAssistants.length,
            })}
          </div>
          {filteredAssistants.map((item) => renderAssistantCard(item))}
        </div>
      )}
    </div>
  );
};

export default AssistantHistoryPage;
