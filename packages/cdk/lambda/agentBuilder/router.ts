import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Import handlers
import {
  handleCreateAgent,
  handleGetAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleListUserAgents,
  handleListPublicAgents,
  handleCloneAgent,
  handleListFavoriteAgents,
  handleToggleAgentFavorite,
} from './handlers/agent-handlers';

import { createNotFoundResponse } from './utils/response-utils';
import { validateAndParseRequestBody } from './validation/request-validation';
import { handleError } from './utils/error-handling';
import {
  CreateAgentRequest,
  CloneAgentRequest,
  UpdateAgentRequest,
} from 'generative-ai-use-cases';

/**
 * Route requests to appropriate handlers with error handling
 */
export async function routeRequest(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<APIGatewayProxyResult> {
  try {
    const {
      resource,
      httpMethod,
      pathParameters,
      body,
      queryStringParameters,
    } = event;
    const exclusiveStartKey =
      queryStringParameters?.exclusiveStartKey ||
      queryStringParameters?.nextToken;
    const limit = queryStringParameters?.limit
      ? parseInt(queryStringParameters.limit, 10)
      : undefined;

    // Agent routes
    if (resource === '/agents') {
      if (httpMethod === 'POST') {
        const parseResult = validateAndParseRequestBody(body);
        if (!parseResult.isValid) {
          return handleError(new Error(parseResult.error!));
        }
        return await handleCreateAgent(
          userId,
          parseResult.data as CreateAgentRequest
        );
      }
      if (httpMethod === 'GET') {
        return await handleListUserAgents(userId, exclusiveStartKey, limit);
      }
    }

    // Individual agent routes and sub-routes
    if (resource === '/agents/{proxy+}') {
      const pathParts = (pathParameters?.proxy || '').split('/');
      const agentId = pathParts[0];

      if (!agentId) {
        return createNotFoundResponse('Agent ID is required');
      }

      // Handle special routes with clear semantics
      if (agentId === 'my' && httpMethod === 'GET') {
        return await handleListUserAgents(userId, exclusiveStartKey, limit);
      }

      if (agentId === 'public' && httpMethod === 'GET') {
        return await handleListPublicAgents(userId, exclusiveStartKey, limit);
      }

      if (agentId === 'favorites' && httpMethod === 'GET') {
        return await handleListFavoriteAgents(userId, exclusiveStartKey, limit);
      }

      if (agentId === 'clone' && httpMethod === 'POST') {
        const parseResult = validateAndParseRequestBody(body);
        if (!parseResult.isValid) {
          return handleError(new Error(parseResult.error!));
        }
        return await handleCloneAgent(
          userId,
          parseResult.data as CloneAgentRequest
        );
      }

      if (agentId === 'import' && httpMethod === 'POST') {
        const parseResult = validateAndParseRequestBody(body);
        if (!parseResult.isValid) {
          return handleError(new Error(parseResult.error!));
        }
        return await handleCloneAgent(
          userId,
          parseResult.data as CloneAgentRequest
        );
      }

      // Individual agent operations
      if (pathParts.length === 1) {
        if (httpMethod === 'GET') {
          return await handleGetAgent(userId, agentId);
        }
        if (httpMethod === 'PUT') {
          const parseResult = validateAndParseRequestBody(body);
          if (!parseResult.isValid) {
            return handleError(new Error(parseResult.error!));
          }
          return await handleUpdateAgent(
            userId,
            agentId,
            parseResult.data as UpdateAgentRequest
          );
        }
        if (httpMethod === 'DELETE') {
          return await handleDeleteAgent(userId, agentId);
        }
      }

      // Sub-routes
      if (pathParts.length > 1) {
        const subRoute = pathParts[1];

        // share endpoint removed - use PUT /agents/{agentId} with isPublic flag instead

        if (subRoute === 'favorite' && httpMethod === 'POST') {
          return await handleToggleAgentFavorite(userId, agentId);
        }
      }
    }

    // Default: not found
    return createNotFoundResponse();
  } catch (error) {
    return handleError(error as Error);
  }
}
