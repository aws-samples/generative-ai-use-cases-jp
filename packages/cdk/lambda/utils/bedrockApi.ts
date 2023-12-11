import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { generatePrompt } from './prompter';
import { ApiInterface } from 'generative-ai-use-cases-jp/src/utils';
import {
  BedrockImageGenerationResponse,
  ClaudeParams,
  GenerateImageParams,
  StableDiffusionParams,
  TitanImageParams,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';

const client = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION,
});

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
  if (
    [
      'anthropic.claude-v2',
      'anthropic.claude-v2:1',
      'anthropic.claude-instant-v1',
    ].includes(model)
  ) {
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
  } else if (model == 'amazon.titan-image-generator-v1') {
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
        taskType: 'TEXT_IMAGE',
        imageVariationParams: {
          text: params.textPrompt.find((x) => x.weight > 0)?.text || '',
          negativeText: params.textPrompt.find((x) => x.weight < 0)?.text,
          images: [params.initImage],
        },
        imageGenerationConfig: imageGenerationConfig,
      };
    } else {
      body = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: params.textPrompt.find((x) => x.weight > 0)?.text || '',
          negativeText: params.textPrompt.find((x) => x.weight < 0)?.text || '',
        },
        imageGenerationConfig: imageGenerationConfig,
      };
    }
    return JSON.stringify(body);
  } else {
    throw new Error('Not Implemented');
  }
};

const extractOutputImage = (
  model: string,
  response: BedrockImageGenerationResponse
): string => {
  if (model == 'stability.stable-diffusion-xl-v0') {
    if (response.result !== 'success') {
      throw new Error('Failed to invoke model');
    }
    return response.artifacts[0].base64;
  } else if (model == 'amazon.titan-image-generator-v1') {
    return response.images[0];
  } else {
    throw new Error('Not Implemented');
  }
};

const getModelId = (model: string): string => {
  // 利用できるモデルの制御したい場合はモデルをコメントアウト
  if (model === 'anthropic.claude-v2') {
    return 'anthropic.claude-v2';
  } else if (model === 'anthropic.claude-v2:1') {
    return 'anthropic.claude-v2:1';
  } else if (model == 'anthropic.claude-instant-v1') {
    return 'anthropic.claude-instant-v1';
  } else if (model == 'stability.stable-diffusion-xl-v0') {
    return 'stability.stable-diffusion-xl-v0';
  } else if (model == 'amazon.titan-image-generator-v1') {
    return 'amazon.titan-image-generator-v1';
  } else {
    throw new Error('Not Implemented');
  }
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

    return extractOutputImage(getModelId(model.modelName), body);
  },
};

export default bedrockApi;
