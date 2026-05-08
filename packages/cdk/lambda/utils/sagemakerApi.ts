import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
  InvokeEndpointWithResponseStreamCommand,
} from '@aws-sdk/client-sagemaker-runtime';
import { ApiInterface, UnrecordedMessage } from 'generative-ai-use-cases';
import { streamingChunk } from './streamingChunk';

const client = new SageMakerRuntimeClient({
  region: process.env.MODEL_REGION,
});

const createBodyText = (
  model: string,
  messages: UnrecordedMessage[],
  stream: boolean
): string => {
  // Convert messages to the format expected by SageMaker endpoint
  const formattedMessages = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return JSON.stringify({
    messages: formattedMessages,
    max_tokens: 4096,
    stream: stream,
  });
};

const sagemakerApi: ApiInterface = {
  invoke: async (model, messages) => {
    const command = new InvokeEndpointCommand({
      EndpointName: model.modelId,
      Body: createBodyText(model.modelId, messages, false),
      ContentType: 'application/json',
      Accept: 'application/json',
    });
    const data = await client.send(command);
    const response = JSON.parse(new TextDecoder().decode(data.Body));
    return response.choices[0].message.content;
  },
  invokeStream: async function* (model, messages) {
    const command = new InvokeEndpointWithResponseStreamCommand({
      EndpointName: model.modelId,
      Body: createBodyText(model.modelId, messages, true),
      ContentType: 'application/json',
      Accept: 'application/json',
    });
    const stream = (await client.send(command)).Body;
    if (!stream) return;

    // Based on the Python example, the streaming response format is:
    // data:{"choices":[{"delta":{"content":"text"}}]}
    // This logic handles the streaming response similar to the Python implementation

    let buffer = '';
    const startJson = Buffer.from('{');

    for await (const chunk of stream) {
      if (!chunk.PayloadPart?.Bytes) continue;

      buffer += new TextDecoder().decode(chunk.PayloadPart.Bytes);

      // Process complete lines ending with \n
      if (!buffer.endsWith('\n')) continue;

      const lines = buffer.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.includes(startJson.toString())) {
          try {
            // Extract JSON from the line (similar to Python implementation)
            const jsonStart = line.indexOf('{');
            if (jsonStart !== -1) {
              const jsonStr = line.substring(jsonStart);
              const data = JSON.parse(jsonStr);

              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                yield streamingChunk({ text: data.choices[0].delta.content });
              }
            }
          } catch (error) {
            // Skip malformed JSON
            console.warn('Failed to parse streaming JSON:', error);
          }
        }
      }

      buffer = '';
    }
  },
  generateImage: async () => {
    throw new Error('Not Implemented');
  },
  generateVideo: async () => {
    throw new Error('Not Implemented');
  },
};

export default sagemakerApi;
