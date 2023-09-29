import { Handler } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import sagemakerApi from './utils/sagemakerApi';
import bedrockApi from './utils/bedrockApi';

const modelType = process.env.MODEL_TYPE || 'bedrock';
const api =
  {
    bedrock: bedrockApi,
    sagemaker: sagemakerApi,
  }[modelType] || bedrockApi;

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
    for await (const token of api.invokeStream(event.messages)) {
      responseStream.write(token);
    }

    responseStream.end();
  }
);
