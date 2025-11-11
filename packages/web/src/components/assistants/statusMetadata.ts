import { Assistant } from 'generative-ai-use-cases';

export type SyncStatus = Assistant['syncStatus'];

export interface StatusMetadata {
  labelKey: string;
  color: string;
  textColor: string;
  icon: string;
  isBlocking: boolean;
  isWarning: boolean;
}

export const statusMetadata: Record<SyncStatus, StatusMetadata> = {
  QUEUED: {
    labelKey: 'assistant.syncStatus.queued',
    color: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '⏱',
    isBlocking: true,
    isWarning: false,
  },
  SYNCING: {
    labelKey: 'assistant.syncStatus.syncing',
    color: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '🔄',
    isBlocking: true,
    isWarning: false,
  },
  SUCCEEDED: {
    labelKey: 'assistant.syncStatus.succeeded',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '✓',
    isBlocking: false,
    isWarning: false,
  },
  FAILED: {
    labelKey: 'assistant.syncStatus.failed',
    color: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '✕',
    isBlocking: false,
    isWarning: true,
  },
  PARTIAL: {
    labelKey: 'assistant.syncStatus.partial',
    color: 'bg-amber-100',
    textColor: 'text-amber-800',
    icon: '⚠',
    isBlocking: false,
    isWarning: true,
  },
};

const fallbackMetadata: StatusMetadata = {
  labelKey: 'assistant.syncStatus.unknown',
  color: 'bg-gray-100',
  textColor: 'text-gray-800',
  icon: '?',
  isBlocking: false,
  isWarning: false,
};

const ragDisabledMetadata: StatusMetadata = {
  labelKey: 'assistant.syncStatus.ragDisabled',
  color: 'bg-gray-100',
  textColor: 'text-gray-600',
  icon: '○',
  isBlocking: false,
  isWarning: false,
};

/**
 * Check if the sync status blocks chat functionality
 */
export function isSyncBlocking(status: SyncStatus | undefined): boolean {
  if (!status) return false;
  return statusMetadata[status]?.isBlocking ?? false;
}

/**
 * Check if the sync status is in a final state (won't change automatically)
 */
export function isStatusFinal(status: SyncStatus | undefined): boolean {
  if (!status) return true;
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'PARTIAL';
}

/**
 * Get status metadata with fallback for unknown statuses
 */
export function getStatusInfo(status: SyncStatus | undefined): StatusMetadata {
  if (!status) return fallbackMetadata;
  return statusMetadata[status] ?? fallbackMetadata;
}

/**
 * Get status metadata for an assistant, handling RAG disabled state
 */
export function getAssistantStatusInfo(
  ragEnabled: boolean,
  syncStatus: SyncStatus | undefined
): StatusMetadata {
  if (!ragEnabled) return ragDisabledMetadata;
  return getStatusInfo(syncStatus);
}
