// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InterUseCaseState<T extends Record<string, unknown> = any> = {
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
  state?: InterUseCaseState;
};

export type ChatPageLocationState = {
  content: string;
  systemContext: string;
};

export type EditorialPageLocationState = {
  sentence: string;
};

export type GenerateImagePageLocationState = {
  content: string;
};

export type GenerateTextPageLocationState = {
  information: string;
  context: string;
};

export type RagPageLocationState = {
  content: stiring;
};

export type SummarizePageLocationState = {
  sentence: string;
  additionalContext: string;
};

export type TranslatePageLocationState = {
  sentence: string;
  additionalContext: string;
  language: string;
};

export type WebContentPageLocationState = {
  url: string;
  context: string;
};
