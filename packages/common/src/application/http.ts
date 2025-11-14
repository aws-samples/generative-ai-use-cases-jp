/**
 * HTTP Status Codes
 * Hierarchical structure for better organization
 */
export const HttpStatus = {
  /**
   * 2xx Success - Request successfully received, understood, and accepted
   */
  Success: {
    /** 200 OK - Standard success response */
    OK: 200,
    /** 201 Created - Resource successfully created */
    CREATED: 201,
    /** 202 Accepted - Request accepted for processing */
    ACCEPTED: 202,
    /** 204 No Content - Success with no response body */
    NO_CONTENT: 204,
  },
  /**
   * 3xx Redirection - Further action needed to complete the request
   */
  Redirection: {
    /** 301 Moved Permanently - Resource permanently moved */
    MOVED_PERMANENTLY: 301,
    /** 302 Found - Resource temporarily moved */
    FOUND: 302,
    /** 304 Not Modified - Resource not modified since last request */
    NOT_MODIFIED: 304,
    /** 307 Temporary Redirect - Temporary redirect with method preservation */
    TEMPORARY_REDIRECT: 307,
    /** 308 Permanent Redirect - Permanent redirect with method preservation */
    PERMANENT_REDIRECT: 308,
  },
  /**
   * 4xx Client Error - Request contains bad syntax or cannot be fulfilled
   */
  ClientError: {
    /** 400 Bad Request - Invalid request syntax */
    BAD_REQUEST: 400,
    /** 401 Unauthorized - Authentication required */
    UNAUTHORIZED: 401,
    /** 403 Forbidden - Server refuses to authorize */
    FORBIDDEN: 403,
    /** 404 Not Found - Resource not found */
    NOT_FOUND: 404,
    /** 405 Method Not Allowed - HTTP method not supported */
    METHOD_NOT_ALLOWED: 405,
    /** 409 Conflict - Request conflicts with current state */
    CONFLICT: 409,
    /** 422 Unprocessable Entity - Semantic errors in request */
    UNPROCESSABLE_ENTITY: 422,
    /** 429 Too Many Requests - Rate limit exceeded */
    TOO_MANY_REQUESTS: 429,
  },
  /**
   * 5xx Server Error - Server failed to fulfill valid request
   */
  ServerError: {
    /** 500 Internal Server Error - Generic server error */
    INTERNAL_SERVER_ERROR: 500,
    /** 501 Not Implemented - Functionality not supported */
    NOT_IMPLEMENTED: 501,
    /** 502 Bad Gateway - Invalid response from upstream server */
    BAD_GATEWAY: 502,
    /** 503 Service Unavailable - Server temporarily unavailable */
    SERVICE_UNAVAILABLE: 503,
    /** 504 Gateway Timeout - Upstream server timeout */
    GATEWAY_TIMEOUT: 504,
  },
} as const;

/**
 * CORS headers
 */

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
} as const;

export const CORS_HEADERS_JSON = {
  'Content-Type': 'application/json',
  ...BASE_CORS_HEADERS,
} as const;

export const CORS_HEADERS_BASE64 = {
  'Content-Type': 'application/octet-stream',
  ...BASE_CORS_HEADERS,
} as const;

export const CORS_HEADERS_TEXT = {
  'Content-Type': 'text/plain',
  ...BASE_CORS_HEADERS,
} as const;
