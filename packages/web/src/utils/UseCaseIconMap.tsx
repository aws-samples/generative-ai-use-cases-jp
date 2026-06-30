import React from 'react';
import {
  PiChat,
  PiChatsCircle,
  PiChatCircleText,
  PiRobot,
  PiGraph,
  PiFlowArrow,
  PiMicrophoneBold,
  PiPencil,
  PiNote,
  PiNotebook,
  PiPenNib,
  PiTranslate,
  PiGlobe,
  PiImages,
  PiVideoLight,
  PiVideoCamera,
  PiTreeStructure,
  PiMagnifyingGlass,
} from 'react-icons/pi';

/**
 * Maps usecase path (stored in Chat.usecase) to the corresponding icon.
 * The usecase value is extracted from the page route, e.g. "/chat", "/meeting-minutes".
 */
const useCaseIconMap: Record<string, React.ReactNode> = {
  '/chat': <PiChatsCircle />,
  '/rag': <PiChatCircleText />,
  '/rag-knowledge-base': <PiChatCircleText />,
  '/agent': <PiRobot />,
  '/mcp': <PiGraph />,
  '/agent-core': <PiRobot />,
  '/agent-builder': <PiRobot />,
  '/research': <PiMagnifyingGlass />,
  '/flow-chat': <PiFlowArrow />,
  '/voice-chat': <PiMicrophoneBold />,
  '/generate': <PiPencil />,
  '/summarize': <PiNote />,
  '/meeting-minutes': <PiNotebook />,
  '/writer': <PiPenNib />,
  '/translate': <PiTranslate />,
  '/web-content': <PiGlobe />,
  '/image': <PiImages />,
  '/video': <PiVideoLight />,
  '/video-analyzer': <PiVideoCamera />,
  '/diagram': <PiTreeStructure />,
};

/**
 * Get the icon for a given usecase string.
 * Falls back to PiChat if no matching usecase is found.
 */
export const getUseCaseIcon = (usecase?: string): React.ReactNode => {
  if (!usecase) return <PiChat />;
  return useCaseIconMap[usecase] ?? <PiChat />;
};
