import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  ServiceQuotaExceededException,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-runtime';
import {
  ApiInterface,
  BedrockImageGenerationResponse,
  BedrockResponse,
  GenerateImageParams,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import { BEDROCK_MODELS, BEDROCK_IMAGE_GEN_MODELS } from './models';

const client = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION,
});

const createBodyText = (
  model: string,
  messages: UnrecordedMessage[]
): string => {
  const modelConfig = BEDROCK_MODELS[model];
  return modelConfig.createBodyText(messages);
};

const extractOutputText = (model: string, body: BedrockResponse): string => {
  const modelConfig = BEDROCK_MODELS[model];
  return modelConfig.extractOutputText(body);
};

const createBodyImage = (
  model: string,
  params: GenerateImageParams
): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model];
  return modelConfig.createBodyImage(params);
};

const extractOutputImage = (
  model: string,
  response: BedrockImageGenerationResponse
): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model];
  return modelConfig.extractOutputImage(response);
};

const bedrockApi: ApiInterface = {
  invoke: async (model, messages) => {
    const command = new InvokeModelCommand({
      modelId: model.modelId,
      body: createBodyText(model.modelId, messages),
      contentType: 'application/json',
    });
    const data = await client.send(command);
    const body = JSON.parse(data.body.transformToString());
    return extractOutputText(model.modelId, body);
  },
  invokeStream: async function* (model, messages) {
    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: model.modelId,
        body: createBodyText(model.modelId, messages),
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
        const outputText = extractOutputText(model.modelId, body);
        if (outputText) {
          yield outputText;
        }
        if (body.stop_reason) {
          break;
        }
      }
    } catch (e) {
      if (
        e instanceof ThrottlingException ||
        e instanceof ServiceQuotaExceededException
      ) {
        yield 'ただいまアクセスが集中しているため時間をおいて試してみてください。';
      } else {
        yield 'エラーが発生しました。時間をおいて試してみてください。';
      }
    }
  },
  generateImage: async (model, params) => {
    const command = new InvokeModelCommand({
      modelId: model.modelId,
      body: createBodyImage(model.modelId, params),
      contentType: 'application/json',
    });
    const res = await client.send(command);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));

    return extractOutputImage(model.modelId, body);
  },
};

export default bedrockApi;
