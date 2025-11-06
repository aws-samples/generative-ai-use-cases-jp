import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserIdFromEvent } from './agentBuilder/utils/auth-utils';
import { createSuccessResponse } from './agentBuilder/utils/response-utils';
import { handleError } from './agentBuilder/utils/error-handling';
import { routeRequest } from './agentBuilder/router';

/**
 * Main Lambda handler for Agent Builder API
 *
 * This handler has been refactored to use a modular architecture:
 * - Utilities: Common functions for auth, responses, and security
 * - Validation: Request and data validation logic
 * - Services: Business logic layer
 * - Handlers: Individual endpoint handlers
 * - Router: Centralized routing logic
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createSuccessResponse({});
  }

  try {
    const userId = getUserIdFromEvent(event);

    // Route to appropriate handler based on resource and method
    return await routeRequest(event, userId);
  } catch (error) {
    console.error('Handler error:', error);
    return handleError(error as Error);
  }
};
