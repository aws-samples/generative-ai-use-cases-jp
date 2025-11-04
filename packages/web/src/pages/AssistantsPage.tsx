import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiMagnifyingGlass, PiPlus, PiRobot } from 'react-icons/pi';
import useBedrockChatApi, { BedrockChatBot } from '../hooks/useBedrockChatApi';
import LoadingWave from '../components/LoadingWave';

const AssistantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchStore } = useBedrockChatApi();

  const [assistants, setAssistants] = useState<BedrockChatBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch assistants from API
  const fetchAssistants = useCallback(async () => {
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
        starred: undefined,
        limit: 50,
        sort: 'usage' as const,
      };

      const data = await searchStore(params);
      // Only update state if request wasn't cancelled
      if (!signal.aborted) {
        setAssistants(data || []);
      }
    } catch (error) {
      // Only update state if request wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Failed to fetch assistants:', error);
        setAssistants([]);
      }
    } finally {
      // Only set loading to false if request wasn't cancelled
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchQuery, searchStore]);

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

  // Fetch assistants on filter changes
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

  // Featured assistants: starred assistants first, then top by usage (max 6)
  const featuredAssistants = [
    ...assistants.filter((a) => a.isStarred),
    ...assistants.filter((a) => !a.isStarred),
  ].slice(0, 6);
  const allAssistants = assistants;

  const handleStartChat = (assistantId: string) => {
    navigate(`/rag-chat-bot/chat/${assistantId}`);
  };

  const handleCreateAssistant = () => {
    navigate('/chat/assistants/create');
  };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          アシスタントを探す
        </h1>

        {/* Search Bar and Create Button */}
        <div className="mb-8 flex gap-4">
          <div className="relative flex-1">
            <PiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
            <input
              type="text"
              placeholder="アシスタントを検索"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCreateAssistant}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <PiPlus className="text-lg" />
            アシスタントを作成
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingWave />
          </div>
        ) : (
          <>
            {/* Featured Assistants Section */}
            {featuredAssistants.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 text-sm font-semibold text-gray-600">
                  おすすめのアシスタント
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.id}
                      assistant={assistant}
                      onStartChat={handleStartChat}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Assistants Section */}
            <section>
              <h2 className="mb-4 text-sm font-semibold text-gray-600">
                全てのアシスタント
              </h2>
              {allAssistants.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.id}
                      assistant={assistant}
                      onStartChat={handleStartChat}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <PiMagnifyingGlass className="mb-4 text-6xl" />
                  <p>検索条件に一致するアシスタントが見つかりませんでした</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

// Assistant Card Component
interface AssistantCardProps {
  assistant: BedrockChatBot;
  onStartChat: (assistantId: string) => void;
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  assistant,
  onStartChat,
}) => {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <PiRobot className="text-2xl text-blue-600" />
      </div>

      {/* Name */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {assistant.title}
      </h3>

      {/* Description */}
      <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-600">
        {assistant.description || 'アシスタントの説明はありません'}
      </p>

      {/* Start Chat Button */}
      <button
        onClick={() => onStartChat(assistant.id)}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
        チャットを始める
      </button>
    </div>
  );
};

export default AssistantsPage;
