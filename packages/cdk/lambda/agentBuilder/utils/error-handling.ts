import { APIGatewayProxyResult } from 'aws-lambda';
import {
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createInternalServerErrorResponse,
} from './response-utils';

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  public currentVersion?: number;

  constructor(message: string, currentVersion?: number) {
    super(message);
    this.name = 'ConflictError';
    this.currentVersion = currentVersion;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Handle errors and return appropriate API Gateway response
 */
export function handleError(error: Error): APIGatewayProxyResult {
  console.error('Error occurred:', error);

  if (error instanceof ValidationError) {
    return createErrorResponse(error.message, 400);
  }

  if (error instanceof NotFoundError) {
    return createNotFoundResponse(error.message);
  }

  if (error instanceof UnauthorizedError) {
    return createUnauthorizedResponse(error.message);
  }

  if (error instanceof ForbiddenError) {
    return createErrorResponse(error.message, 403);
  }

  if (error instanceof ConflictError) {
    const body = error.currentVersion
      ? { error: error.message, currentVersion: error.currentVersion }
      : { error: error.message };

    return {
      statusCode: 409,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(body),
    };
  }

  // Default to internal server error for unexpected errors
  return createInternalServerErrorResponse('Internal server error');
}
