import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  STSClient,
  AssumeRoleWithWebIdentityCommand,
  Credentials,
  IDPCommunicationErrorException,
} from '@aws-sdk/client-sts';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetOpenIdTokenCommand,
  TooManyRequestsException,
  LimitExceededException,
  ExternalServiceException,
  InternalErrorException,
} from '@aws-sdk/client-cognito-identity';
import { getTenantId, getUsername } from './tenantUtils';

// Constants for AssumeRole operations
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10000;
const SESSION_DURATION_SECONDS = 3600;

/**
 * ジッター付き指数バックオフでリトライ間隔を計算
 * サンダリングハード問題を緩和するためランダム要素を追加
 */
function calculateRetryDelay(attempt: number): number {
  // 指数バックオフ: 500ms, 1000ms, 2000ms, 4000ms, 8000ms (最大10000ms)
  const exponentialDelay = Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt - 1),
    MAX_DELAY_MS
  );
  // ジッター: 基本遅延の100%〜150%の範囲でランダム化
  const jitter = Math.random() * exponentialDelay * 0.5;
  return Math.floor(exponentialDelay + jitter);
}

/** ネットワークエラーコード（Node.js SystemError） */
const RETRYABLE_NETWORK_ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
];

/**
 * リトライ可能なエラーかどうかを判定
 * AWS SDKの例外クラスを instanceof で型安全に検出
 */
function isRetryableError(error: unknown): boolean {
  // AWS SDK例外クラスによる判定
  if (
    error instanceof TooManyRequestsException ||
    error instanceof LimitExceededException ||
    error instanceof ExternalServiceException ||
    error instanceof InternalErrorException ||
    error instanceof IDPCommunicationErrorException
  ) {
    return true;
  }

  // Node.jsネットワークエラー（SystemError）の判定
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return RETRYABLE_NETWORK_ERROR_CODES.includes(error.code);
  }

  return false;
}

/**
 * Assume role using Identity Pool token exchange from Cognito User Pool JWT
 * Exchange User Pool JWT → Identity Pool token → AssumeRoleWithWebIdentity
 */
export async function assumeRoleWithWebIdentity(
  event: APIGatewayProxyEvent,
  roleArn: string
): Promise<Credentials> {
  // Extract tenant ID and user ID from claims
  const tenantId = getTenantId(event);
  const userId = getUsername(event);

  // Extract User Pool JWT token from Authorization header
  const userPoolToken = event.headers.Authorization;
  if (!userPoolToken) {
    throw new Error('No valid authorization token found');
  }

  // Get environment variables
  const identityPoolId = process.env.IDENTITY_POOL_ID;
  const userPoolId = process.env.USER_POOL_ID;
  const region = process.env.AWS_REGION!;

  if (!identityPoolId || !userPoolId) {
    throw new Error('IDENTITY_POOL_ID or USER_POOL_ID not configured');
  }

  console.log(
    `Starting Identity Pool token exchange for tenant: ${tenantId}, user: ${userId}, role: ${roleArn}`
  );

  let lastError: Error | null = null;
  let lastAttempt = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    lastAttempt = attempt;
    try {
      const cognitoIdentityClient = new CognitoIdentityClient({ region });
      const stsClient = new STSClient({ region });

      // Step 1: Exchange User Pool token for Identity ID
      console.log(`Attempt ${attempt}: Getting Identity ID from Identity Pool`);
      const userPoolProviderName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

      const getIdResponse = await cognitoIdentityClient.send(
        new GetIdCommand({
          IdentityPoolId: identityPoolId,
          Logins: {
            [userPoolProviderName]: userPoolToken,
          },
        })
      );

      if (!getIdResponse.IdentityId) {
        throw new Error('Failed to get Identity ID from Identity Pool');
      }

      // Identity IDは機密情報のため、末尾8文字のみログ出力
      const maskedIdentityId = `...${getIdResponse.IdentityId.slice(-8)}`;
      console.log(`Got Identity ID: ${maskedIdentityId}`);

      // Step 2: Get OpenID token from Identity Pool
      console.log(`Getting OpenID token from Identity Pool`);
      const getOpenIdTokenResponse = await cognitoIdentityClient.send(
        new GetOpenIdTokenCommand({
          IdentityId: getIdResponse.IdentityId,
          Logins: {
            [userPoolProviderName]: userPoolToken,
          },
        })
      );

      if (!getOpenIdTokenResponse.Token) {
        throw new Error('Failed to get OpenID token from Identity Pool');
      }

      console.log(
        `Got OpenID token, proceeding with AssumeRoleWithWebIdentity`
      );

      // Step 3: Use Identity Pool OpenID token with AssumeRoleWithWebIdentity
      // Create unique session name for better traceability (must be <= 64 characters)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      const shortTenantId = tenantId.substring(0, 16); // Max 16 chars
      const shortUserId = userId.substring(0, 8); // First 8 chars
      const sessionName = `TS-${shortTenantId}-${shortUserId}-${timestamp}`;

      console.log(
        `Attempting AssumeRoleWithWebIdentity using Identity Pool token, attempt ${attempt}`
      );

      const assumeRoleResponse = await stsClient.send(
        new AssumeRoleWithWebIdentityCommand({
          RoleArn: roleArn,
          WebIdentityToken: getOpenIdTokenResponse.Token, // Use Identity Pool token, NOT User Pool JWT
          RoleSessionName: sessionName,
          DurationSeconds: SESSION_DURATION_SECONDS,
        })
      );

      if (!assumeRoleResponse.Credentials) {
        throw new Error(
          `Failed to assume role with web identity. Response: ${JSON.stringify(assumeRoleResponse)}`
        );
      }

      console.log(
        `Successfully assumed role for tenant: ${tenantId}, user: ${userId}`
      );

      return assumeRoleResponse.Credentials;
    } catch (error) {
      lastError = error as Error;
      const retryable = isRetryableError(error);
      const willRetry = retryable && attempt < MAX_RETRIES;

      console.error(
        `AssumeRoleWithWebIdentity attempt ${attempt} failed for tenant: ${tenantId}, user: ${userId}:`,
        {
          error: error,
          errorName: lastError.name ?? 'Unknown',
          errorMessage: lastError.message,
          roleArn: roleArn,
          region: process.env.AWS_REGION!,
          isRetryable: retryable,
          willRetry: willRetry,
        }
      );

      // リトライ不可能なエラーの場合は即座に失敗
      if (!retryable) {
        break;
      }

      if (willRetry) {
        // ジッター付き指数バックオフ
        const delay = calculateRetryDelay(attempt);
        console.log(
          `Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed or non-retryable error
  const finalMessage = isRetryableError(lastError)
    ? `Failed to assume role after ${MAX_RETRIES} attempts: ${lastError?.message}`
    : `Failed to assume role (non-retryable error after ${lastAttempt} attempt(s)): ${lastError?.message}`;

  const finalError = new Error(finalMessage);
  (finalError as Error & { cause?: unknown }).cause = lastError;
  throw finalError;
}

/**
 * Build tenant-specific role ARN for same account
 * For cross-account scenarios, role ARNs are retrieved from tenant metadata
 */
export function buildTenantRoleArn(
  accountId: string,
  tenantId: string
): string {
  return `arn:aws:iam::${accountId}:role/TenantRole-${tenantId}`;
}

/**
 * Extract tenant ID from API Gateway event claims
 */
export function extractTenantId(event: APIGatewayProxyEvent): string {
  const tenantId = getTenantId(event);

  if (!tenantId || tenantId === 'default') {
    throw new Error('Tenant ID not found in JWT claims');
  }

  return tenantId;
}

/**
 * Extract user ID from API Gateway event claims
 */
export function extractUserId(event: APIGatewayProxyEvent): string {
  const userId = getUsername(event);

  if (!userId || userId === 'unknown') {
    throw new Error('User ID not found in JWT claims');
  }

  return userId;
}
