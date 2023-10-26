import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { generatePrompt } from './prompter';
import { ApiInterface } from 'generative-ai-use-cases-jp/src/utils';

const client = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION,
});

const PARAMS = {
  max_tokens_to_sample: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

const bedrockApi: ApiInterface = {
  invoke: async (messages) => {
    const command = new InvokeModelCommand({
      modelId: process.env.MODEL_NAME,
      body: JSON.stringify({
        prompt: generatePrompt(messages),
        ...PARAMS,
      }),
      contentType: 'application/json',
    });
    const data = await client.send(command);
    return JSON.parse(data.body.transformToString()).completion;
  },
  invokeStream: async function* (messages) {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: process.env.MODEL_NAME,
      body: JSON.stringify({
        prompt: generatePrompt(messages),
        ...PARAMS,
      }),
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
  generateImage: async (params) => {
    // 現状 StableDiffusion のみの対応です。
    // パラメータは以下を参照
    // https://platform.stability.ai/docs/api-reference#tag/v1generation/operation/textToImage
    const command = new InvokeModelCommand({
      modelId: process.env.IMAGE_GEN_MODEL_NAME,
      body: JSON.stringify({
        text_prompts: params.textPrompt,
        cfg_scale: params.cfgScale,
        style_preset: params.stylePreset,
        seed: params.seed,
        steps: params.step,
        init_image: params.initImage,
        image_strength: params.imageStrength,
      }),
      contentType: 'application/json',
    });
    const res = await client.send(command);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));

    if (body.result !== 'success') {
      throw new Error('Failed to invoke model');
    }

    return body.artifacts[0].base64;
  },
};

export default bedrockApi;
