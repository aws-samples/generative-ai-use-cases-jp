import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiPlus,
  PiRobot,
  PiPencil,
  PiTrash,
  PiDotsThreeVertical,
  PiCheckCircle,
  PiClockCountdown,
  PiWarningCircle,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import { Assistant } from 'generative-ai-use-cases';
import Button from '../components/Button';
import LoadingWave from '../components/LoadingWave';

const RagChatBotPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    listAssistants,
    deleteAssistant,
    getAssistant,
  } = useAssistantApi();

  const [bots, setBots] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchBots = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    try {
      const response = await listAssistants({ limit: 100 });
      // Only update state if request wasn't cancelled
      if (!signal.aborted) {
        let filteredBots = response.assistants || [];

        // Client-side filtering since API doesn't support these yet
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredBots = filteredBots.filter(
            (bot) =>
              bot.name.toLowerCase().includes(query) ||
              bot.description?.toLowerCase().includes(query)
          );
        }

        setBots(filteredBots);
      }
    } catch (error) {
      // Only update state if request wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Failed to fetch bots:', error);
        setBots([]);
      }
    } finally {
      // Only set loading to false if request wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchQuery, listAssistants]);

  // Function to update only sync status without full reload
  const updateSyncStatuses = useCallback(async () => {
    const botsToUpdate = bots.filter((bot) => bot.syncStatus === 'RUNNING');

    if (botsToUpdate.length === 0) return;

    try {
      const updates = await Promise.all(
        botsToUpdate.map(async (bot) => {
          try {
            const updatedBot = await getAssistant(bot.assistantId);
            return { id: bot.assistantId, syncStatus: updatedBot.syncStatus };
          } catch (error) {
            console.error(
              `Failed to update sync status for bot ${bot.assistantId}:`,
              error
            );
            return null;
          }
        })
      );

      setBots((prevBots) =>
        prevBots.map((bot) => {
          const update = updates.find((u) => u && u.id === bot.assistantId);
          return update ? { ...bot, syncStatus: update.syncStatus } : bot;
        })
      );
    } catch (error) {
      console.error('Failed to update sync statuses:', error);
    }
  }, [bots, getAssistant]);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, 300); // 300ms debounce delay

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchInputValue]);

  // Fetch bots on filter changes
  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // Polling for sync status
  useEffect(() => {
    const shouldPoll = bots.some((bot) => bot.syncStatus === 'RUNNING');

    if (shouldPoll) {
      pollingInterval.current = setInterval(() => {
        updateSyncStatuses();
      }, 10000); // Poll every 10 seconds
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [bots, updateSyncStatuses]);

  const handleCreateBot = () => {
    navigate('/rag-chat-bot/create');
  };

  const handleEditBot = (botId: string) => {
    navigate(`/rag-chat-bot/edit/${botId}`);
  };

  const handleChatWithBot = (botId: string) => {
    navigate(`/rag-chat-bot/chat/${botId}`);
  };

  const handleDeleteBot = async (botId: string) => {
    if (window.confirm(t('ragChatBot.confirmDelete'))) {
      try {
        await deleteAssistant(botId);
        await fetchBots();
      } catch (error) {
        console.error('Failed to delete bot:', error);
      }
    }
  };


  const getSyncStatusDisplay = (status: string) => {
    switch (status) {
      case 'SYNCED':
        return {
          text: t('ragChatBot.syncStatus.completed'),
          icon: <PiCheckCircle className="text-green-600" />,
          className: 'text-green-600',
        };
      case 'RUNNING':
        return {
          text: t('ragChatBot.syncStatus.syncing'),
          icon: <PiClockCountdown className="animate-pulse text-blue-600" />,
          className: 'text-blue-600',
        };
      case 'FAILED':
        return {
          text: t('ragChatBot.syncStatus.failed'),
          icon: <PiWarningCircle className="text-red-600" />,
          className: 'text-red-600',
        };
      default:
        return {
          text: status,
          icon: null,
          className: 'text-gray-500',
        };
    }
  };

  const renderBotCard = (bot: Assistant) => {
    const syncStatusDisplay = getSyncStatusDisplay(bot.syncStatus);
    const isMenuOpen = openMenuId === bot.assistantId;

    return (
      <div
        key={bot.assistantId}
        className="border-aws-font-color/20 relative mb-4 cursor-pointer rounded-lg border p-5 shadow transition-shadow hover:shadow-lg"
        onClick={(e) => {
          // Check if click is on card itself, not on buttons
          const target = e.target as HTMLElement;
          if (!target.closest('button')) {
            handleChatWithBot(bot.assistantId);
          }
        }}>
        <div className="flex h-full items-stretch justify-between">
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <PiRobot className="text-2xl text-blue-600" />
                <h3 className="text-lg font-semibold">{bot.name}</h3>
              </div>
              {bot.description && (
                <p className="text-sm text-gray-600">{bot.description}</p>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {/* Sync Status Display - only show if RAG is enabled */}
            {bot.ragEnabled && (
              <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
                {syncStatusDisplay.icon}
                <span
                  className={`text-xs font-medium ${syncStatusDisplay.className}`}>
                  {syncStatusDisplay.text}
                </span>
              </div>
            )}

            {/* Three Dots Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() =>
                  setOpenMenuId(isMenuOpen ? null : bot.assistantId)
                }
                className="rounded p-2 transition-colors hover:bg-gray-100">
                <PiDotsThreeVertical className="text-xl text-gray-500 hover:text-gray-700" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBot(bot.assistantId);
                      setOpenMenuId(null);
                    }}>
                    <PiPencil /> {t('ragChatBot.editTitle')}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBot(bot.assistantId);
                      setOpenMenuId(null);
                    }}>
                    <PiTrash /> {t('ragChatBot.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">{t('ragChatBot.title')}</h1>
          <p className="text-gray-600">{t('ragChatBot.description')}</p>
        </div>
        {/* 新規作成ボタン */}
        <Button onClick={handleCreateBot} className="flex items-center gap-1">
          <PiPlus />
          {t('ragChatBot.createNew')}
        </Button>
      </div>

      {/* 検索フォーム */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input
          type="text"
          placeholder={t('ragChatBot.searchPlaceholder')}
          value={searchInputValue}
          onChange={(e) => setSearchInputValue(e.target.value)}
          className="w-full rounded border border-black/30 p-2 outline-none"
        />
      </div>

      {/* ボット一覧表示部分 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingWave />
        </div>
      ) : bots.length === 0 ? (
        <div className="py-12 text-center">
          <PiRobot className="mx-auto mb-4 text-6xl text-gray-300" />
          <p className="text-gray-500">{t('ragChatBot.noBots')}</p>
        </div>
      ) : (
        <div>{bots.map((bot) => renderBotCard(bot))}</div>
      )}
    </div>
  );
};

export default RagChatBotPage;
