import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PiMagnifyingGlass,
  PiPlus,
  PiRobot,
  PiPencil,
  PiEye,
  PiLock,
} from 'react-icons/pi';
import useAssistantApi from '../hooks/useAssistantApi';
import useUserInfo from '../hooks/useUserInfo';
import useRoleMonitor from '../hooks/useRoleMonitor';
import useTenantUseCaseConfig from '../hooks/useTenantUseCaseConfig';
import { Assistant } from 'generative-ai-use-cases';
import LoadingWave from '../components/LoadingWave';
import AssistantStatusTag from '../components/assistants/AssistantStatusTag';
import Tooltip from '../components/Tooltip';
import ModalDialogVisibilityToggle from '../components/assistants/ModalDialogVisibilityToggle';
import {
  isSyncBlocking,
  isStatusFinal,
} from '../components/assistants/statusMetadata';

const AssistantsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { listAssistants, updateAssistantVisibility } = useAssistantApi();
  const { userInfo } = useUserInfo();
  // TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround)
  // Check if assistant creation requires admin privileges (configurable via cdk.json)
  const { tenantConfig } = useTenantUseCaseConfig();
  const { isAdmin } = useRoleMonitor();

  // TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround)
  // Determine if user can create assistants based on configuration
  const assistantCreationRequiresAdmin =
    tenantConfig?.assistantCreationRequiresAdmin ?? true;
  const canCreateAssistant = !assistantCreationRequiresAdmin || isAdmin;

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [visibilityDialog, setVisibilityDialog] = useState<{
    isOpen: boolean;
    assistant: Assistant | null;
  }>({ isOpen: false, assistant: null });
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch assistants from API
  const fetchAssistants = useCallback(
    async (isPollingRequest = false) => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Only show loading spinner on initial load, not during polling
      if (!isPollingRequest) {
        setIsInitialLoad(true);
      }

      try {
        const response = await listAssistants({ limit: 100 }, signal);
        // Only update state if request wasn't cancelled
        if (!signal.aborted) {
          let filtered = response.assistants || [];

          // Client-side search filtering
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (a) =>
                a.name.toLowerCase().includes(query) ||
                a.description?.toLowerCase().includes(query)
            );
          }

          setAssistants(filtered);
        }
      } catch (error) {
        // Only update state if request wasn't cancelled (check local signal)
        if (!signal.aborted) {
          console.error('Failed to fetch assistants:', error);
          setAssistants([]);
        }
      } finally {
        // Only set loading to false if request wasn't cancelled (check local signal)
        if (!signal.aborted && !isPollingRequest) {
          setIsInitialLoad(false);
        }
      }
    },
    [searchQuery, listAssistants]
  );

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

  // Fetch assistants on search changes
  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Polling for assistants with non-final sync status
  useEffect(() => {
    const hasNonFinalStatus = assistants.some(
      (a) => a.ragEnabled && !isStatusFinal(a.syncStatus)
    );

    if (!hasNonFinalStatus) {
      return;
    }

    const pollInterval = setInterval(() => {
      fetchAssistants(true); // Pass true to indicate this is a polling request
    }, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [assistants, fetchAssistants]);

  // Featured assistants: first 6
  const featuredAssistants = assistants.slice(0, 6);
  const allAssistants = assistants;

  const handleStartChat = (assistant: Assistant) => {
    // Block navigation if sync is in blocking state
    if (assistant.ragEnabled && isSyncBlocking(assistant.syncStatus)) {
      alert(t('assistant.statusMessage.blocking'));
      return;
    }
    navigate(`/chat/assistants/chat/${assistant.assistantId}`);
  };

  const handleEditAssistant = (assistantId: string) => {
    navigate(`/chat/assistants/edit/${assistantId}`);
  };

  const handleCreateAssistant = () => {
    navigate('/chat/assistants/create');
  };

  const handleVisibilityClick = (assistant: Assistant) => {
    setVisibilityDialog({ isOpen: true, assistant });
  };

  const handleVisibilityConfirm = async () => {
    if (!visibilityDialog.assistant) return;

    setIsUpdatingVisibility(true);
    try {
      const newVisibility =
        visibilityDialog.assistant.visibility === 'private'
          ? 'public'
          : 'private';
      const updatedAssistant = await updateAssistantVisibility(
        visibilityDialog.assistant.assistantId,
        newVisibility
      );

      // Update the assistant in the list
      setAssistants((prev) =>
        prev.map((a) =>
          a.assistantId === updatedAssistant.assistantId ? updatedAssistant : a
        )
      );

      setVisibilityDialog({ isOpen: false, assistant: null });
    } catch (error) {
      console.error('Failed to update visibility:', error);
      alert(t('assistant.visibility.updateFailed'));
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleVisibilityClose = () => {
    if (!isUpdatingVisibility) {
      setVisibilityDialog({ isOpen: false, assistant: null });
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          {t('assistant.title')}
        </h1>

        {/* Search Bar and Create Button */}
        <div className="mb-8 flex gap-4">
          <div className="relative flex-1">
            <PiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
            <input
              type="text"
              placeholder={t('assistant.searchPlaceholder')}
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* TODO: Update after implementing AuthZ - Currently only tenantAdmin users can create assistants (workaround) */}
          {/* Show create button based on assistantCreationRequiresAdmin config */}
          {canCreateAssistant && (
            <button
              onClick={handleCreateAssistant}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <PiPlus className="text-lg" />
              {t('assistant.createNew')}
            </button>
          )}
        </div>

        {/* Loading State */}
        {isInitialLoad ? (
          <div className="flex justify-center py-12">
            <LoadingWave />
          </div>
        ) : (
          <>
            {/* Featured Assistants Section */}
            {featuredAssistants.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 text-sm font-semibold text-gray-600">
                  {t('assistant.popularAssistants')}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.assistantId}
                      assistant={assistant}
                      currentUserId={userInfo?.username}
                      onStartChat={handleStartChat}
                      onEdit={handleEditAssistant}
                      onVisibilityClick={handleVisibilityClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Assistants Section */}
            <section>
              <h2 className="mb-4 text-sm font-semibold text-gray-600">
                {t('assistant.allAssistants')}
              </h2>
              {allAssistants.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.assistantId}
                      assistant={assistant}
                      currentUserId={userInfo?.username}
                      onStartChat={handleStartChat}
                      onEdit={handleEditAssistant}
                      onVisibilityClick={handleVisibilityClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <PiMagnifyingGlass className="mb-4 text-6xl" />
                  <p>{t('assistant.noAssistants')}</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Visibility Toggle Dialog */}
      {visibilityDialog.assistant && (
        <ModalDialogVisibilityToggle
          isOpen={visibilityDialog.isOpen}
          assistantName={visibilityDialog.assistant.name}
          currentVisibility={visibilityDialog.assistant.visibility}
          isUpdating={isUpdatingVisibility}
          onConfirm={handleVisibilityConfirm}
          onClose={handleVisibilityClose}
        />
      )}
    </div>
  );
};

// Assistant Card Component
interface AssistantCardProps {
  assistant: Assistant;
  currentUserId?: string;
  onStartChat: (assistant: Assistant) => void;
  onEdit: (assistantId: string) => void;
  onVisibilityClick: (assistant: Assistant) => void;
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  assistant,
  currentUserId,
  onStartChat,
  onEdit,
  onVisibilityClick,
}) => {
  const { t } = useTranslation();
  const isBlocked =
    assistant.ragEnabled && isSyncBlocking(assistant.syncStatus);
  const isOwner = currentUserId === assistant.userId;

  const chatButton = (
    <button
      onClick={() => onStartChat(assistant)}
      disabled={isBlocked}
      className={`flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium transition-colors ${
        isBlocked
          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
          : 'bg-white text-gray-700 hover:bg-gray-50'
      }`}>
      {t('assistant.chat')}
    </button>
  );

  return (
    <div className="relative flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Top Right: Visibility Icon (Owner Only) and Status Tag */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        {isOwner && (
          <button
            onClick={() => onVisibilityClick(assistant)}
            className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
            title={t(`assistant.visibility.${assistant.visibility}`)}>
            {assistant.visibility === 'public' ? (
              <PiEye className="text-lg" />
            ) : (
              <PiLock className="text-lg" />
            )}
          </button>
        )}
        <AssistantStatusTag assistant={assistant} />
      </div>

      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <PiRobot className="text-2xl text-blue-600" />
      </div>

      {/* Name */}
      <h3 className="mb-2 pr-20 text-lg font-semibold text-gray-900">
        {assistant.name}
      </h3>

      {/* Description */}
      <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-600">
        {assistant.description || t('assistant.description')}
      </p>

      {/* Helper Text for Syncing */}
      {isBlocked && (
        <p className="mb-2 text-xs text-gray-500">
          {t('assistant.statusMessage.blocking')}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isBlocked ? (
          <Tooltip
            message={t('assistant.statusMessage.blocking')}
            position="center">
            {chatButton}
          </Tooltip>
        ) : (
          chatButton
        )}
        <button
          onClick={() => onEdit(assistant.assistantId)}
          className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          title={t('assistant.editTitle')}>
          <PiPencil />
        </button>
      </div>
    </div>
  );
};

export default AssistantsPage;
