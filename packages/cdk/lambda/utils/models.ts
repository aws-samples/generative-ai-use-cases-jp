import {
  BedrockImageGenerationResponse,
  BedrockResponse,
  ClaudeMessageParams,
  ClaudeParams,
  TitanParams,
  Llama2Params,
  MistralParams,
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

const MISTRAL_PROMPT: PromptTemplate = {
  prefix: '<s>[INST] ',
  suffix: ' [/INST]',
  join: '',
  user: '{}',
  assistant: ' [/INST]\n{}\n[INST] ',
  system: '{} [/INST]\nコンテキストを理解しました。</s>\n[INST] ',
  eosToken: '</s>',
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

const CLAUDE_MESSAGE_DEFAULT_PARAMS: ClaudeMessageParams = {
  max_tokens: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

const TITAN_TEXT_DEFAULT_PARAMS: TitanParams = {
  textGenerationConfig: {
    maxTokenCount: 2048,
    stopSequences: ['User:'],
    temperature: 0.6,
    topP: 0.999,
  },
};

const LLAMA2_DEFAULT_PARAMS: Llama2Params = {
  temperature: 0.6,
  top_p: 0.99,
  max_gen_len: 1024,
};

const MISTRAL_DEFAULT_PARAMS: MistralParams = {
  max_tokens: 1024,
  top_p: 0.99,
  temperature: 0.6,
  stop: [MISTRAL_PROMPT.eosToken, '[INST]'],
};

// Model Config

const createBodyTextClaude = (messages: UnrecordedMessage[]) => {
  const body: ClaudeParams = {
    prompt: generatePrompt(CLAUDE_PROMPT, messages),
    ...CLAUDE_DEFAULT_PARAMS,
    ...{ stop_sequences: [CLAUDE_PROMPT.eosToken] },
  };
  return JSON.stringify(body);
};

const createBodyTextClaudev21 = (messages: UnrecordedMessage[]) => {
  const body: ClaudeParams = {
    prompt: generatePrompt(CLAUDE_PROMPT, messages),
    ...CLAUDE_DEFAULT_PARAMS,
    ...{ stop_sequences: [CLAUDEV21_PROMPT.eosToken] },
  };
  return JSON.stringify(body);
};

const createBodyTextClaudeMessage = (messages: UnrecordedMessage[]) => {
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
  };
  return JSON.stringify(body);
};

const createBodyTextTitanText = (messages: UnrecordedMessage[]) => {
  const body: TitanParams = {
    inputText: generatePrompt(TITAN_TEXT_PROMPT, messages),
    ...TITAN_TEXT_DEFAULT_PARAMS,
  };
  return JSON.stringify(body);
};

const createBodyTextLlama2 = (messages: UnrecordedMessage[]) => {
  const body: Llama2Params = {
    prompt: generatePrompt(LLAMA2_PROMPT, messages),
    ...LLAMA2_DEFAULT_PARAMS,
  };
  return JSON.stringify(body);
};

const createBodyTextMistral = (messages: UnrecordedMessage[]) => {
  const body: MistralParams = {
    prompt: generatePrompt(MISTRAL_PROMPT, messages),
    ...MISTRAL_DEFAULT_PARAMS,
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

const extractOutputTextLlama2 = (body: BedrockResponse): string => {
  return body.generation;
};

const extractOutputTextMistral = (body: BedrockResponse): string => {
  return body.outputs[0].text;
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
    createBodyText: (messages: UnrecordedMessage[]) => string;
    extractOutputText: (body: BedrockResponse) => string;
  };
} = {
  'anthropic.claude-3-sonnet-20240229-v1:0': {
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
  'meta.llama2-13b-chat-v1': {
    promptTemplate: LLAMA2_PROMPT,
    createBodyText: createBodyTextLlama2,
    extractOutputText: extractOutputTextLlama2,
  },
  'meta.llama2-70b-chat-v1': {
    promptTemplate: LLAMA2_PROMPT,
    createBodyText: createBodyTextLlama2,
    extractOutputText: extractOutputTextLlama2,
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
};

export const BEDROCK_IMAGE_GEN_MODELS: {
  [key: string]: {
    createBodyImage: (params: GenerateImageParams) => string;
    extractOutputImage: (response: BedrockImageGenerationResponse) => string;
  };
} = {
  'stability.stable-diffusion-xl-v0': {
    createBodyImage: createBodyImageStableDiffusion,
    extractOutputImage: extractOutputImageStableDiffusion,
  },
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
