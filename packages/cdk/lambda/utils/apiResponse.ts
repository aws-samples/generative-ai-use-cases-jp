/**
 * Common API Response utilities
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import {
  CORS_HEADERS_BASE64,
  CORS_HEADERS_JSON,
  CORS_HEADERS_TEXT,
  HttpStatus,
} from '@generative-ai-use-cases/common';

// TODO: remove later
export { CORS_HEADERS_JSON as CORS_HEADERS };

interface BaseError {
  message: string;
}

/**
 * Create Lambda success response
 * @param statusCode HTTP status code
 * @param body Response body
 * @returns Lambda response
 */
function createLambdaResponse<TBody>(
  statusCode: number,
  body: TBody
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS_JSON,
    body: JSON.stringify(body),
  };
}

// ============================================================================
// Success Responses (2xx)
// ============================================================================

/**
 * Create 200 OK response
 * @param body Response body
 * @returns Lambda response with 200 status code
 */
export function ok200Response<TBody>(body: TBody): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.Success.OK, body);
}

/**
 * Create 201 Created response
 * @param body Response body
 * @returns Lambda response with 201 status code
 */
export function created201Response<TBody>(body: TBody): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.Success.CREATED, body);
}

/**
 * Create 202 Accepted response
 * @param body Response body
 * @returns Lambda response with 202 status code
 */
export function accepted202Response<TBody>(body: TBody): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.Success.ACCEPTED, body);
}

/**
 * Create 204 No Content response
 * @returns Lambda response with 204 status code
 */
export function noContent204Response(): APIGatewayProxyResult {
  return {
    statusCode: HttpStatus.Success.NO_CONTENT,
    headers: CORS_HEADERS_JSON,
    body: '',
  };
}

// ============================================================================
// Special Response Types
// ============================================================================

/**
 * Create 200 OK response with Base64-encoded data
 * @param base64Data Base64-encoded data
 * @returns Lambda response with 200 status code and isBase64Encoded flag
 */
export function ok200Base64Response(base64Data: string): APIGatewayProxyResult {
  return {
    statusCode: HttpStatus.Success.OK,
    headers: CORS_HEADERS_BASE64,
    body: base64Data,
    isBase64Encoded: true,
  };
}

/**
 * Create 200 OK response with plain text (non-JSON)
 * @param text Plain text content (e.g., URL, title)
 * @returns Lambda response with 200 status code
 */
export function ok200PlainTextResponse(text: string): APIGatewayProxyResult {
  return {
    statusCode: HttpStatus.Success.OK,
    headers: CORS_HEADERS_TEXT,
    body: text,
  };
}

// ============================================================================
// Client Error Responses (4xx)
// ============================================================================

/**
 * Create 400 Bad Request response
 * @param body Error body
 * @returns Lambda response with 400 status code
 */
export function badRequest400Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.BAD_REQUEST, body);
}

/**
 * Create 401 Unauthorized response
 * @param body Error body
 * @returns Lambda response with 401 status code
 */
export function unauthorized401Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.UNAUTHORIZED, body);
}

/**
 * Create 403 Forbidden response
 * @param body Error body
 * @returns Lambda response with 403 status code
 */
export function forbidden403Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.FORBIDDEN, body);
}

/**
 * Create 404 Not Found response
 * @param body Error body
 * @returns Lambda response with 404 status code
 */
export function notFound404Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.NOT_FOUND, body);
}

/**
 * Create 405 Method Not Allowed response
 * @param body Error body
 * @returns Lambda response with 405 status code
 */
export function methodNotAllowed405Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.METHOD_NOT_ALLOWED, body);
}

/**
 * Create 409 Conflict response
 * @param body Error body
 * @returns Lambda response with 409 status code
 */
export function conflict409Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.CONFLICT, body);
}

/**
 * Create 422 Unprocessable Entity response
 * @param body Error body
 * @returns Lambda response with 422 status code
 */
export function unprocessableEntity422Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(
    HttpStatus.ClientError.UNPROCESSABLE_ENTITY,
    body
  );
}

/**
 * Create 429 Too Many Requests response
 * @param body Error body
 * @returns Lambda response with 429 status code
 */
export function tooManyRequests429Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ClientError.TOO_MANY_REQUESTS, body);
}

// ============================================================================
// Server Error Responses (5xx)
// ============================================================================

/**
 * Create 500 Internal Server Error response
 * @param body Error body
 * @returns Lambda response with 500 status code
 */
export function internalServerError500Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(
    HttpStatus.ServerError.INTERNAL_SERVER_ERROR,
    body
  );
}

/**
 * Create 501 Not Implemented response
 * @param body Error body
 * @returns Lambda response with 501 status code
 */
export function notImplemented501Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ServerError.NOT_IMPLEMENTED, body);
}

/**
 * Create 502 Bad Gateway response
 * @param body Error body
 * @returns Lambda response with 502 status code
 */
export function badGateway502Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ServerError.BAD_GATEWAY, body);
}

/**
 * Create 503 Service Unavailable response
 * @param body Error body
 * @returns Lambda response with 503 status code
 */
export function serviceUnavailable503Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ServerError.SERVICE_UNAVAILABLE, body);
}

/**
 * Create 504 Gateway Timeout response
 * @param body Error body
 * @returns Lambda response with 504 status code
 */
export function gatewayTimeout504Response<TError extends BaseError>(
  body: TError
): APIGatewayProxyResult {
  return createLambdaResponse(HttpStatus.ServerError.GATEWAY_TIMEOUT, body);
}
