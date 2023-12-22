import {
  BedrockImageGenerationResponse,
  ClaudeParams,
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
  suffix: '\n\nAssistant: ',
  join: '\n\n',
  user: 'Human: {}',
  assistant: 'Assistant: {}',
  system: '\n\nHuman: {}\n\nAssistant: コンテキストを理解しました。',
  eosToken: '',
};

const LLAMA2_PROMPT: PromptTemplate = {
  prefix: '[INST] ',
  suffix: ' [/INST]',
  join: '',
  user: '{}',
  assistant: ' [/INST] {}</s><s>[INST] ',
  system: '<<SYS>>\n{}\n<</SYS>>\n\n',
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

// Model Config

const createBodyTextClaude = (messages: UnrecordedMessage[]) => {
  const body: ClaudeParams = {
    prompt: generatePrompt(CLAUDE_PROMPT, messages),
    ...CLAUDE_DEFAULT_PARAMS,
  };
  return JSON.stringify(body);
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
  };
} = {
  'anthropic.claude-v2:1': {
    promptTemplate: CLAUDE_PROMPT,
    createBodyText: createBodyTextClaude,
  },
  'anthropic.claude-v2': {
    promptTemplate: CLAUDE_PROMPT,
    createBodyText: createBodyTextClaude,
  },
  'anthropic.claude-instant-v1': {
    promptTemplate: CLAUDE_PROMPT,
    createBodyText: createBodyTextClaude,
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
