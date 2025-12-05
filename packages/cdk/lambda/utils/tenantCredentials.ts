import { APIGatewayProxyEvent } from 'aws-lambda';
import { Credentials } from '@aws-sdk/client-sts';
import {
  assumeRoleWithWebIdentity,
  extractTenantId,
} from './assumeRoleWithWebIdentity';
import { getTenant, Tenant } from '../tenantManager';
import { getUsername } from './tenantUtils';

/**
 * === テナント認証情報キャッシュ ===
 *
 * Lambdaのウォームスタート時にメモリ上に保持される認証情報キャッシュ。
 * Cold Start時はキャッシュは空で、認証情報取得後に保存される。
 *
 * キャッシュは以下のAPI呼び出しを削減する:
 * - Cognito Identity Pool (GetId, GetOpenIdToken)
 * - STS (AssumeRoleWithWebIdentity)
 * - DynamoDB (テナント情報取得)
 *
 * セキュリティ:
 * - テナントID+ユーザーID単位でキャッシュを分離
 * - ユーザーIDが不明な場合はキャッシュをバイパス
 * - LRU方式でキャッシュサイズを制限
 */

interface CachedCredentials {
  readonly credentials: Credentials;
  readonly tenant: Tenant;
  readonly expiresAt: number; // Unix timestamp (ms)
}

const credentialsCache = new Map<string, CachedCredentials>();
const CACHE_BUFFER_MS = 5 * 60 * 1000; // 5分のバッファ
const DEFAULT_CACHE_TTL_MS = 55 * 60 * 1000; // デフォルトTTL: 55分（STSデフォルト1時間 - 5分バッファ）
const MAX_CACHE_SIZE = 100; // LRU方式で制限

/**
 * テナントIDとユーザーIDからキャッシュキーを生成
 *
 * ユーザーID単位でキャッシュを分離することで、
 * 同一テナント内でも異なるユーザーの認証情報が混在しないようにする。
 * これにより、ユーザー固有のIAMロール権限が正しく適用される。
 */
function getCacheKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

function getFromCache(cacheKey: string): CachedCredentials | null {
  const cached = credentialsCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (Date.now() >= cached.expiresAt) {
    credentialsCache.delete(cacheKey);
    console.log(`Cache expired for tenant`);
    return null;
  }
  return { ...cached };
}

/**
 * LRU方式でキャッシュサイズを制限
 * Map.keys()は挿入順でイテレートするため、最も古いエントリを削除
 */
function evictOldestIfNeeded(): void {
  if (credentialsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = credentialsCache.keys().next().value;
    if (oldestKey) {
      credentialsCache.delete(oldestKey);
      console.log(`Evicted oldest cache entry due to size limit`);
    }
  }
}

function saveToCache(
  cacheKey: string,
  credentials: Credentials,
  tenant: Tenant
): void {
  evictOldestIfNeeded();

  const expiresAt = credentials.Expiration
    ? new Date(credentials.Expiration).getTime() - CACHE_BUFFER_MS
    : Date.now() + DEFAULT_CACHE_TTL_MS;

  credentialsCache.set(cacheKey, {
    credentials,
    tenant,
    expiresAt,
  });

  console.log(
    `Cached credentials for tenant, expires at: ${new Date(expiresAt).toISOString()}`
  );
}

// Interface for returning both credentials and tenant info
export interface TenantCredentialsWithInfo {
  credentials: Credentials;
  tenant: Tenant;
}

// Environment validation helper
const validateEnvironment = () => {
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is not set');
  }
  if (!process.env.AWS_ACCOUNT_ID) {
    throw new Error('AWS_ACCOUNT_ID environment variable is not set');
  }
  return {
    region: process.env.AWS_REGION,
    accountId: process.env.AWS_ACCOUNT_ID,
  };
};

/**
 * Get tenant credentials using AssumeRoleWithWebIdentity
 * Supports both cross-account and same-account roles with automatic fallback
 * Credentials are cached per tenant+user to reduce API calls
 * (Cognito Identity Pool, STS, DynamoDB)
 */
export async function getTenantCredentials(
  event: APIGatewayProxyEvent
): Promise<TenantCredentialsWithInfo> {
  // Validate environment variables
  const { region, accountId } = validateEnvironment();

  // Extract tenant ID from JWT claims
  const tenantId = extractTenantId(event);

  // Extract user ID for cache isolation
  const userId = getUsername(event);

  // === セキュリティチェック: ユーザーIDが不明な場合はキャッシュをバイパス ===
  const shouldUseCache = userId !== 'unknown';

  if (!shouldUseCache) {
    console.warn(
      `[SECURITY] No user ID found for tenant: ${tenantId}. Skipping cache.`
    );
  }

  // === キャッシュチェック ===
  if (shouldUseCache) {
    const cacheKey = getCacheKey(tenantId, userId);
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Using cached credentials for tenant: ${tenantId}`);
      return {
        credentials: cached.credentials,
        tenant: cached.tenant,
      };
    }
  }

  console.log(
    `Getting tenant credentials for tenant: ${tenantId} using AssumeRoleWithWebIdentity`
  );

  try {
    // Get tenant metadata - required for cross-account access
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found in tenants table`);
    }

    // Check if tenant has role ARN configured
    if (!tenant.roleArn) {
      throw new Error(`Tenant ${tenantId} is missing roleArn configuration`);
    }

    console.log(`Assuming role for tenant ${tenantId}: ${tenant.roleArn}`);

    // Use AssumeRoleWithWebIdentity to get tenant credentials
    const credentials = await assumeRoleWithWebIdentity(event, tenant.roleArn);

    // === キャッシュに保存（ユーザーIDが有効な場合のみ）===
    if (shouldUseCache) {
      const cacheKey = getCacheKey(tenantId, userId);
      saveToCache(cacheKey, credentials, tenant);
    }

    console.log(`Successfully obtained tenant credentials for tenant: ${tenantId}`);

    return {
      credentials,
      tenant,
    };
  } catch (error) {
    console.error(`Failed to get tenant credentials for tenant: ${tenantId}:`, {
      error: error,
      errorMessage: (error as Error).message,
      accountId,
      region,
    });

    throw new Error(
      `Failed to get tenant credentials: ${(error as Error).message}`
    );
  }
}
