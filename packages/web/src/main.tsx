import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import SummarizePage from './pages/SummarizePage.tsx';
import GenerateMail from './pages/GenerateMail.tsx';
import GenerateMessage from './pages/GenerateMessage.tsx';
import NotFound from './pages/NotFound.tsx';
import KendraSearchPage from './pages/KendraSearchPage.tsx';
import RagPage from './pages/RagPage.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
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
        path: '/summarize',
        element: <SummarizePage />,
      },
      {
        path: '/mail',
        element: <GenerateMail />,
      },
      {
        path: '/cs',
        element: <GenerateMessage />,
      },
      {
        path: '/rag',
        element: <RagPage />,
      },
      {
        path: '/kendra',
        element: <KendraSearchPage />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
