import './global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { proxyStore } from './app/proxyStore';
import SSOPage from './pages/sso/SSOPage';
import { Authenticator } from '@aws-amplify/ui-react';

proxyStore.ready().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider store={proxyStore}>
        <Authenticator.Provider>
          <SSOPage />
        </Authenticator.Provider>
      </Provider>
    </React.StrictMode>,
  );
});
