import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiPlus,
  PiRobot,
  PiPencil,
  PiTrash,
  PiStar,
  PiStarFill,
  PiDotsThreeVertical,
  PiCheckCircle,
  PiClockCountdown,
  PiWarningCircle,
  PiLock,
  PiUsers,
  PiX,
} from 'react-icons/pi';
import useBedrockChatApi, { BedrockChatBot } from '../hooks/useBedrockChatApi';
import Button from '../components/Button';
import LoadingWave from '../components/LoadingWave';
import Switch from '../components/Switch';

type ScopeFilter = 'none' | 'all' | 'private';

const RagChatBotPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    searchStore,
    deleteBot,
    getPrivateBot,
    setBotVisibility,
    setStarredStatus,
  } = useBedrockChatApi();

  const [bots, setBots] = useState<BedrockChatBot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('none');
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [visibilityModalBotId, setVisibilityModalBotId] = useState<
    string | null
  >(null);
  const [newVisibility, setNewVisibility] = useState<
    'private' | 'partial' | 'all'
  >('private');
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
      const params = {
        query: searchQuery || undefined,
        scope: scopeFilter === 'none' ? undefined : scopeFilter,
        starred: showOnlyStarred || undefined,
        limit: 50,
        sort: 'usage' as const,
      };

      const data = await searchStore(params);
      // Only update state if request wasn't cancelled
      if (!signal.aborted) {
        setBots(data || []);
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
  }, [searchQuery, scopeFilter, showOnlyStarred, searchStore]);

  // Function to update only sync status without full reload
  const updateSyncStatuses = useCallback(async () => {
    const botsToUpdate = bots.filter((bot) => bot.syncStatus === 'RUNNING');

    if (botsToUpdate.length === 0) return;

    try {
      const updates = await Promise.all(
        botsToUpdate.map(async (bot) => {
          try {
            const updatedBot = await getPrivateBot(bot.id);
            return { id: bot.id, syncStatus: updatedBot.syncStatus };
          } catch (error) {
            console.error(
              `Failed to update sync status for bot ${bot.id}:`,
              error
            );
            return null;
          }
        })
      );

      setBots((prevBots) =>
        prevBots.map((bot) => {
          const update = updates.find((u) => u && u.id === bot.id);
          return update ? { ...bot, syncStatus: update.syncStatus } : bot;
        })
      );
    } catch (error) {
      console.error('Failed to update sync statuses:', error);
    }
  }, [bots, getPrivateBot]);

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
        await deleteBot(botId);
        await fetchBots();
      } catch (error) {
        console.error('Failed to delete bot:', error);
      }
    }
  };

  const handleToggleStar = async (botId: string, currentStarred: boolean) => {
    try {
      await setStarredStatus(botId, !currentStarred);
      setBots((prevBots) =>
        prevBots.map((bot) =>
          bot.id === botId ? { ...bot, isStarred: !currentStarred } : bot
        )
      );
    } catch (error) {
      console.error('Failed to toggle star status:', error);
    }
  };

  const handleChangeVisibility = async (
    botId: string,
    visibility: 'private' | 'partial' | 'all'
  ) => {
    try {
      await setBotVisibility(botId, visibility);
      setBots((prevBots) =>
        prevBots.map((bot) =>
          bot.id === botId ? { ...bot, sharedScope: visibility } : bot
        )
      );
      setVisibilityModalBotId(null);
    } catch (error) {
      console.error('Failed to change bot visibility:', error);
      await fetchBots();
    }
  };

  const getSyncStatusDisplay = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
      case 'IDLE':
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

  const renderBotCard = (bot: BedrockChatBot) => {
    const isOwner = bot.owned === true;
    const syncStatusDisplay = getSyncStatusDisplay(bot.syncStatus);
    const isMenuOpen = openMenuId === bot.id;

    return (
      <div
        key={bot.id}
        className="border-aws-font-color/20 relative mb-4 cursor-pointer rounded-lg border p-5 shadow transition-shadow hover:shadow-lg"
        onClick={(e) => {
          // Check if click is on card itself, not on buttons
          const target = e.target as HTMLElement;
          if (!target.closest('button')) {
            handleChatWithBot(bot.id);
          }
        }}>
        <div className="flex h-full items-stretch justify-between">
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <PiRobot className="text-2xl text-blue-600" />
                <h3 className="text-lg font-semibold">{bot.title}</h3>
              </div>
              {bot.description && (
                <p className="text-sm text-gray-600">{bot.description}</p>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {/* Sync Status Display */}
            <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
              {syncStatusDisplay.icon}
              <span
                className={`text-xs font-medium ${syncStatusDisplay.className}`}>
                {syncStatusDisplay.text}
              </span>
            </div>

            {/* Star Button */}
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleToggleStar(bot.id, bot.isStarred || false)}
                className="rounded p-2 transition-colors hover:bg-gray-100"
                title={
                  bot.isStarred ? t('ragChatBot.unstar') : t('ragChatBot.star')
                }>
                {bot.isStarred ? (
                  <PiStarFill className="text-xl text-yellow-500" />
                ) : (
                  <PiStar className="text-xl text-gray-400 hover:text-yellow-500" />
                )}
              </button>
            </div>

            {/* Visibility Button */}
            {isOwner && (
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setVisibilityModalBotId(bot.id);
                    setNewVisibility(
                      bot.sharedScope === 'private' ? 'private' : 'all'
                    );
                  }}
                  className="rounded p-2 transition-colors hover:bg-gray-100"
                  title={
                    bot.sharedScope === 'private'
                      ? t('ragChatBot.private')
                      : t('ragChatBot.tenantPublic')
                  }>
                  {bot.sharedScope === 'private' ? (
                    <PiLock className="text-xl text-gray-500" />
                  ) : (
                    <PiUsers className="text-xl text-blue-500" />
                  )}
                </button>
              </div>
            )}

            {/* Three Dots Menu */}
            {isOwner && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setOpenMenuId(isMenuOpen ? null : bot.id)}
                  className="rounded p-2 transition-colors hover:bg-gray-100">
                  <PiDotsThreeVertical className="text-xl text-gray-500 hover:text-gray-700" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBot(bot.id);
                        setOpenMenuId(null);
                      }}>
                      <PiPencil /> {t('ragChatBot.editTitle')}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBot(bot.id);
                        setOpenMenuId(null);
                      }}>
                      <PiTrash /> {t('ragChatBot.delete')}
                    </button>
                  </div>
                )}
              </div>
            )}
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

      {/* 検索・フィルタリング設定部分 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          {/* 検索入力フォーム - 可変幅 */}
          <input
            type="text"
            placeholder={t('ragChatBot.searchPlaceholder')}
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            className="flex-1 rounded border border-black/30 p-2 outline-none"
          />

          {/* 公開範囲フィルタリング - 固定幅 */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            className="w-40 rounded border border-black/30 px-3 py-2 outline-none">
            <option value="none">{t('ragChatBot.noFilter', '指定なし')}</option>
            <option value="all">{t('ragChatBot.tenantPublic')}</option>
            <option value="private">{t('ragChatBot.private')}</option>
          </select>

          {/* スター付きのみ表示 */}
          <Switch
            checked={showOnlyStarred}
            onSwitch={setShowOnlyStarred}
            label={t('ragChatBot.starredOnly')}
          />
        </div>
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

      {/* Visibility Change Modal */}
      {visibilityModalBotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t('ragChatBot.changeVisibility')}
              </h3>
              <button
                onClick={() => setVisibilityModalBotId(null)}
                className="rounded p-1 hover:bg-gray-100">
                <PiX className="text-xl" />
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={newVisibility === 'private'}
                  onChange={(e) =>
                    setNewVisibility(e.target.value as 'private')
                  }
                  className="h-4 w-4"
                />
                <PiLock className="text-xl text-gray-500" />
                <div className="flex-1">
                  <div className="font-medium">{t('ragChatBot.private')}</div>
                  <div className="text-sm text-gray-600">
                    {t('ragChatBot.privateDescription')}
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  value="all"
                  checked={newVisibility === 'all'}
                  onChange={(e) => setNewVisibility(e.target.value as 'all')}
                  className="h-4 w-4"
                />
                <PiUsers className="text-xl text-blue-500" />
                <div className="flex-1">
                  <div className="font-medium">
                    {t('ragChatBot.tenantPublic')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('ragChatBot.tenantPublicDescription')}
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button outlined onClick={() => setVisibilityModalBotId(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() =>
                  handleChangeVisibility(visibilityModalBotId, newVisibility)
                }>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RagChatBotPage;
