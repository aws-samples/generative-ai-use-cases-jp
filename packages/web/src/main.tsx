import './i18n/config';
import './configureAmplify';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { SWRConfig } from 'swr';
import { Authenticator } from '@aws-amplify/ui-react';
import { Toaster } from 'sonner';
import DynamicRouter from './components/DynamicRouter';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const samlAuthEnabled: boolean =
  import.meta.env.VITE_APP_SAMLAUTH_ENABLED === 'true';
const samlDefaultAuthEnabled: boolean =
  import.meta.env.VITE_APP_SAML_DEFAULT_AUTH_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const inlineAgents: boolean = import.meta.env.VITE_APP_INLINE_AGENTS === 'true';
const mcpEnabled: boolean = import.meta.env.VITE_APP_MCP_ENABLED === 'true';
const pptxEnabled: boolean = import.meta.env.VITE_APP_PPTX_ENABLED === 'true';
const useCaseBuilderEnabled: boolean =
  import.meta.env.VITE_APP_USE_CASE_BUILDER_ENABLED === 'true';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
    <React.Suspense fallback={<div>Loading...</div>}>
      <Authenticator.Provider>
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true,
          }}>
          <DynamicRouter
            ragEnabled={ragEnabled}
            ragKnowledgeBaseEnabled={ragKnowledgeBaseEnabled}
            samlAuthEnabled={samlAuthEnabled}
            samlDefaultAuthEnabled={samlDefaultAuthEnabled}
            agentEnabled={agentEnabled}
            inlineAgents={inlineAgents}
            mcpEnabled={mcpEnabled}
            pptxEnabled={pptxEnabled}
            useCaseBuilderEnabled={useCaseBuilderEnabled}
          />
        </SWRConfig>
        <Toaster />
      </Authenticator.Provider>
    </React.Suspense>
  </React.StrictMode>
);