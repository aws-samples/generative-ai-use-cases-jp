import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { claudePrompter } from './claude';

// 現状 prompter は Claude 用のものしか存在しない
export const getPrompter = (modelId: string) => {
  if (modelId.includes('claude')) {
    return claudePrompter;
  } else {
    // デフォルトでは Claude の prompter を返す
    // modelId は初期時に空文字が入っているため
    // 初期モデルが Claude ではない場合も、一時的に claudePrompter が選択されている状態になるが
    // modelId が更新されると適切なモデルが選択されるため、その状態を許容する
    return claudePrompter;
  }
};

export type ChatParams = {
  content: string;
};

export type SummarizeParams = {
  sentence: string;
  context?: string;
};

export type WriterParams = {
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

export type VideoAnalyzerParams = {
  content: string;
};

export type SetTitleParams = {
  messages: UnrecordedMessage[];
};

export type DiagramParams = {
  determineType: boolean;
  diagramType?: string;
};

export type PromptListItem = {
  title: string;
  systemContext: string;
  prompt?: string;
  className?: string;
};

export type PromptList = {
  title: string;
  items: PromptListItem[];
  experimental?: boolean;
}[];

export interface Prompter {
  systemContext(pathname: string): string;
  chatPrompt(params: ChatParams): string;
  summarizePrompt(params: SummarizeParams): string;
  writerPrompt(params: WriterParams): string;
  generateTextPrompt(params: GenerateTextParams): string;
  translatePrompt(params: TranslateParams): string;
  webContentPrompt(params: WebContentParams): string;
  ragPrompt(params: RagParams): string;
  videoAnalyzerPrompt(params: VideoAnalyzerParams): string;
  setTitlePrompt(params: SetTitleParams): string;
  promptList(): PromptList;
  diagramPrompt(params: DiagramParams): string;
}
