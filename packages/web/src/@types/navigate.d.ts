// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InterUseCaseParams<T extends Record<string, unknown> = any> = {
  // key に設定先の画面項目を設定
  // useLocationのstateで管理している項目のみ指定可能
  [key in keyof T]: {
    // value に設定したい値を設定
    // 遷移元の画面項目の値を埋め込みたい場合は、{interUseCasesKey}を設定することで埋め込み可能
    // 例) contextに設定されている値を埋め込みたい場合は、{context}を設定する
    value: string;
  };
};
export type InterUseCase = {
  title: string;
  description: string;
  path: string;
  params?: InterUseCaseParams;
};

export type BaseQueryParams = {
  modelId?: string;
};

export type ChatPageQueryParams = BaseQueryParams & {
  content?: string;
  systemContext?: string;
};

export type WriterPageQueryParams = BaseQueryParams & {
  sentence?: string;
};

export type GenerateImagePageQueryParams = BaseQueryParams & {
  content?: string;
  imageModelId?: string;
};

export type GenerateVideoPageQueryParams = BaseQueryParams & {
  prompt?: string;
};

export type GenerateTextPageQueryParams = BaseQueryParams & {
  information?: string;
  context?: string;
};

export type RagPageQueryParams = BaseQueryParams & {
  content?: stiring;
};

export type AgentPageQueryParams = BaseQueryParams & {
  content?: stiring;
};

export type SummarizePageQueryParams = BaseQueryParams & {
  sentence?: string;
  additionalContext?: string;
};

export type TranslatePageQueryParams = BaseQueryParams & {
  sentence?: string;
  additionalContext?: string;
  language?: string;
};

export type WebContentPageQueryParams = BaseQueryParams & {
  url?: string;
  context?: string;
};

export type VideoAnalyzerPageQueryParams = BaseQueryParams & {
  content: string;
};

export type DiagramPageQueryParams = BaseQueryParams & {
  content: string;
};
