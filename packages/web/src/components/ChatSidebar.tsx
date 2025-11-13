import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BaseProps } from '../@types/common';
import { useNavigate, useLocation } from 'react-router-dom';
import { PiPlus, PiMagnifyingGlass, PiRobot } from 'react-icons/pi';
import ChatList from './ChatList';
import { useTranslation } from 'react-i18next';
import useAssistantApi from '../hooks/useAssistantApi';
import { Assistant } from 'generative-ai-use-cases';

type Props = BaseProps & {
  onNewChat?: () => void;
};

const ChatSidebar: React.FC<Props> = ({ onNewChat }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { listAssistants } = useAssistantApi();

  const [featuredAssistants, setFeaturedAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleNewChat = () => {
    // If already on /chat page, just reset the chat
    if (location.pathname === '/chat' && onNewChat) {
      onNewChat();
    } else {
      // Otherwise, navigate to /chat
      navigate('/chat');
    }
  };

  // Check if assistants page is active
  const isAssistantsActive = location.pathname.startsWith('/chat/assistants');

  // Fetch featured assistants (max 6)
  const fetchFeaturedAssistants = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const response = await listAssistants({ limit: 6 });
      // Featured assistants: first 6 assistants
      setFeaturedAssistants(response.assistants || []);
    } catch (error) {
      console.error('Failed to fetch featured assistants:', error);
      setFeaturedAssistants([]);
    } finally {
      setLoading(false);
    }
  }, [listAssistants]);

  // Fetch featured assistants on mount (but not on assistants list page to avoid duplicate requests)
  useEffect(() => {
    // Skip fetching only if we're on the main assistants list page (AssistantsPage will handle it)
    // Still fetch for edit/chat/history pages
    const isAssistantsListPage = location.pathname === '/chat/assistants';
    if (!isAssistantsListPage) {
      fetchFeaturedAssistants();
    }
    // Cleanup AbortController on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFeaturedAssistants, location.pathname]);

  const handleAssistantClick = (assistantId: string) => {
    navigate(`/chat/assistants/chat/${assistantId}`);
  };

  return (
    <nav className="flex h-screen w-64 flex-col bg-gray-50 text-sm text-gray-900">
      {/* New Chat Button */}
      <div className="border-b border-gray-200 p-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700">
          <PiPlus className="text-lg" />
          <span>{t('chat.button.newChat')}</span>
        </button>
      </div>

      {/* Assistants Section */}
      <div className="border-b border-gray-200 p-3">
        <div className="mb-2 text-xs font-semibold text-gray-600">
          アシスタント
        </div>

        {/* Featured Assistants List */}
        {!loading && featuredAssistants.length > 0 && (
          <div className="mb-2 space-y-1">
            {featuredAssistants.map((assistant) => (
              <button
                key={assistant.assistantId}
                onClick={() => handleAssistantClick(assistant.assistantId)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-600 transition-colors hover:bg-gray-100"
                title={assistant.description || assistant.name}>
                <PiRobot className="shrink-0 text-base text-blue-600" />
                <span className="truncate">{assistant.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search Assistants Button */}
        <button
          onClick={() => navigate('/chat/assistants')}
          className={`flex w-full items-center justify-start gap-2 rounded px-2 py-1.5 transition-colors ${
            isAssistantsActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`}>
          <PiMagnifyingGlass className="text-base" />
          <span>アシスタントを探す</span>
        </button>
      </div>

      {/* Chat History Section */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-3 py-2 text-xs font-semibold text-gray-600">
          チャット履歴
        </div>
        <div className="scrollbar-thin scrollbar-thumb-gray-300 flex-1 overflow-y-auto px-2">
          <ChatList searchWords={[]} />
        </div>
      </div>
    </nav>
  );
};

export default ChatSidebar;
