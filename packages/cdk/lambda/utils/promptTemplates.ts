import { PromptTemplate } from 'generative-ai-use-cases-jp';

const CLAUDE_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: '\n\nAssistant: ',
  join: '\n\n',
  user: 'Human: {}',
  assistant: 'Assistant: {}',
  system: '\n\nHuman: {}\n\nAssistant: コンテキストを理解しました。',
  eos_token: '',
};

const LLAMA2_PROMPT: PromptTemplate = {
  prefix: '[INST] ',
  suffix: ' [/INST]',
  join: '',
  user: '{}',
  assistant: ' [/INST] {}</s><s>[INST] ',
  system: '<<SYS>>\n{}\n<</SYS>>\n\n',
  eos_token: '</s>',
};

const BILINGUAL_RINNA_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: 'システム: ',
  join: '\n',
  user: 'ユーザー: {}',
  assistant: 'システム: {}',
  system: 'システム: {}',
  eos_token: '</s>',
};

const RINNA_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: 'システム: ',
  join: '<NL>',
  user: 'ユーザー: {}',
  assistant: 'システム: {}',
  system: 'システム: {}',
  eos_token: '</s>',
};

export const getPromptTemplate = (model: string): PromptTemplate => {
  if (['anthropic.claude-v2', 'anthropic.claude-instant-v1'].includes(model)) {
    return CLAUDE_PROMPT;
  } else if (model.includes('llama-2')) {
    return LLAMA2_PROMPT;
  } else if (model.includes('bilingual-rinna')) {
    return BILINGUAL_RINNA_PROMPT;
  } else if (model === 'rinna') {
    return RINNA_PROMPT;
  }
  throw new Error('Invalid model name');
};
