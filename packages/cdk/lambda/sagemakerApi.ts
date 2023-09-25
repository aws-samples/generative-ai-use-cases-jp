import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
  InvokeEndpointWithResponseStreamCommand,
} from '@aws-sdk/client-sagemaker-runtime';

const client = new SageMakerRuntimeClient({
  region: process.env.MODEL_REGION,
});

const PARAMS = {
  max_new_tokens: 512,
  return_full_text: false,
  do_sample: true,
  temperature: 0.3,
};

type PromptTemplate = {
  prefix: string;
  suffix: string;
  join: string;
  user: string;
  assistant: string;
  system: string;
  eos_token: string;
};

export const generatePrompt = (
  messages: UnrecordedMessage[],
  pt: PromptTemplate
) => {
  const prompt =
    pt.prefix +
    messages
      .map((message) => {
        if (message.role == 'user') {
          return pt.user.replace('{}', message.content);
        } else if (message.role == 'assistant') {
          return pt.assistant.replace('{}', message.content);
        } else if (message.role === 'system') {
          return pt.system.replace('{}', message.content);
        } else {
          throw new Error(`Invalid message role: ${message.role}`);
        }
      })
      .join(pt.join) +
    pt.suffix;
  return prompt;
};

const invoke = async (messages: UnrecordedMessage[]): Promise<string> => {
  const pt: PromptTemplate = JSON.parse(process.env.PROMPT_TEMPLATE || '');
  const command = new InvokeEndpointCommand({
    EndpointName: process.env.MODEL_NAME,
    Body: JSON.stringify({
      inputs: generatePrompt(messages, pt),
      parameters: PARAMS,
    }),
    ContentType: 'application/json',
    Accept: 'application/json',
  });
  const data = await client.send(command);
  return JSON.parse(new TextDecoder().decode(data.Body))[0].generated_text;
};

async function* invokeStream(
  messages: UnrecordedMessage[]
): AsyncIterable<string> {
  const pt: PromptTemplate = JSON.parse(process.env.PROMPT_TEMPLATE || '');
  const command = new InvokeEndpointWithResponseStreamCommand({
    EndpointName: process.env.MODEL_NAME,
    Body: JSON.stringify({
      inputs: generatePrompt(messages, pt),
      parameters: PARAMS,
      stream: true,
    }),
    ContentType: 'application/json',
    Accept: 'application/json',
  });
  const stream = (await client.send(command)).Body;
  if (!stream) return;

  let buffer = '';
  for await (const chunk of stream) {
    buffer += new TextDecoder().decode(chunk.PayloadPart?.Bytes);
    if (!buffer.endsWith('\n')) continue;

    // When buffer end with \n it can be parsed
    const lines: string[] =
      buffer
        .split('\n')
        .filter((line: string) => line.trim().startsWith('data:')) || [];
    for (const line of lines) {
      const message = line.replace(/^data:/, '');
      const token: string = JSON.parse(message).token.text || '';
      if (!token.includes(pt.eos_token)) yield token;
    }
    buffer = '';
  }
}

export default {
  invoke,
  invokeStream,
};
