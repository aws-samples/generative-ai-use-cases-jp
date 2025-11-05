/**
 * Assistant Feature Type Definitions
 * Re-implementation of PR #98 assistant feature
 */

/**
 * Knowledge source types for RAG
 */
export type KnowledgeSourceType = 'file' | 'url';

/**
 * Knowledge source for assistant RAG
 */
export interface KnowledgeSource {
  sourceType: KnowledgeSourceType;
  name: string;
  url?: string;
  sitemap?: string;
  recursiveDepth?: number;
  chunkingStrategy?: {
    maxTokens: number;
    overlapPercentage: number;
  };
}

/**
 * Assistant synchronization status
 */
export type AssistantSyncStatus = 'SYNCED' | 'RUNNING' | 'FAILED';

/**
 * Assistant entity
 */
export interface Assistant {
  assistantId: string;
  userId: string;
  name: string;
  description?: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  syncStatus: AssistantSyncStatus;
  syncStatusReason?: string;
  knowledgeSources: KnowledgeSource[];
  s3Urls: string[];
  createdDate: string;
  updatedDate?: string;
}

/**
 * Message role
 */
export type AssistantMessageRole = 'user' | 'assistant';

/**
 * Source citation from RAG retrieval
 */
export interface AssistantMessageSource {
  name: string;
  url?: string;
  excerpt: string;
  score: number;
}

/**
 * Assistant message entity
 */
export interface AssistantMessage {
  messageId: string;
  assistantId: string;
  userId: string;
  role: AssistantMessageRole;
  content: string;
  sources?: AssistantMessageSource[];
  metadata?: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
  createdDate: string;
}

/**
 * Request to create an assistant
 */
export interface CreateAssistantRequest {
  name: string;
  description?: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[];
}

/**
 * Request to update an assistant
 */
export interface UpdateAssistantRequest {
  name?: string;
  description?: string;
  instruction?: string;
  modelId?: string;
  ragEnabled?: boolean;
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[];
}

/**
 * Request to create a message
 */
export interface CreateAssistantMessageRequest {
  content: string;
}

/**
 * Response for listing assistants
 */
export interface ListAssistantsResponse {
  assistants: Assistant[];
  nextToken?: string;
}

/**
 * Query parameters for listing assistants
 */
export interface ListAssistantsQueryParams {
  limit?: number;
  nextToken?: string;
}

/**
 * Response for listing messages
 */
export interface ListAssistantMessagesResponse {
  messages: AssistantMessage[];
  nextToken?: string;
}

/**
 * Query parameters for listing messages
 */
export interface ListAssistantMessagesQueryParams {
  limit?: number;
  nextToken?: string;
}

/**
 * Request for file upload URL
 */
export interface RequestUploadUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Response with pre-signed upload URL
 */
export interface RequestUploadUrlResponse {
  uploadUrl: string;
  s3Url: string;
  expiresIn: number;
}
