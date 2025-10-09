import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  RouteObject,
} from 'react-router-dom';
import { MODELS } from '../hooks/useModel';
import { optimizePromptEnabled } from '../hooks/useOptimizePrompt';
import useUseCases from '../hooks/useUseCases';
import AuthWithUserpool from './AuthWithUserpool';
import AuthWithSAML from './AuthWithSAML';
import AuthWithSamlOrUserpool from './AuthWithSamlOrUserpool';
import App from '../App';
import UseCaseBuilderRoot from '../UseCaseBuilderRoot';
import LandingPage from '../pages/LandingPage';
import Setting from '../pages/Setting';
import StatPage from '../pages/StatPage';
import ChatPage from '../pages/ChatPage';
import SharedChatPage from '../pages/SharedChatPage';
import SummarizePage from '../pages/SummarizePage';
import GenerateTextPage from '../pages/GenerateTextPage';
import TranslatePage from '../pages/TranslatePage';
import VideoAnalyzerPage from '../pages/VideoAnalyzerPage';
import NotFound from '../pages/NotFound';
import RagPage from '../pages/RagPage';
import RagKnowledgeBasePage from '../pages/RagKnowledgeBasePage';
import WebContent from '../pages/WebContent';
import GenerateImagePage from '../pages/GenerateImagePage';
import GenerateVideoPage from '../pages/GenerateVideoPage';
import OptimizePromptPage from '../pages/OptimizePromptPage';
import TranscribePage from '../pages/TranscribePage';
import MeetingMinutesPage from '../pages/MeetingMinutesPage';
import AgentChatPage from '../pages/AgentChatPage';
import FlowChatPage from '../pages/FlowChatPage';
import VoiceChatPage from '../pages/VoiceChatPage';
import McpChatPage from '../pages/McpChatPage';
import GenerateDiagramPage from '../pages/GenerateDiagramPage';
import PptxGenerationPage from '../pages/PptxGenerationPage';
import WriterPage from '../pages/WriterPage';
import RagChatBotPage from '../pages/RagChatBotPage';
import RagChatBotEditPage from '../pages/RagChatBotEditPage';
import RagChatBotChatPage from '../pages/RagChatBotChatPage';
import RagChatBotHistoryPage from '../pages/RagChatBotHistoryPage';
import AdminPortal from '../pages/AdminPortal';
import UseCaseBuilderEditPage from '../pages/useCaseBuilder/UseCaseBuilderEditPage';
import UseCaseBuilderExecutePage from '../pages/useCaseBuilder/UseCaseBuilderExecutePage';
import UseCaseBuilderSamplesPage from '../pages/useCaseBuilder/UseCaseBuilderSamplesPage';
import UseCaseBuilderMyUseCasePage from '../pages/useCaseBuilder/UseCaseBuilderMyUseCasePage';

interface DynamicRouterProps {
  ragEnabled: boolean;
  ragKnowledgeBaseEnabled: boolean;
  samlAuthEnabled: boolean;
  samlDefaultAuthEnabled: boolean;
  agentEnabled: boolean;
  inlineAgents: boolean;
  mcpEnabled: boolean;
  pptxEnabled: boolean;
  useCaseBuilderEnabled: boolean;
}

const DynamicRouter: React.FC<DynamicRouterProps> = ({
  ragEnabled,
  ragKnowledgeBaseEnabled,
  samlAuthEnabled,
  samlDefaultAuthEnabled,
  agentEnabled,
  inlineAgents,
  mcpEnabled,
  pptxEnabled,
  useCaseBuilderEnabled,
}) => {
  const { enabled, loading } = useUseCases();
  const {
    visionEnabled,
    imageGenModelIds,
    videoGenModelIds,
    speechToSpeechModelIds,
  } = MODELS;

  // Show loading during authentication or while fetching use case configuration
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const routes: RouteObject[] = [
    {
      path: '/',
      element: <LandingPage />,
    },
    {
      path: '/setting',
      element: <Setting />,
    },
    {
      path: '/stats',
      element: <StatPage />,
    },
    {
      path: '/chat',
      element: <ChatPage />,
    },
    {
      path: '/chat/:chatId',
      element: <ChatPage />,
    },
    {
      path: '/share/:shareId',
      element: <SharedChatPage />,
    },
    enabled('generate')
      ? {
          path: '/generate',
          element: <GenerateTextPage />,
        }
      : null,
    enabled('summarize')
      ? {
          path: '/summarize',
          element: <SummarizePage />,
        }
      : null,
    enabled('meetingMinutes')
      ? {
          path: '/meeting-minutes',
          element: <MeetingMinutesPage />,
        }
      : null,
    enabled('writer')
      ? {
          path: '/writer',
          element: <WriterPage />,
        }
      : null,
    enabled('translate')
      ? {
          path: '/translate',
          element: <TranslatePage />,
        }
      : null,
    enabled('webContent')
      ? {
          path: '/web-content',
          element: <WebContent />,
        }
      : null,
    imageGenModelIds.length > 0 && enabled('image')
      ? {
          path: '/image',
          element: <GenerateImagePage />,
        }
      : null,
    videoGenModelIds.length > 0 && enabled('video')
      ? {
          path: '/video',
          element: <GenerateVideoPage />,
        }
      : null,
    enabled('diagram')
      ? {
          path: '/diagram',
          element: <GenerateDiagramPage />,
        }
      : null,
    pptxEnabled && enabled('pptx')
      ? {
          path: '/pptx',
          element: <PptxGenerationPage />,
        }
      : null,
    optimizePromptEnabled
      ? {
          path: '/optimize',
          element: <OptimizePromptPage />,
        }
      : null,
    {
      path: '/transcribe',
      element: <TranscribePage />,
    },
    {
      path: '/flow-chat',
      element: <FlowChatPage />,
    },
    visionEnabled && enabled('videoAnalyzer')
      ? {
          path: '/video-analyzer',
          element: <VideoAnalyzerPage />,
        }
      : null,
    ragEnabled
      ? {
          path: '/rag',
          element: <RagPage />,
        }
      : null,
    ragKnowledgeBaseEnabled
      ? {
          path: '/rag-knowledge-base',
          element: <RagKnowledgeBasePage />,
        }
      : null,
    agentEnabled && !inlineAgents
      ? {
          path: '/agent',
          element: <AgentChatPage />,
        }
      : null,
    agentEnabled && inlineAgents
      ? {
          path: '/agent/:agentName',
          element: <AgentChatPage />,
        }
      : null,
    speechToSpeechModelIds.length > 0 && enabled('voiceChat')
      ? {
          path: '/voice-chat',
          element: <VoiceChatPage />,
        }
      : null,
    mcpEnabled
      ? {
          path: '/mcp',
          element: <McpChatPage />,
        }
      : null,
    {
      path: '/rag-chat-bot',
      element: <RagChatBotPage />,
    },
    {
      path: '/rag-chat-bot/create',
      element: <RagChatBotEditPage />,
    },
    {
      path: '/rag-chat-bot/edit/:botId',
      element: <RagChatBotEditPage />,
    },
    {
      path: '/rag-chat-bot/chat/:botId',
      element: <RagChatBotChatPage />,
    },
    {
      path: '/rag-chat-bot/chat/:botId/:conversationId',
      element: <RagChatBotChatPage />,
    },
    {
      path: '/rag-chat-bot/history',
      element: <RagChatBotHistoryPage />,
    },
    {
      path: '/admin',
      element: <AdminPortal />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ].flatMap((r) => (r !== null ? [r] : []));

  const useCaseBuilderRoutes: RouteObject[] = [
    {
      path: '/use-case-builder',
      element: <UseCaseBuilderSamplesPage />,
    },
    {
      path: `/use-case-builder/my-use-case`,
      element: <UseCaseBuilderMyUseCasePage />,
    },
    {
      path: `/use-case-builder/new`,
      element: <UseCaseBuilderEditPage />,
    },
    {
      path: `/use-case-builder/edit/:useCaseId`,
      element: <UseCaseBuilderEditPage />,
    },
    {
      path: `/use-case-builder/execute/:useCaseId`,
      element: <UseCaseBuilderExecutePage />,
    },
    {
      path: `/use-case-builder/setting`,
      element: <Setting />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ].flatMap((r) => (r !== null ? [r] : []));

  const router = createBrowserRouter([
    {
      path: '/',
      element: samlAuthEnabled ? (
        samlDefaultAuthEnabled ? (
          <AuthWithSamlOrUserpool>
            <App />
          </AuthWithSamlOrUserpool>
        ) : (
          <AuthWithSAML>
            <App />
          </AuthWithSAML>
        )
      ) : (
        <AuthWithUserpool>
          <App />
        </AuthWithUserpool>
      ),
      children: routes,
    },
    ...(useCaseBuilderEnabled
      ? [
          {
            path: '/use-case-builder',
            element: samlAuthEnabled ? (
              samlDefaultAuthEnabled ? (
                <AuthWithSamlOrUserpool>
                  <UseCaseBuilderRoot />
                </AuthWithSamlOrUserpool>
              ) : (
                <AuthWithSAML>
                  <UseCaseBuilderRoot />
                </AuthWithSAML>
              )
            ) : (
              <AuthWithUserpool>
                <UseCaseBuilderRoot />
              </AuthWithUserpool>
            ),
            children: useCaseBuilderRoutes,
          },
        ]
      : []),
  ]);

  return <RouterProvider router={router} />;
};

export default DynamicRouter;
