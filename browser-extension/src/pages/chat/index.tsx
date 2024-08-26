import '../../global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { proxyStore } from '../../app/proxyStore';
import ChatPage from './ChatPage';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Authenticator } from '@aws-amplify/ui-react';

proxyStore.ready().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider store={proxyStore}>
        <Authenticator.Provider>
          <DndProvider backend={HTML5Backend}>
            <ChatPage />
          </DndProvider>
        </Authenticator.Provider>
      </Provider>
    </React.StrictMode>,
  );
});
