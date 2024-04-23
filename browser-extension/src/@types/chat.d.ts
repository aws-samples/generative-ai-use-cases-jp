export type Role = 'system' | 'user' | 'assistant';

export type Model = {
  type: 'bedrock' | 'bedrockAgent' | 'sagemaker';
  modelId: string;
  sessionId?: string;
};
export type ExtraData = {
  type: string;
  source: {
    type: string;
    mediaType: string;
    data: string;
  };
};

export type SystemContext = {
  systemContextId: string;
  systemContext: string;
  systemContextTitle: string;
};

export type Message = {
  role: Role;
  // テキスト
  content: string;
  // 追加データ（画像など）
  extraData?: ExtraData[];
  llmType?: string;
  // プロンプトのタイトル
  title?: string;
};

export type PredictRequest = {
  model?: Model;
  messages: Message[];
};
