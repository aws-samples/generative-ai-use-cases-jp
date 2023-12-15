import { Handler, Context } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import api from './utils/api';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: PredictRequest,
        responseStream: NodeJS.WritableStream,
        context: Context
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    for await (const token of api.invokeStream(event.messages)) {
      responseStream.write(token);
    }
    responseStream.end();
  }
);
