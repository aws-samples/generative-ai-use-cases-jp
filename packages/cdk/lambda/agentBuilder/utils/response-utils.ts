import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  data: unknown,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 400
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error }),
  };
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(
  message: string = 'Not found'
): APIGatewayProxyResult {
  return createErrorResponse(message, 404);
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): APIGatewayProxyResult {
  return createErrorResponse(message, 403);
}

/**
 * Create an internal server error response
 */
export function createInternalServerErrorResponse(
  message: string = 'Internal server error'
): APIGatewayProxyResult {
  return createErrorResponse(message, 500);
}
