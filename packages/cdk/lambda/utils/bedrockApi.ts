import {
  BedrockClient,
  ListFoundationModelsCommand,
} from '@aws-sdk/client-bedrock'; // ES Modules import
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { generatePrompt } from './prompter';
import { ApiInterface } from 'generative-ai-use-cases-jp/src/utils';
import {
  ClaudeParams,
  GenerateImageParams,
  Model,
  StableDiffusionParams,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';

const bedrock_client = new BedrockClient({
  region: process.env.MODEL_REGION,
});
const client = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION,
});

// Default available models
const available_models: Model[] = [
  { type: 'bedrock', modelName: 'anthropic.claude-instant-v1' },
  { type: 'bedrock', modelName: 'anthropic.claude-v2' },
];
const available_image_models: Model[] = [
  { type: 'bedrock', modelName: 'stability.stable-diffusion-xl-v0' },
];

// Get Available Models
let available_regional_models = new Set();
const get_regional_available_models = async () => {
  const command = new ListFoundationModelsCommand({});
  const res = await bedrock_client.send(command);
  available_regional_models = new Set(
    res.modelSummaries?.map((m) => m.modelId)
  );
};

const CLAUDE_DEFAULT_PARAMS: ClaudeParams = {
  max_tokens_to_sample: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

const createBodyText = (
  model: string,
  messages: UnrecordedMessage[]
): string => {
  if (['anthropic.claude-v2', 'anthropic.claude-instant-v1'].includes(model)) {
    const body: ClaudeParams = {
      prompt: generatePrompt(model, messages),
      ...CLAUDE_DEFAULT_PARAMS,
    };
    return JSON.stringify(body);
  } else {
    throw new Error('Not Implemented');
  }
};

const createBodyImage = (
  model: string,
  params: GenerateImageParams
): string => {
  if (model == 'stability.stable-diffusion-xl-v0') {
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
  } else {
    throw new Error('Not Implemented');
  }
};

const getModelId = (model: string): string => {
  if (model === 'anthropic.claude-v2') {
    return 'anthropic.claude-v2';
  } else if (model == 'anthropic.claude-instant-v1') {
    return 'anthropic.claude-instant-v1';
  } else if (model == 'stability.stable-diffusion-xl-v0') {
    return 'stability.stable-diffusion-xl-v0';
  } else {
    throw new Error('Not Implemented');
  }
};

const getSupportedModels = async (): Promise<Model[]> => {
  if (available_regional_models.size == 0) {
    await get_regional_available_models();
  }
  return available_models.filter((m) =>
    available_regional_models.has(m.modelName)
  );
};

const getSupportedImageModels = async (): Promise<Model[]> => {
  if (available_regional_models.size == 0) {
    await get_regional_available_models();
  }
  return available_image_models.filter((m) =>
    available_regional_models.has(m.modelName)
  );
};

const bedrockApi: ApiInterface = {
  invoke: async (model, messages) => {
    const command = new InvokeModelCommand({
      modelId: getModelId(model.modelName),
      body: createBodyText(model.modelName, messages),
      contentType: 'application/json',
    });
    const data = await client.send(command);
    return JSON.parse(data.body.transformToString()).completion;
  },
  invokeStream: async function* (model, messages) {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: getModelId(model.modelName),
      body: createBodyText(model.modelName, messages),
      contentType: 'application/json',
    });
    const res = await client.send(command);

    if (!res.body) {
      return;
    }

    for await (const streamChunk of res.body) {
      if (!streamChunk.chunk?.bytes) {
        break;
      }
      const body = JSON.parse(
        new TextDecoder('utf-8').decode(streamChunk.chunk?.bytes)
      );
      if (body.completion) {
        yield body.completion;
      }
      if (body.stop_reason) {
        break;
      }
    }
  },
  generateImage: async (model, params) => {
    // 現状 StableDiffusion のみの対応です。
    // パラメータは以下を参照
    // https://platform.stability.ai/docs/api-reference#tag/v1generation/operation/textToImage
    const command = new InvokeModelCommand({
      modelId: getModelId(model.modelName),
      body: createBodyImage(model.modelName, params),
      contentType: 'application/json',
    });
    const res = await client.send(command);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));

    if (body.result !== 'success') {
      throw new Error('Failed to invoke model');
    }

    return body.artifacts[0].base64;
  },
  getSupportedModels: getSupportedModels,
  getSupportedImageModels: getSupportedImageModels,
};

export default bedrockApi;
