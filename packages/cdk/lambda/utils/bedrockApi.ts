import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { generatePrompt } from './prompter';

const client = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION,
});

const PARAMS = {
  max_tokens_to_sample: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

const invoke = async (messages: UnrecordedMessage[]): Promise<string> => {
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
};

async function* invokeStream(
  messages: UnrecordedMessage[]
): AsyncIterable<string> {
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
}

export default {
  invoke,
  invokeStream,
};
