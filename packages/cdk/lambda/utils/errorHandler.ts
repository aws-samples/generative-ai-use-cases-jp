import { APIGatewayProxyResult } from 'aws-lambda';
import { CORS_HEADERS_JSON } from '@generative-ai-use-cases/common';
import { TooManyRequestsError, ServiceUnavailableError } from './errors';

/**
 * Lambdaハンドラー用の共通エラーハンドラー
 * カスタム例外を適切なHTTPレスポンスに変換
 */
export function handleLambdaError(error: unknown): APIGatewayProxyResult {
  console.error('Lambda error:', error);

  // TooManyRequestsError (429)
  if (error instanceof TooManyRequestsError) {
    return {
      statusCode: 429,
      headers: {
        ...CORS_HEADERS_JSON,
        'Retry-After': String(error.retryAfter),
      },
      body: JSON.stringify({
        message: error.message,
        retryAfter: error.retryAfter,
      }),
    };
  }

  // ServiceUnavailableError (503)
  if (error instanceof ServiceUnavailableError) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS_JSON,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }

  // その他のエラー (500)
  return {
    statusCode: 500,
    headers: CORS_HEADERS_JSON,
    body: JSON.stringify({
      message: 'Internal Server Error',
    }),
  };
}
