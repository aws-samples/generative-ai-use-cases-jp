import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  RouterProvider,
  createBrowserRouter,
  RouteObject,
} from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import SummarizePage from './pages/SummarizePage.tsx';
import GenerateTextPage from './pages/GenerateTextPage.tsx';
import EditorialPage from './pages/EditorialPage.tsx';
import TranslatePage from './pages/TranslatePage.tsx';
import NotFound from './pages/NotFound.tsx';
import KendraSearchPage from './pages/KendraSearchPage.tsx';
import RagPage from './pages/RagPage.tsx';
import GenerateImagePage from './pages/GenerateImagePage.tsx';
import TranscribePage from './pages/TranscribePage.tsx';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
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
    path: '/image',
    element: <GenerateImagePage />},{
    path: '/transcribe',
    element: <TranscribePage />,
  },
  ragEnabled
    ? {
        path: '/rag',
        element: <RagPage />,
      }
    : null,
  ragEnabled
    ? {
        path: '/kendra',
        element: <KendraSearchPage />,
      }
    : null,
  {
    path: '*',
    element: <NotFound />,
  },
].flatMap((r) => (r !== null ? [r] : []));

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: routes,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
