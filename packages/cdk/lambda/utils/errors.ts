/**
 * HTTPエラーレスポンスに対応するカスタム例外クラス
 */

/**
 * 429 Too Many Requests エラー
 * レート制限に達した場合にスロー
 */
export class TooManyRequestsError extends Error {
  public readonly statusCode = 429;
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 60) {
    super(message);
    this.name = 'TooManyRequestsError';
    // retryAfterは正の数であることを保証
    this.retryAfter = Math.max(1, Math.floor(retryAfter));
  }
}

/**
 * 503 Service Unavailable エラー
 * サービスが一時的に利用不可の場合にスロー
 */
export class ServiceUnavailableError extends Error {
  public readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * エラーがレート制限関連かどうかを判定
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const rateLimitPatterns = [
    'TooManyRequestsException',
    'ThrottlingException',
    'Rate exceeded',
    'Throttling',
  ];

  const errorString = `${error.name} ${error.message}`;
  return rateLimitPatterns.some((pattern) => errorString.includes(pattern));
}
