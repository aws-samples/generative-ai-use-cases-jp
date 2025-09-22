import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiArrowLeft,
  PiChatCircleText,
  PiTrash,
  PiMagnifyingGlass,
  PiCalendar,
  PiRobot,
  PiClock,
} from 'react-icons/pi';
import useBedrockChatApi, {
  BedrockChatConversation,
} from '../hooks/useBedrockChatApi';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingWave from '../components/LoadingWave';

interface ConversationWithBot extends BedrockChatConversation {
  bot_id?: string;
  bot_title?: string;
  message_count?: number;
  last_message_at?: string;
}

const RagChatBotHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getConversations, deleteConversation, searchConversations } =
    useBedrockChatApi();

  const [conversations, setConversations] = useState<ConversationWithBot[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    ConversationWithBot[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data as ConversationWithBot[]);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = () => {
    let filtered = [...conversations];

    if (searchQuery) {
      filtered = filtered.filter(
        (conv) =>
          conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.bot_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by most recent first
    filtered.sort((a, b) => {
      const dateA = new Date(a.last_message_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.last_message_at || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    setFilteredConversations(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      filterConversations();
      return;
    }

    setLoading(true);
    try {
      const results = await searchConversations(searchQuery);
      setFilteredConversations(results as ConversationWithBot[]);
    } catch (error) {
      console.error('Failed to search conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (window.confirm(t('ragChatBot.history.confirmDelete'))) {
      try {
        await deleteConversation(conversationId);
        await fetchConversations();
        setSelectedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return;

    if (
      window.confirm(
        t('ragChatBot.history.confirmBulkDelete', {
          count: selectedConversations.size,
        })
      )
    ) {
      setLoading(true);
      try {
        await Promise.all(
          Array.from(selectedConversations).map((id) => deleteConversation(id))
        );
        await fetchConversations();
        setSelectedConversations(new Set());
      } catch (error) {
        console.error('Failed to delete conversations:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const handleOpenConversation = (conversation: ConversationWithBot) => {
    if (conversation.bot_id) {
      navigate(`/rag-chat-bot/chat/${conversation.bot_id}/${conversation.id}`);
    } else {
      navigate(`/rag-chat-bot/chat/unknown/${conversation.id}`);
    }
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

  const renderConversationCard = (conversation: ConversationWithBot) => {
    const isSelected = selectedConversations.has(conversation.id);

    return (
      <div
        key={conversation.id}
        onClick={() => handleOpenConversation(conversation)}
        className="cursor-pointer">
        <Card
          className={`mb-4 transition-shadow hover:shadow-lg ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          }`}>
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedConversations((prev) => {
                    const newSet = new Set(prev);
                    if (isSelected) {
                      newSet.delete(conversation.id);
                    } else {
                      newSet.add(conversation.id);
                    }
                    return newSet;
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />

              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {conversation.title || t('ragChatBot.history.untitled')}
                  </h3>
                  {conversation.bot_title && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <PiRobot />
                      {conversation.bot_title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <PiCalendar />
                    {formatDate(conversation.createdAt)}
                  </span>
                  {conversation.last_message_at && (
                    <span className="flex items-center gap-1">
                      <PiClock />
                      {t('ragChatBot.history.lastMessage')}:{' '}
                      {formatDate(conversation.last_message_at)}
                    </span>
                  )}
                  {conversation.message_count !== undefined && (
                    <span className="flex items-center gap-1">
                      <PiChatCircleText />
                      {t('ragChatBot.history.messageCount', {
                        count: conversation.message_count,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                outlined
                onClick={() => {
                  handleOpenConversation(conversation);
                }}
                className="flex items-center gap-1 text-sm">
                <PiChatCircleText />
                {t('ragChatBot.history.open')}
              </Button>
              <Button
                outlined
                onClick={() => {
                  handleDeleteConversation(conversation.id);
                }}
                className="text-sm text-red-600 hover:bg-red-50">
                <PiTrash />
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
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder={t('ragChatBot.history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) =>
              e.key === 'Enter' && handleSearch()
            }
            className="flex-1 rounded border border-black/30 p-1.5 outline-none"
          />
          <Button
            onClick={handleSearch}
            outlined
            className="flex items-center gap-1">
            <PiMagnifyingGlass />
            {t('ragChatBot.history.search')}
          </Button>
        </div>

        {selectedConversations.size > 0 && (
          <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-3">
            <span className="text-sm text-blue-700">
              {t('ragChatBot.history.selected', {
                count: selectedConversations.size,
              })}
            </span>
            <Button outlined onClick={handleSelectAll} className="text-sm">
              {selectedConversations.size === filteredConversations.length
                ? t('ragChatBot.history.deselectAll')
                : t('ragChatBot.history.selectAll')}
            </Button>
            <Button
              outlined
              onClick={handleBulkDelete}
              className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50">
              <PiTrash />
              {t('ragChatBot.history.deleteSelected')}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingWave />
        </div>
      ) : filteredConversations.length === 0 ? (
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
              count: filteredConversations.length,
            })}
          </div>
          {filteredConversations.map((conversation) =>
            renderConversationCard(conversation)
          )}
        </div>
      )}
    </div>
  );
};

export default RagChatBotHistoryPage;
