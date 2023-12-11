export type ChatPageLocationState = {
  content: string;
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
