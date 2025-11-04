import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RoleMonitorProvider } from './components/RoleMonitorProvider';
import {
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiChatsCircle,
  PiPenNib,
  PiTranslate,
  PiImages,
  PiVideoLight,
  PiSpeakerHighBold,
  PiGlobe,
  PiRobot,
  PiVideoCamera,
  PiFlowArrow,
  PiMagicWand,
  PiMicrophoneBold,
  PiTreeStructure,
  PiNotebook,
  PiGraph,
  PiPresentation,
} from 'react-icons/pi';
import '@aws-amplify/ui-react/styles.css';
import PopupInterUseCasesDemo from './components/PopupInterUseCasesDemo';
import useInterUseCases from './hooks/useInterUseCases';
import { MODELS } from './hooks/useModel';
import useScreen from './hooks/useScreen';
import { optimizePromptEnabled } from './hooks/useOptimizePrompt';
import useUseCases from './hooks/useUseCases';
import { useTranslation } from 'react-i18next';
import GlobalLayout from './components/GlobalLayout';
import { SidebarItemProps } from './components/Sidebar';
import { useSettings } from './hooks/useSettings';
import i18n from './i18n/config';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const inlineAgents: boolean = import.meta.env.VITE_APP_INLINE_AGENTS === 'true';
const mcpEnabled: boolean = import.meta.env.VITE_APP_MCP_ENABLED === 'true';
const pptxEnabled: boolean = import.meta.env.VITE_APP_PPTX_ENABLED === 'true';
const {
  visionEnabled,
  imageGenModelIds,
  videoGenModelIds,
  speechToSpeechModelIds,
  agentNames,
  flowChatEnabled,
} = MODELS;

const App: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isShow } = useInterUseCases();
  const { screen, notifyScreen, scrollTopAnchorRef, scrollBottomAnchorRef } =
    useScreen();
  const { enabled } = useUseCases();
  const { settings } = useSettings();

  const sidebarItems: SidebarItemProps[] = [
    {
      label: t('navigation.chat'),
      to: '/chat',
      icon: <PiChatsCircle />,
      display: 'usecase' as const,
    },
    ragEnabled
      ? {
          label: t('navigation.ragChat'),
          to: '/rag',
          icon: <PiChatCircleText />,
          display: 'usecase' as const,
        }
      : null,
    ragKnowledgeBaseEnabled
      ? {
          label: t('navigation.ragChat'),
          to: '/rag-knowledge-base',
          icon: <PiChatCircleText />,
          display: 'usecase' as const,
        }
      : null,
    agentEnabled && !inlineAgents
      ? {
          label: t('navigation.agentChat'),
          to: '/agent',
          icon: <PiRobot />,
          display: 'usecase' as const,
        }
      : null,
    ...(agentEnabled && inlineAgents
      ? agentNames.map((name: string) => {
          return {
            label: name,
            to: `/agent/${name}`,
            icon: <PiRobot />,
            display: 'usecase' as const,
          };
        })
      : []),
    mcpEnabled
      ? {
          label: t('mcp_chat.title'),
          to: '/mcp',
          icon: <PiGraph />,
          display: 'usecase' as const,
        }
      : null,
    flowChatEnabled
      ? {
          label: t('navigation.flowChat'),
          to: '/flow-chat',
          icon: <PiFlowArrow />,
          display: 'usecase' as const,
        }
      : null,
    speechToSpeechModelIds.length > 0 && enabled('voiceChat')
      ? {
          label: t('navigation.voiceChat'),
          to: '/voice-chat',
          icon: <PiMicrophoneBold />,
          display: 'usecase' as const,
        }
      : null,
    enabled('generate')
      ? {
          label: t('navigation.textGeneration'),
          to: '/generate',
          icon: <PiPencil />,
          display: 'usecase' as const,
        }
      : null,
    enabled('summarize')
      ? {
          label: t('navigation.summary'),
          to: '/summarize',
          icon: <PiNote />,
          display: 'usecase' as const,
        }
      : null,
    enabled('meetingMinutes')
      ? {
          label: t('navigation.meetingMinutes'),
          to: '/meeting-minutes',
          icon: <PiNotebook />,
          display: 'usecase' as const,
        }
      : null,
    enabled('writer')
      ? {
          label: t('navigation.writing'),
          to: '/writer',
          icon: <PiPenNib />,
          display: 'usecase' as const,
        }
      : null,
    enabled('translate')
      ? {
          label: t('navigation.translation'),
          to: '/translate',
          icon: <PiTranslate />,
          display: 'usecase' as const,
        }
      : null,
    enabled('webContent')
      ? {
          label: t('navigation.webContentExtraction'),
          to: '/web-content',
          icon: <PiGlobe />,
          display: 'usecase' as const,
        }
      : null,
    imageGenModelIds.length > 0 && enabled('image')
      ? {
          label: t('navigation.imageGeneration'),
          to: '/image',
          icon: <PiImages />,
          display: 'usecase' as const,
        }
      : null,
    videoGenModelIds.length > 0 && enabled('video')
      ? {
          label: t('navigation.videoGeneration'),
          to: '/video',
          icon: <PiVideoLight />,
          display: 'usecase' as const,
        }
      : null,
    visionEnabled && enabled('videoAnalyzer')
      ? {
          label: t('navigation.videoAnalysis'),
          to: '/video-analyzer',
          icon: <PiVideoCamera />,
          display: 'usecase' as const,
        }
      : null,
    enabled('diagram')
      ? {
          label: t('navigation.diagramGeneration'),
          to: '/diagram',
          icon: <PiTreeStructure />,
          display: 'usecase' as const,
        }
      : null,
    pptxEnabled && enabled('pptx')
      ? {
          label: t('navigation.pptxGeneration'),
          to: '/pptx',
          icon: <PiPresentation />,
          display: 'usecase' as const,
        }
      : null,
    {
      label: t('navigation.speechRecognition'),
      to: '/transcribe',
      icon: <PiSpeakerHighBold />,
      display: 'tool' as const,
    },
    optimizePromptEnabled
      ? {
          label: t('navigation.promptOptimization'),
          to: '/optimize',
          icon: <PiMagicWand />,
          display: 'tool' as const,
        }
      : null,
  ].flatMap((i) => (i !== null ? [i] : []));

  // When there is no scroll event (e.g. moving from the top of the page to the top of the page)
  // The top/bottom determination is not made, so re-determine it according to the change of pathname
  useEffect(() => {
    if (screen.current) {
      notifyScreen(screen.current);
    }
  }, [pathname, screen, notifyScreen]);

  // Apply language settings
  useEffect(() => {
    if (settings.language !== 'auto') {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);

  return (
    <RoleMonitorProvider>
      {/* Show when inter-use case connection is enabled */}
      {isShow && <PopupInterUseCasesDemo />}

      <GlobalLayout
        sidebarItems={sidebarItems}
        contentRef={screen}
        scrollTopAnchor={<div ref={scrollTopAnchorRef}></div>}
        scrollBottomAnchor={<div ref={scrollBottomAnchorRef}></div>}
      />
    </RoleMonitorProvider>
  );
};

export default App;
