import aws4Interceptor from 'aws4-axios';
import axios from 'axios';
import { UnrecordedMessage } from 'generative-ai-use-cases-jp';
import { IncomingMessage } from 'http';

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

const invoke = (messages: UnrecordedMessage[]) => {
  return api.post<{
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
};

const invokeStream = (messages: UnrecordedMessage[]) => {
  return api.post<IncomingMessage>(
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
};

export default {
  invoke,
  invokeStream,
};
