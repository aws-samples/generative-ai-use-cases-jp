import { PrimaryKey } from './base';

export type Role = 'system' | 'user' | 'assistant';

export type Model = {
  type: 'bedrock' | 'bedrockAgent' | 'sagemaker';
  modelId: string;
  sessionId?: string;
};

export type Agent = {
  displayName: string;
  agentId: string;
  aliasId: string;
};

export type AgentMap = Record<string, { agentId: string; aliasId: string }>;

export type PromptFlow = {
  flowId: string;
  aliasId: string;
  flowName: string;
  description: string;
};

export type MessageAttributes = {
  messageId: string;
  usecase: string;
  userId: string;
  feedback: string;
};

export type UnrecordedMessage = {
  role: Role;
  // テキスト
  content: string;
  // 追加データ（画像など）
  trace?: string;
  extraData?: ExtraData[];
  llmType?: string;
};

export type ExtraData = {
  type: string; // 'image' | 'file'
  name: string;
  source: {
    type: string; // 'S3'
    mediaType: string; // file type
    data: string;
  };
};

export type UploadedFileType = {
  file: File;
  name: string;
  type: string; // 'image' | 'file'
  base64EncodedData?: string;
  s3Url?: string;
  uploading: boolean;
  deleting?: boolean;
  errorMessages: string[];
};

export type FileLimit = {
  accept: {
    doc: string[];
    image: string[];
    video: string[];
  };
  maxFileCount: number;
  maxFileSizeMB: number;
  maxImageFileCount: number;
  maxImageFileSizeMB: number;
  maxVideoFileCount: number;
  maxVideoFileSizeMB: number;
};

export type RecordedMessage = PrimaryKey &
  MessageAttributes &
  UnrecordedMessage;

export type ToBeRecordedMessage = UnrecordedMessage & {
  createdDate?: string;
  messageId: string;
  usecase: string;
};

export type ShownMessage = Partial<PrimaryKey> &
  Partial<MessageAttributes> &
  UnrecordedMessage;

export type DocumentComment = {
  excerpt: string;
  replace?: string;
  comment?: string;
};
