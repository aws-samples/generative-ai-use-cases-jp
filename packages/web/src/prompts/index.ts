import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { claudePrompter } from './claude';

// 現状は claudePrompter しか返さない
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getPrompter = (_modelId: string) => {
  return claudePrompter;
};

export type ChatParams = {
  content: string;
};

export type SummarizeParams = {
  sentence: string;
  context?: string;
};

export type EditorialParams = {
  sentence: string;
  context?: string;
};

export type GenerateTextParams = {
  information: string;
  context: string;
};

export type TranslateParams = {
  sentence: string;
  language: string;
  context?: string;
};

export type WebContentParams = {
  text: string;
  context?: string;
};

export type RagParams = {
  promptType: 'RETRIEVE' | 'SYSTEM_CONTEXT';
  retrieveQueries?: string[];
  referenceItems?: RetrieveResultItem[];
};

export type SetTitleParams = {
  messages: UnrecordedMessage[];
};

export interface Prompter {
  systemContext(pathname: string): string;
  chatPrompt(params: ChatParams): string;
  summarizePrompt(params: SummarizeParams): string;
  editorialPrompt(params: EditorialParams): string;
  generateTextPrompt(params: GenerateTextParams): string;
  translatePrompt(params: TranslateParams): string;
  webContentPrompt(params: WebContentParams): string;
  ragPrompt(params: RagParams): string;
  setTitlePrompt(params: SetTitleParams): string;
}
