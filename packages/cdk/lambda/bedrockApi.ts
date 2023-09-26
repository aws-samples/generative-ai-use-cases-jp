import aws4Interceptor from 'aws4-axios';
import axios from 'axios';
import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import { IncomingMessage } from 'http';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

const api = axios.create();
api.interceptors.request.use(
  aws4Interceptor({
    options: {
      region: 'us-east-1',
      service: 'bedrock',
    },
  })
);

const PARAMS = {
  max_tokens_to_sample: 3000,
  temperature: 0.6,
  top_k: 300,
  top_p: 0.8,
};

const generatePrompt = (messages: UnrecordedMessage[]): string => {
  return (
    messages
      .map(
        (m) =>
          `${
            m.role === 'system' || m.role === 'user' ? 'Human:' : 'Assistant:'
          } ${m.content}`
      )
      .join('\n') + 'Assistant: '
  );
};

const invoke = async (messages: UnrecordedMessage[]): Promise<string> => {
  const res = await api.post<{
    completion: string;
    stop_reason: string;
  }>(
    'https://bedrock.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke',
    {
      ...PARAMS,
      prompt: generatePrompt(messages),
    },
    {
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Amzn-Bedrock-Save': 1, // true | false
      },
    }
  );
  return res.data.completion;
};

async function* invokeStream(
  messages: UnrecordedMessage[]
): AsyncIterable<string> {
  const res = await api.post<IncomingMessage>(
    'https://bedrock.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke-with-response-stream',
    {
      ...PARAMS,
      prompt: generatePrompt(messages),
    },
    {
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Amzn-Bedrock-Save': 1, // true | false
      },
      responseType: 'stream',
    }
  );
  const stream = res.data;
  for await (const chunk of stream) {
    const event = new EventStreamCodec(toUtf8, fromUtf8).decode(chunk);
    if (
      event.headers[':event-type'].value !== 'chunk' ||
      event.headers[':content-type'].value !== 'application/json'
    ) {
      throw Error(`Failed to get event chunk: got ${chunk}`);
    }
    const body = JSON.parse(
      Buffer.from(
        JSON.parse(new TextDecoder('utf-8').decode(event.body)).bytes,
        'base64'
      ).toString()
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
