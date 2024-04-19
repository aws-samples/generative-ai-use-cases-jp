import '../../global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { proxyStore } from '../../app/proxyStore';
import ChatPage from './ChatPage';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

proxyStore.ready().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider store={proxyStore}>
        <DndProvider backend={HTML5Backend}>
          <ChatPage />
        </DndProvider>
      </Provider>
    </React.StrictMode>,
  );
});
