import {
  ApiInterface,
  GenerateImageParams,
  GenerateVideoParams,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases';
import { streamingChunk } from './streamingChunk';
import { StopReason } from '@aws-sdk/client-bedrock-runtime';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const createOpenAIChatCompletionMessages = (messages: UnrecordedMessage[]) => {
  return messages.map((message) => {
    return {
      role: message.role,
      content: message.content,
    };
  });
};

const convertFinishReason = (
  reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call'
) => {
  switch (reason) {
    case 'stop':
      return StopReason.STOP_SEQUENCE;
    case 'length':
      return StopReason.MAX_TOKENS;
    case 'tool_calls':
    case 'function_call':
      return StopReason.TOOL_USE;
    case 'content_filter':
      return StopReason.CONTENT_FILTERED;
    default:
      return 'error';
  }
};

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
}

const createSignedRequest = async (
  endpoint: string,
  body: ChatCompletionRequest
) => {
  const url = new URL(endpoint);
  const hostname = url.hostname;
  const pathname = url.pathname.endsWith('/')
    ? url.pathname + 'chat/completions'
    : url.pathname + '/chat/completions';

  const request = new HttpRequest({
    hostname,
    path: pathname,
    method: 'POST',
    headers: {
      host: hostname,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const credentials = await defaultProvider();
  const signer = new SignatureV4({
    credentials,
    region: process.env.AWS_REGION || 'us-east-1',
    service: 'lambda',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);
  return signedRequest;
};

const liteLlmApi: ApiInterface = {
  invoke: async function (
    model: Model,
    messages: UnrecordedMessage[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string
  ): Promise<string> {
    const litellmEndpoint = process.env.LITELLM_ENDPOINT;

    if (!litellmEndpoint) {
      throw new Error('LITELLM_ENDPOINT environment variable is not set');
    }

    const openAIMessages = createOpenAIChatCompletionMessages(messages);
    const requestBody = {
      model: model.modelId,
      messages: openAIMessages,
      stream: false,
    };

    const signedRequest = await createSignedRequest(
      litellmEndpoint,
      requestBody
    );

    const fullUrl = litellmEndpoint.endsWith('/')
      ? litellmEndpoint + 'chat/completions'
      : litellmEndpoint + '/chat/completions';

    const response = await fetch(fullUrl, {
      method: signedRequest.method,
      headers: signedRequest.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LiteLLM API request failed: ${response.status} - ${errorText}`
      );
    }

    const completion = await response.json();
    return completion.choices[0].message.content ?? '';
  },
  invokeStream: async function* (
    model: Model,
    messages: UnrecordedMessage[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    idToken?: string | undefined
  ): AsyncIterable<string> {
    const litellmEndpoint = process.env.LITELLM_ENDPOINT;

    if (!litellmEndpoint) {
      throw new Error('LITELLM_ENDPOINT environment variable is not set');
    }

    const openAIMessages = createOpenAIChatCompletionMessages(messages);
    const requestBody = {
      model: model.modelId,
      messages: openAIMessages,
      stream: true,
    };

    const signedRequest = await createSignedRequest(
      litellmEndpoint,
      requestBody
    );

    const fullUrl = litellmEndpoint.endsWith('/')
      ? litellmEndpoint + 'chat/completions'
      : litellmEndpoint + '/chat/completions';

    const response = await fetch(fullUrl, {
      method: signedRequest.method,
      headers: signedRequest.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LiteLLM API request failed: ${response.status} - ${errorText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;

            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                yield streamingChunk({
                  text: '',
                  stopReason: StopReason.STOP_SEQUENCE,
                });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];

                if (choice?.finish_reason) {
                  const stopReason = convertFinishReason(choice.finish_reason);
                  yield streamingChunk({
                    text: '',
                    stopReason: stopReason,
                  });
                } else if (choice?.delta?.content) {
                  yield streamingChunk({
                    text: choice.delta.content,
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
  generateImage: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    model: Model,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: GenerateImageParams
  ): Promise<string> {
    throw new Error('Function not implemented.');
  },
  generateVideo: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    model: Model,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: GenerateVideoParams
  ): Promise<string> {
    throw new Error('Function not implemented.');
  },
};

export default liteLlmApi;
