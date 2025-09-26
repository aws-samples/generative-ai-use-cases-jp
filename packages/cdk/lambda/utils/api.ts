import bedrockApi from './bedrockApi';
import bedrockAgentApi from './bedrockAgentApi';
import bedrockKbApi from './bedrockKbApi';
import sagemakerApi from './sagemakerApi';
import liteLlmApi from './liteLlmApi';
import langchainApi from './langchainApi';
import { APIGatewayProxyResult } from 'aws-lambda';

const api = {
  bedrock: bedrockApi,
  bedrockAgent: bedrockAgentApi,
  bedrockKb: bedrockKbApi,
  sagemaker: sagemakerApi,
  liteLlm: liteLlmApi,
  langchain: langchainApi,
};

/**
 * Helper function to create standardized API Gateway responses
 */
export const createResponse = (
  statusCode: number,
  body: any
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};

export default api;
