import { Handler, Context } from 'aws-lambda';
import { PromptFlowRequest } from 'generative-ai-use-cases-jp';
import bedrockFlowApi from './utils/bedrockFlowApi';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: PromptFlowRequest,
        responseStream: NodeJS.WritableStream,
        context: Context
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (
    event: PromptFlowRequest,
    responseStream: NodeJS.WritableStream,
    context: Context
  ) => {
    try {
      context.callbackWaitsForEmptyEventLoop = false;

      for await (const token of bedrockFlowApi.invokeFlow({
        flowIdentifier: event.flowIdentifier,
        flowAliasIdentifier: event.flowAliasIdentifier,
        document: event.document,
      })) {
        responseStream.write(token);
      }

      responseStream.end();
    } catch (e) {
      console.error('Error in handler:', e);
      responseStream.write(
        JSON.stringify({ error: 'An error occurred processing your request' })
      );
      responseStream.end();
    }
  }
);
