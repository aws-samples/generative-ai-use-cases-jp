import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Assistant, KnowledgeSource } from 'generative-ai-use-cases';
import Tooltip from '../Tooltip';
import { getAssistantStatusInfo } from './statusMetadata';

interface AssistantStatusTagProps {
  assistant: Assistant;
  className?: string;
}

const AssistantStatusTag: React.FC<AssistantStatusTagProps> = ({
  assistant,
  className = '',
}) => {
  const { t } = useTranslation();
  const statusInfo = getAssistantStatusInfo(
    assistant.ragEnabled,
    assistant.syncStatus
  );

  const tooltipMessage = useMemo(() => {
    // If RAG is disabled, show RAG disabled message
    if (!assistant.ragEnabled) {
      return t(statusInfo.labelKey);
    }

    // Use custom reason if available
    if (assistant.syncStatusReason) {
      return assistant.syncStatusReason;
    }

    // For PARTIAL/FAILED, show count of failed sources
    if (
      assistant.syncStatus === 'PARTIAL' ||
      assistant.syncStatus === 'FAILED'
    ) {
      const failedSources = assistant.knowledgeSources?.filter(
        (s: KnowledgeSource) => s.status === 'FAILED'
      );
      const failedCount = failedSources?.length ?? 0;
      if (failedCount > 0) {
        return t('assistant.statusTooltip.failedSources', { count: failedCount });
      }
    }

    // Default message based on status
    return t(statusInfo.labelKey);
  }, [assistant, statusInfo, t]);

  return (
    <Tooltip message={tooltipMessage} position="left" className={className}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color} ${statusInfo.textColor}`}>
        <span>{statusInfo.icon}</span>
        <span>{t(statusInfo.labelKey)}</span>
      </span>
    </Tooltip>
  );
};

export default AssistantStatusTag;
