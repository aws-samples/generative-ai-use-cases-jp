import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthWithUserpool from './components/AuthWithUserpool';
import AuthWithSAML from './components/AuthWithSAML';
import './index.css';
import {
  RouterProvider,
  createBrowserRouter,
  RouteObject,
} from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Setting from './pages/Setting';
import ChatPage from './pages/ChatPage';
import SharedChatPage from './pages/SharedChatPage';
import SummarizePage from './pages/SummarizePage';
import GenerateTextPage from './pages/GenerateTextPage';
import EditorialPage from './pages/EditorialPage';
import TranslatePage from './pages/TranslatePage';
import VideoAnalyzerPage from './pages/VideoAnalyzerPage';
import NotFound from './pages/NotFound';
import KendraSearchPage from './pages/KendraSearchPage';
import RagPage from './pages/RagPage';
import RagKnowledgeBasePage from './pages/RagKnowledgeBasePage';
import WebContent from './pages/WebContent';
import GenerateImagePage from './pages/GenerateImagePage';
import OptimizePromptPage from './pages/OptimizePromptPage';
import TranscribePage from './pages/TranscribePage';
import AgentChatPage from './pages/AgentChatPage.tsx';
import PromptFlowChatPage from './pages/PromptFlowChatPage';
import { MODELS } from './hooks/useModel';
import { Authenticator } from '@aws-amplify/ui-react';
import UseCaseBuilderEditPage from './pages/useCaseBuilder/UseCaseBuilderEditPage.tsx';
import App from './App.tsx';
import UseCaseBuilderRoot from './UseCaseBuilderRoot.tsx';
import UseCaseBuilderExecutePage from './pages/useCaseBuilder/UseCaseBuilderExecutePage.tsx';
import UseCaseBuilderSamplesPage from './pages/useCaseBuilder/UseCaseBuilderSamplesPage.tsx';
import UseCaseBuilderMyUseCasePage from './pages/useCaseBuilder/UseCaseBuilderMyUseCasePage.tsx';
import { optimizePromptEnabled } from './hooks/useOptimizePrompt';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const samlAuthEnabled: boolean =
  import.meta.env.VITE_APP_SAMLAUTH_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const { visionEnabled } = MODELS;
const useCaseBuilderEnabled: boolean =
  import.meta.env.VITE_APP_USE_CASE_BUILDER_ENABLED === 'true';

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
  {
    path: '/generate',
    element: <GenerateTextPage />,
  },
  {
    path: '/summarize',
    element: <SummarizePage />,
  },
  {
    path: '/editorial',
    element: <EditorialPage />,
  },
  {
    path: '/translate',
    element: <TranslatePage />,
  },
  {
    path: '/web-content',
    element: <WebContent />,
  },
  {
    path: '/image',
    element: <GenerateImagePage />,
  },
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
    path: '/prompt-flow-chat',
    element: <PromptFlowChatPage />,
  },
  visionEnabled
    ? {
        path: '/video',
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
  ragEnabled
    ? {
        path: '/kendra',
        element: <KendraSearchPage />,
      }
    : null,
  agentEnabled
    ? {
        path: '/agent',
        element: <AgentChatPage />,
      }
    : null,
  {
    path: '*',
    element: <NotFound />,
  },
].flatMap((r) => (r !== null ? [r] : []));

export const ROUTE_INDEX_USE_CASE_BUILDER = '/use-case-builder';
const useCaseBuilderRoutes: RouteObject[] = [
  {
    path: ROUTE_INDEX_USE_CASE_BUILDER,
    element: <UseCaseBuilderSamplesPage />,
  },
  {
    path: `${ROUTE_INDEX_USE_CASE_BUILDER}/my-use-case`,
    element: <UseCaseBuilderMyUseCasePage />,
  },
  {
    path: `${ROUTE_INDEX_USE_CASE_BUILDER}/new`,
    element: <UseCaseBuilderEditPage />,
  },
  {
    path: `${ROUTE_INDEX_USE_CASE_BUILDER}/edit/:useCaseId`,
    element: <UseCaseBuilderEditPage />,
  },
  {
    path: `${ROUTE_INDEX_USE_CASE_BUILDER}/execute/:useCaseId`,
    element: <UseCaseBuilderExecutePage />,
  },
  {
    path: `${ROUTE_INDEX_USE_CASE_BUILDER}/setting`,
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
      <AuthWithSAML>
        <App />
      </AuthWithSAML>
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
          path: ROUTE_INDEX_USE_CASE_BUILDER,
          element: samlAuthEnabled ? (
            <AuthWithSAML>
              <UseCaseBuilderRoot />
            </AuthWithSAML>
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <RouterProvider router={router} />
    </Authenticator.Provider>
  </React.StrictMode>
);
