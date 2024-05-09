import {
  BedrockImageGenerationResponse,
  BedrockResponse,
  ClaudeMessageParams,
  ClaudeParams,
  TitanParams,
  LlamaParams,
  MistralParams,
  CommandRParams,
  GenerateImageParams,
  Model,
  PromptTemplate,
  StableDiffusionParams,
  TitanImageParams,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import { generatePrompt } from './prompter';

// Default Models

const modelId: string = JSON.parse(process.env.MODEL_IDS!)
  .map((name: string) => name.trim())
  .filter((name: string) => name)[0]!;
export const defaultModel: Model = {
  type: 'bedrock',
  modelId: modelId,
};

const imageGenerationModelId: string = JSON.parse(
  process.env.IMAGE_GENERATION_MODEL_IDS!
)
  .map((name: string) => name.trim())
  .filter((name: string) => name)[0]!;
export const defaultImageGenerationModel: Model = {
  type: 'bedrock',
  modelId: imageGenerationModelId,
};

// Prompt Templates

const CLAUDE_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: '\n\nAssistant: <output>',
  join: '\n\n',
  user: 'Human: {}',
  assistant: 'Assistant: <output>{}',
  system: '\n\nHuman: {}\n\nAssistant: コンテキストを理解しました。',
  eosToken: '</output>',
};

const CLAUDEV21_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: '\n\nAssistant: <output>',
  join: '\n\n',
  user: 'Human: {}',
  assistant: 'Assistant: <output>{}</output>',
  system: '{}',
  eosToken: '</output>',
};

const TITAN_TEXT_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: '\nBot: ',
  join: '\n',
  user: 'User: {}',
  assistant: 'Bot: {}',
  system: 'User: {}\nBot: コンテキストを理解しました。',
  eosToken: '',
};

const LLAMA2_PROMPT: PromptTemplate = {
  prefix: '<s>[INST] ',
  suffix: ' [/INST]',
  join: '',
  user: '{}',
  assistant: ' [/INST] {}</s><s>[INST] ',
  system: '<<SYS>>\n{}\n<</SYS>>\n\n',
  eosToken: '</s>',
};

const LLAMA3_PROMPT: PromptTemplate = {
  prefix: '<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n',
  suffix: '\n\n',
  join: '\n\n',
  user: '{}<|eot_id|><|start_header_id|>assistant<|end_header_id|>',
  assistant: '{}<|eot_id|><|start_header_id|>user<|end_header_id|>',
  system: '{}<|eot_id|><|start_header_id|>user<|end_header_id|>',
  eosToken: '',
};

const MISTRAL_PROMPT: PromptTemplate = {
  prefix: '<s>[INST] ',
  suffix: ' [/INST]',
  join: '',
  user: '{}',
  assistant: ' [/INST]\n{}\n[INST] ',
  system: '{} [/INST]\nコンテキストを理解しました。</s>\n[INST] ',
  eosToken: '</s>',
};

// CommandR/R+ではプロンプトの前処理にPromptTemplateを使用していないが、
// BEDROCK_MODELSで指定が必要なためダミーで作成しています
const COMMANDR_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: '',
  join: '',
  user: '',
  assistant: '',
  system: '',
  eosToken: '',
};

const BILINGUAL_RINNA_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: 'システム: ',
  join: '\n',
  user: 'ユーザー: {}',
  assistant: 'システム: {}',
  system: 'システム: {}',
  eosToken: '</s>',
};

const RINNA_PROMPT: PromptTemplate = {
  prefix: '',
  suffix: 'システム: ',
  join: '<NL>',
  user: 'ユーザー: {}',
  assistant: 'システム: {}',
  system: 'システム: {}',
  eosToken: '</s>',
};

// Model Params

const CLAUDE_DEFAULT_PARAMS: ClaudeParams = {
  max_tokens_to_sample: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

export type ClaudeParamsUsecases = Record<string, ClaudeParams>;
const CLAUDE_USECASE_PARAMS: ClaudeParamsUsecases = {
  '/rag': {
    temperature: 0.0,
  },
};

const CLAUDE_MESSAGE_DEFAULT_PARAMS: ClaudeMessageParams = {
  max_tokens: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

export type ClaudeMessageParamsUsecases = Record<string, ClaudeMessageParams>;
const CLAUDE_MESSAGE_USECASE_PARAMS: ClaudeMessageParamsUsecases = {
  '/rag': {
    temperature: 0.0,
  },
};

const TITAN_TEXT_DEFAULT_PARAMS: TitanParams = {
  textGenerationConfig: {
    maxTokenCount: 3072,
    stopSequences: ['User:'],
    temperature: 0.7,
    topP: 1.0,
  },
};

export type TitanParamsUsecases = Record<string, TitanParams>;
const TITAN_TEXT_USECASE_PARAMS: TitanParamsUsecases = {
  '/rag': {
    textGenerationConfig: {
      temperature: 0.0,
    },
  },
};

const LLAMA_DEFAULT_PARAMS: LlamaParams = {
  temperature: 0.6,
  top_p: 0.99,
  max_gen_len: 1024,
};

export type LlamaParamsUsecases = Record<string, LlamaParams>;
const LLAMA_USECASE_PARAMS: LlamaParamsUsecases = {
  '/rag': {
    temperature: 0.0,
  },
};

const MISTRAL_DEFAULT_PARAMS: MistralParams = {
  max_tokens: 1024,
  top_p: 0.99,
  temperature: 0.6,
  stop: [MISTRAL_PROMPT.eosToken, '[INST]'],
};

export type MistralParamsUsecases = Record<string, MistralParams>;
const MISTRAL_USECASE_PARAMS: MistralParamsUsecases = {
  '/rag': {
    temperature: 0.0,
  },
};

const COMMANDR_DEFAULT_PARAMS: CommandRParams = {
  max_tokens: 3000,
  temperature: 0.3,
  p: 0.75,
  k: 0,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop_sequences: [],
};

export type CommandRParamsUsecases = Record<string, CommandRParams>;
const COMMANDR_USECASE_PARAMS: CommandRParamsUsecases = {
  '/rag': {
    temperature: 0.0,
  },
};

// ID変換ルール
const idTransformationRules = [
  // チャット履歴 -> チャット
  { pattern: /^\/chat\/.+/, replacement: '/chat' },
];

// ID変換
function normalizeId(id: string): string {
  if (!id) return id;
  const rule = idTransformationRules.find((rule) => id.match(rule.pattern));
  const ret = rule ? rule.replacement : id;
  return ret;
}

// Model Config

const createBodyTextClaude = (messages: UnrecordedMessage[], id: string) => {
  const body: ClaudeParams = {
    prompt: generatePrompt(CLAUDE_PROMPT, messages),
    ...CLAUDE_DEFAULT_PARAMS,
    ...CLAUDE_USECASE_PARAMS[normalizeId(id)],
    ...{ stop_sequences: [CLAUDE_PROMPT.eosToken] },
  };
  return JSON.stringify(body);
};

const createBodyTextClaudev21 = (messages: UnrecordedMessage[], id: string) => {
  const body: ClaudeParams = {
    prompt: generatePrompt(CLAUDE_PROMPT, messages),
    ...CLAUDE_DEFAULT_PARAMS,
    ...CLAUDE_USECASE_PARAMS[normalizeId(id)],
    ...{ stop_sequences: [CLAUDEV21_PROMPT.eosToken] },
  };
  return JSON.stringify(body);
};

const createBodyTextClaudeMessage = (
  messages: UnrecordedMessage[],
  id: string
) => {
  const system = messages.find((message) => message.role === 'system');
  messages = messages.filter((message) => message.role !== 'system');
  const body: ClaudeMessageParams = {
    anthropic_version: 'bedrock-2023-05-31',
    system: system?.content,
    messages: messages.map((message) => {
      return {
        role: message.role,
        content: [
          ...(message.extraData
            ? message.extraData.map((item) => ({
                type: item.type,
                source: {
                  type: item.source.type,
                  media_type: item.source.mediaType,
                  data: item.source.data,
                },
              }))
            : []),
          { type: 'text', text: message.content },
        ],
      };
    }),
    ...CLAUDE_MESSAGE_DEFAULT_PARAMS,
    ...CLAUDE_MESSAGE_USECASE_PARAMS[normalizeId(id)],
  };
  return JSON.stringify(body);
};

const createBodyTextTitanText = (messages: UnrecordedMessage[], id: string) => {
  const body: TitanParams = {
    inputText: generatePrompt(TITAN_TEXT_PROMPT, messages),
    textGenerationConfig: {
      ...TITAN_TEXT_DEFAULT_PARAMS.textGenerationConfig,
      ...TITAN_TEXT_USECASE_PARAMS[normalizeId(id)]?.textGenerationConfig,
    },
  };
  return JSON.stringify(body);
};

const createBodyTextLlama2 = (messages: UnrecordedMessage[], id: string) => {
  const body: LlamaParams = {
    prompt: generatePrompt(LLAMA2_PROMPT, messages),
    ...LLAMA_DEFAULT_PARAMS,
    ...LLAMA_USECASE_PARAMS[normalizeId(id)],
  };
  return JSON.stringify(body);
};

const createBodyTextLlama3 = (messages: UnrecordedMessage[], id: string) => {
  const body: LlamaParams = {
    prompt: generatePrompt(LLAMA3_PROMPT, messages),
    ...LLAMA_DEFAULT_PARAMS,
    ...LLAMA_USECASE_PARAMS[normalizeId(id)],
  };
  return JSON.stringify(body);
};

const createBodyTextMistral = (messages: UnrecordedMessage[], id: string) => {
  const body: MistralParams = {
    prompt: generatePrompt(MISTRAL_PROMPT, messages),
    ...MISTRAL_DEFAULT_PARAMS,
    ...MISTRAL_USECASE_PARAMS[normalizeId(id)],
  };
  return JSON.stringify(body);
};

const createBodyTextCommandR = (messages: UnrecordedMessage[], id: string) => {
  const system = messages.find((message) => message.role === 'system');
  messages = messages.filter((message) => message.role !== 'system');
  const body: CommandRParams = {
    preamble: system?.content,
    message: messages.pop()?.content,
    chat_history: messages.map((msg) => {
      return {
        role: msg.role === 'user' ? 'USER' : 'CHATBOT',
        message: msg.content,
      };
    }),
    ...COMMANDR_DEFAULT_PARAMS,
    ...COMMANDR_USECASE_PARAMS[normalizeId(id)],
  };
  return JSON.stringify(body);
};

const extractOutputTextClaude = (body: BedrockResponse): string => {
  return body.completion;
};

const extractOutputTextClaudeMessage = (body: BedrockResponse): string => {
  if (body.type === 'message') {
    return body.content[0].text;
  } else if (body.type === 'content_block_delta') {
    return body.delta.text;
  }
  return '';
};

const extractOutputTextTitanText = (body: BedrockResponse): string => {
  return body.outputText;
};

const extractOutputTextLlama = (body: BedrockResponse): string => {
  return body.generation;
};

const extractOutputTextMistral = (body: BedrockResponse): string => {
  return body.outputs[0].text;
};

const extractOutputTextCommandR = (body: BedrockResponse): string => {
  return body.text;
};

const createBodyImageStableDiffusion = (params: GenerateImageParams) => {
  const body: StableDiffusionParams = {
    text_prompts: params.textPrompt,
    cfg_scale: params.cfgScale,
    style_preset: params.stylePreset,
    seed: params.seed,
    steps: params.step,
    init_image: params.initImage,
    image_strength: params.imageStrength,
  };
  return JSON.stringify(body);
};

const createBodyImageTitanImage = (params: GenerateImageParams) => {
  // TODO: Support inpainting and outpainting too
  const imageGenerationConfig = {
    numberOfImages: 1,
    quality: 'standard',
    height: 512,
    width: 512,
    cfgScale: params.cfgScale,
    seed: params.seed % 214783648, // max for titan image
  };
  let body: Partial<TitanImageParams> = {};
  if (params.initImage) {
    body = {
      taskType: 'IMAGE_VARIATION',
      imageVariationParams: {
        text:
          (params.textPrompt.find((x) => x.weight > 0)?.text || '') +
          ', ' +
          params.stylePreset,
        negativeText: params.textPrompt.find((x) => x.weight < 0)?.text,
        images: [params.initImage],
      },
      imageGenerationConfig: imageGenerationConfig,
    };
  } else {
    body = {
      taskType: 'TEXT_IMAGE',
      textToImageParams: {
        text:
          (params.textPrompt.find((x) => x.weight > 0)?.text || '') +
          ', ' +
          params.stylePreset,
        negativeText: params.textPrompt.find((x) => x.weight < 0)?.text || '',
      },
      imageGenerationConfig: imageGenerationConfig,
    };
  }
  return JSON.stringify(body);
};

const extractOutputImageStableDiffusion = (
  response: BedrockImageGenerationResponse
) => {
  if (response.result !== 'success') {
    throw new Error('Failed to invoke model');
  }
  return response.artifacts[0].base64;
};

const extractOutputImageTitanImage = (
  response: BedrockImageGenerationResponse
) => {
  return response.images[0];
};

export const BEDROCK_MODELS: {
  [key: string]: {
    promptTemplate: PromptTemplate;
    createBodyText: (messages: UnrecordedMessage[], id: string) => string;
    extractOutputText: (body: BedrockResponse) => string;
  };
} = {
  'anthropic.claude-3-opus-20240229-v1:0': {
    promptTemplate: CLAUDEV21_PROMPT,
    createBodyText: createBodyTextClaudeMessage,
    extractOutputText: extractOutputTextClaudeMessage,
  },
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    promptTemplate: CLAUDEV21_PROMPT,
    createBodyText: createBodyTextClaudeMessage,
    extractOutputText: extractOutputTextClaudeMessage,
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    promptTemplate: CLAUDEV21_PROMPT,
    createBodyText: createBodyTextClaudeMessage,
    extractOutputText: extractOutputTextClaudeMessage,
  },
  'anthropic.claude-v2:1': {
    promptTemplate: CLAUDEV21_PROMPT,
    createBodyText: createBodyTextClaudev21,
    extractOutputText: extractOutputTextClaude,
  },
  'anthropic.claude-v2': {
    promptTemplate: CLAUDE_PROMPT,
    createBodyText: createBodyTextClaude,
    extractOutputText: extractOutputTextClaude,
  },
  'anthropic.claude-instant-v1': {
    promptTemplate: CLAUDE_PROMPT,
    createBodyText: createBodyTextClaude,
    extractOutputText: extractOutputTextClaude,
  },
  'amazon.titan-text-express-v1': {
    promptTemplate: TITAN_TEXT_PROMPT,
    createBodyText: createBodyTextTitanText,
    extractOutputText: extractOutputTextTitanText,
  },
  'amazon.titan-text-premier-v1:0': {
    promptTemplate: TITAN_TEXT_PROMPT,
    createBodyText: createBodyTextTitanText,
    extractOutputText: extractOutputTextTitanText,
  },
  'meta.llama3-8b-instruct-v1:0': {
    promptTemplate: LLAMA3_PROMPT,
    createBodyText: createBodyTextLlama3,
    extractOutputText: extractOutputTextLlama,
  },
  'meta.llama3-70b-instruct-v1:0': {
    promptTemplate: LLAMA3_PROMPT,
    createBodyText: createBodyTextLlama3,
    extractOutputText: extractOutputTextLlama,
  },
  'meta.llama2-13b-chat-v1': {
    promptTemplate: LLAMA2_PROMPT,
    createBodyText: createBodyTextLlama2,
    extractOutputText: extractOutputTextLlama,
  },
  'meta.llama2-70b-chat-v1': {
    promptTemplate: LLAMA2_PROMPT,
    createBodyText: createBodyTextLlama2,
    extractOutputText: extractOutputTextLlama,
  },
  'mistral.mistral-7b-instruct-v0:2': {
    promptTemplate: MISTRAL_PROMPT,
    createBodyText: createBodyTextMistral,
    extractOutputText: extractOutputTextMistral,
  },
  'mistral.mixtral-8x7b-instruct-v0:1': {
    promptTemplate: MISTRAL_PROMPT,
    createBodyText: createBodyTextMistral,
    extractOutputText: extractOutputTextMistral,
  },
  'mistral.mistral-large-2402-v1:0': {
    promptTemplate: MISTRAL_PROMPT,
    createBodyText: createBodyTextMistral,
    extractOutputText: extractOutputTextMistral,
  },
  'cohere.command-r-v1:0': {
    promptTemplate: COMMANDR_PROMPT,
    createBodyText: createBodyTextCommandR,
    extractOutputText: extractOutputTextCommandR,
  },
  'cohere.command-r-plus-v1:0': {
    promptTemplate: COMMANDR_PROMPT,
    createBodyText: createBodyTextCommandR,
    extractOutputText: extractOutputTextCommandR,
  },
};

export const BEDROCK_IMAGE_GEN_MODELS: {
  [key: string]: {
    createBodyImage: (params: GenerateImageParams) => string;
    extractOutputImage: (response: BedrockImageGenerationResponse) => string;
  };
} = {
  'stability.stable-diffusion-xl-v1': {
    createBodyImage: createBodyImageStableDiffusion,
    extractOutputImage: extractOutputImageStableDiffusion,
  },
  'amazon.titan-image-generator-v1': {
    createBodyImage: createBodyImageTitanImage,
    extractOutputImage: extractOutputImageTitanImage,
  },
};

export const getSageMakerModelTemplate = (model: string): PromptTemplate => {
  if (model.includes('llama-2')) {
    return LLAMA2_PROMPT;
  } else if (model.includes('bilingual-rinna')) {
    return BILINGUAL_RINNA_PROMPT;
  } else if (model.includes('rinna')) {
    return RINNA_PROMPT;
  }
  throw new Error('Invalid model name');
};
