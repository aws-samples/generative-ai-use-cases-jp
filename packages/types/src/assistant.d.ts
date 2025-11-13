export type KnowledgeSource = {
  id?: string;
  type?: 'file' | 'web' | 'url';
  sourceType?: 'file' | 'web' | 'url'; // Alias for type for backward compatibility
  name?: string; // Display name
  displayName?: string;
  url?: string; // Alias for sourceUrl for backward compatibility
  storageKey?: string; // S3 key for files
  sourceUrl?: string; // Original URL for web
  status?: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
};

export type Assistant = {
  id: string; // userId - partition key
  createdDate: string; // sort key
  assistantId: string;
  userId: string; // Duplicate for clarity, same as id
  tenantId: string; // Tenant ID for GSI queries
  name: string;
  description: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  visibility: 'private' | 'public'; // Visibility within tenant
  syncStatus: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  syncStatusReason: string;
  knowledgeSources: KnowledgeSource[];
  s3Urls?: string[]; // Legacy field for backward compatibility
  updatedDate: string;
};

export type AssistantMessage = {
  id: string; // assistantId - partition key
  createdDate: string; // Derived from messageId timestamp
  messageId: string; // sort key: timestamp#uuid
  assistantId: string; // Duplicate for clarity, same as id
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantMessageSource[];
  metadata?: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
};

export type AssistantMessageSource = {
  sourceId: string;
  sourceType: 'file' | 'web';
  name?: string; // Display name for the source
  url?: string; // Alias for sourceUrl for backward compatibility
  content: string;
  contentType: string;
  excerpt: string;
  sourceUrl?: string; // Original URL for web sources
  storageKey?: string; // S3 key for file sources
  s3Url?: string; // Legacy field for backward compatibility
};

export type CreateAssistantRequest = {
  name: string;
  description: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  visibility?: 'private' | 'public'; // Optional, defaults to 'private'
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[]; // Legacy field for backward compatibility
};

export type UpdateAssistantRequest = {
  name?: string;
  description?: string;
  instruction?: string;
  modelId?: string;
  ragEnabled?: boolean;
  visibility?: 'private' | 'public';
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[]; // Legacy field for backward compatibility
};

export type CreateAssistantMessageRequest = {
  content: string;
};

export type ListAssistantsQueryParams = {
  limit?: number;
  nextToken?: string;
};

export type ListAssistantsResponse = {
  assistants: Assistant[];
  lastEvaluatedKey?: string; // Alias for nextToken for backward compatibility
  nextToken?: string;
};

export type ListAssistantMessagesQueryParams = {
  limit?: number;
  nextToken?: string;
};

export type ListAssistantMessagesResponse = {
  messages: AssistantMessage[];
  lastEvaluatedKey?: string;
};

export type RequestUploadUrlRequest = {
  assistantId?: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
};

export type RequestUploadUrlResponse = {
  uploadUrl: string;
  fileKey: string;
  s3Url?: string; // S3 URL for the uploaded file
}
