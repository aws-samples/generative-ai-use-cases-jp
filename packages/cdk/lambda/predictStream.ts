import { Handler } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import bedrockApi from './bedrockApi';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

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
    const res = await bedrockApi.invokeStream(event.messages);
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
        responseStream.write(body.completion);
      }
      if (body.stop_reason) {
        break;
      }
    }

    responseStream.end();
  }
);
