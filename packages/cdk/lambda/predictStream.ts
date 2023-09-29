import { Handler } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getClaudeInvokeInput } from './utils/bedrockUtils';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: PredictRequest,
        responseStream: NodeJS.WritableStream
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream) => {
    // 東京リージョンで GA されていないため、us-east-1 を固定指定しています
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    const command = new InvokeModelWithResponseStreamCommand(
      getClaudeInvokeInput(event.messages)
    );

    const res = await client.send(command);

    if (!res.body) {
      responseStream.end();
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
        responseStream.write(body.completion);
      }
      if (body.stop_reason) {
        break;
      }
    }

    responseStream.end();
  }
);
