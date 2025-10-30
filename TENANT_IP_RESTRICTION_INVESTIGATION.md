# テナント別IP制限機能の実現可能性調査レポート

**作成日**: 2025-10-30
**対象システム**: Generative AI Use Cases (Database Per Tenantsパターン)
**調査目的**: ChatGPT Enterpriseと同様のテナント別IP制限機能の実現可能性と実装方法の検討

---

## 📋 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [背景と要件](#背景と要件)
3. [現在のシステムアーキテクチャ](#現在のシステムアーキテクチャ)
4. [ChatGPT Enterpriseとの比較](#chatgpt-enterpriseとの比較)
5. [実現可能性の評価](#実現可能性の評価)
6. [推奨実装方式](#推奨実装方式)
7. [実装の詳細](#実装の詳細)
8. [段階的な実装アプローチ](#段階的な実装アプローチ)
9. [注意点とリスク](#注意点とリスク)
10. [代替案](#代替案)
11. [コスト試算](#コスト試算)
12. [参考資料](#参考資料)

---

## エグゼクティブサマリー

### 調査結果

✅ **テナント別IP制限機能は実現可能です**

現在のシステムは以下の特徴を持ち、IP制限機能の導入に適した設計となっています：

- **テナント識別**: JWT `custom:tenant_id` クレームで明確に識別
- **拡張可能な設計**: Tenantsテーブルに`metadata`フィールドあり
- **明確な認証フロー**: Cognito → API Gateway → Lambda
- **IPアドレス取得可能**: `X-Forwarded-For`ヘッダー経由で取得可能

### 推奨方式

**Lambda Request Authorizer方式**（ChatGPT Enterpriseの"Tenant Enforcement Layer"に相当）

- 認証層でIP制限を実施（早期拒否）
- すべてのAPIエンドポイントで一元管理
- コスト効率が良い
- 既存のCognito認証との統合が容易

### 実装規模

| 項目 | 見積もり |
|------|---------|
| 新規ファイル | 5-7ファイル |
| 既存ファイル修正 | 3-5ファイル |
| 開発期間 | 2-3週間 |
| テスト期間 | 1-2週間 |

---

## 背景と要件

### 要件

1. **同一パス/ドメインでのアクセス**: テナントごとにパスを分けない
2. **テナント別IP制限**: テナントごとに許可IPアドレス範囲を設定可能
3. **管理者による設定**: テナント管理者がIP制限を設定・更新できる
4. **CIDR表記サポート**: IPv4/IPv6の両方をサポート
5. **リアルタイム適用**: 設定変更が即座に反映される

### ChatGPT Enterpriseの仕組み（参考）

```
ユーザー → CloudFront/Edge Proxy → OpenAI Auth Gateway
                                   ↓
                             Tenant Enforcement Layer ← テナント別IPポリシー評価
                                   ↓
                              ChatGPT App Backend
```

- 同一ドメイン（`chat.openai.com`）を使用
- JWTトークンの`workspace_id`でテナント識別
- テナント認証後にアプリケーション層でIPポリシーを適用
- 違反時は HTTP 403 を即座に返却

---

## 現在のシステムアーキテクチャ

### アーキテクチャ概要

```
[クライアント]
    ↓
[CloudFront] ← WAF (グローバルIP/Geo制限)
    ↓
    ├─→ [S3] (静的コンテンツ)
    │
    └─→ [API Gateway REST API] ← Cognito User Pools Authorizer
           ↓ JWT検証
           └─→ [Lambda Functions]
                  ↓ テナント識別 (custom:tenant_id)
                  ├─→ [DynamoDB] (テナント専用テーブル)
                  ├─→ [S3] (テナント専用バケット)
                  └─→ [Amazon Bedrock]
```

### 認証フロー

**ファイル**: `packages/cdk/lib/construct/auth.ts`, `packages/cdk/lambda/pre_token_generation/index.py`

1. **ログイン**: Cognito User Poolで認証
2. **Pre Token Generation Trigger**: JWTに`custom:tenant_id`を追加
3. **JWTトークン発行**: ID Token/Access Tokenに`custom:tenant_id`が含まれる
4. **API呼び出し**: `Authorization`ヘッダーにJWTを添付
5. **Cognito Authorizer**: API GatewayでJWT検証
6. **Lambda実行**: `event.requestContext.authorizer.claims['custom:tenant_id']`からテナント識別

### テナント管理

**ファイル**: `packages/cdk/lambda/tenantManager.ts`, `packages/cdk/lib/construct/tenant-manager.ts`

**Tenantsテーブル（DynamoDB）**:

```typescript
interface Tenant {
  tenantId: string;              // パーティションキー
  status: TenantStatus;          // active/inactive/provisioning/error
  region: string;
  environment: string;
  accountId: string;
  roleArn: string;
  openFgaApiEndpoint: string;
  openFgaApiRegion: string;
  openFgaStoreId: string;
  metadata?: Record<string, any>; // 拡張可能なメタデータ
  useCaseConfiguration?: {
    hiddenUseCases: HiddenUseCases;
    updatedAt: string;
    updatedBy: string;
  };
}
```

**重要**: `metadata`フィールドにより、スキーマ変更なしで新しい設定を追加可能

### IPアドレスの伝搬

**現在**: Lambdaレベルでは**IPアドレスを取得・処理していない**

**取得可能な方法**:
- `event.headers['X-Forwarded-For']`: CloudFrontが追加するクライアントIP
- `event.requestContext.identity.sourceIp`: CloudFrontのエッジサーバーIP

**注意**: API Gateway Token Authorizerではヘッダーにアクセスできないため、**Request Authorizer**への変更が必要

---

## ChatGPT Enterpriseとの比較

| 項目 | ChatGPT Enterprise | 現在のシステム | 実現可能性 |
|------|-------------------|---------------|----------|
| **同一パス/ドメイン** | ✅ chat.openai.com | ✅ 同一パス | ✅ 既に実現 |
| **テナント識別** | JWT `workspace_id` | JWT `custom:tenant_id` | ✅ 既に実現 |
| **IP制限レイヤー** | Tenant Enforcement Layer | 現在なし | ✅ 実装可能 |
| **ポリシー管理** | Tenant Policy DB | Tenantsテーブル | ✅ 実装可能 |
| **リアルタイム適用** | ✅ | 現在なし | ✅ 実装可能 |
| **監査ログ** | Compliance API | CloudWatch Logs | ⚠️ 強化が必要 |

**結論**: 現在のシステムはChatGPT Enterpriseと非常に類似した設計であり、IP制限機能の追加は自然な拡張となります。

---

## 実現可能性の評価

### 評価した3つの方式

#### 方式A: Lambda Request Authorizer方式（推奨）

**概要**: API Gateway Lambda Request AuthorizerでIP制限を実施

**メリット**:
- ✅ すべてのAPIエンドポイントで一元的にIP制限を実施
- ✅ 早期拒否（Lambda関数の実行前にブロック）
- ✅ コスト効率が良い（不正リクエストでLambda課金が発生しない）
- ✅ Cognito認証との統合が容易
- ✅ ChatGPT Enterpriseの"Tenant Enforcement Layer"に最も近い

**デメリット**:
- ⚠️ 新しいコンポーネントの追加が必要
- ⚠️ Lambda Authorizerのレスポンスキャッシュに注意が必要（TTL設定）
- ⚠️ 既存のCognito User Pools Authorizerからの移行が必要

**実装規模**: 中

#### 方式B: Lambda関数内での検証方式

**概要**: 各Lambda関数の先頭でIP制限を実施

**メリット**:
- ✅ 既存アーキテクチャの変更が最小限
- ✅ 柔軟な制御が可能（APIごとに異なるロジック）

**デメリット**:
- ❌ すべてのLambda関数に共通コードを追加する必要がある（約50+ファイル）
- ❌ 不正リクエストでもLambda実行コストが発生
- ❌ メンテナンス負荷が高い
- ❌ IP制限をバイパスされるリスク（実装漏れ）

**実装規模**: 大

#### 方式C: WAF + Lambda連携方式

**概要**: WAFでテナントごとのIPセットを管理し、Lambda Authorizerで動的に更新

**メリット**:
- ✅ 最も早い段階でブロック（CloudFront/API Gateway層）
- ✅ DDoS対策にも効果的

**デメリット**:
- ❌ WAF IPセットの管理が複雑（上限10,000エントリ/IPセット）
- ❌ コストが高い（WAF課金: $5/月 + $1/100万リクエスト）
- ❌ テナント数が多い場合にスケールしにくい
- ❌ リアルタイム更新が困難（WAF更新の遅延）

**実装規模**: 大

### 推奨方式の決定

**推奨**: **方式A（Lambda Request Authorizer方式）**

**理由**:
1. ChatGPT Enterpriseのアーキテクチャに最も近い
2. コストパフォーマンスが最も良い
3. 実装規模が適切
4. 既存の認証フローとの統合が容易
5. 将来的な拡張性が高い（他の認証ロジックも追加可能）

---

## 推奨実装方式

### アーキテクチャ変更

```
[クライアント]
    ↓
[CloudFront] ← WAF (グローバルIP/Geo制限)
    ↓
[API Gateway REST API]
    ↓
[Lambda Request Authorizer] ← 🆕 Tenant Enforcement Layer
    ├─ JWT検証 (custom:tenant_id取得)
    ├─ Tenantsテーブル参照 (IP設定取得)
    ├─ X-Forwarded-ForからクライアントIP取得
    └─ IPアドレス照合 (ipAccessControl.allowedIpRanges)
        ↓
        ├─ 許可 → Allow Policy
        └─ 拒否 → Deny Policy (HTTP 403)
    ↓
[Lambda Functions] ← IP制限通過後のみ実行
```

### データモデル拡張

**Tenantsテーブルへのフィールド追加**:

```typescript
interface Tenant {
  // ... 既存フィールド

  // 🆕 追加フィールド
  ipAccessControl?: {
    enabled: boolean;              // IP制限の有効/無効
    allowedIpRanges: string[];     // 許可するIPアドレス範囲（CIDR表記）
                                   // 例: ["203.0.113.0/24", "192.0.2.1/32", "2001:db8::/32"]
    updatedAt: string;             // 更新日時（ISO 8601）
    updatedBy: string;             // 更新者のユーザーID
  };
}
```

**DynamoDBへの保存例**:

```json
{
  "tenantId": "tenant-001",
  "status": "active",
  "ipAccessControl": {
    "enabled": true,
    "allowedIpRanges": [
      "203.0.113.0/24",
      "198.51.100.50/32",
      "2001:db8::/32"
    ],
    "updatedAt": "2025-10-30T12:00:00Z",
    "updatedBy": "admin@example.com"
  }
}
```

---

## 実装の詳細

### 1. Lambda Request Authorizer実装

**新規ファイル**: `packages/cdk/lambda/authorizer.ts`

```typescript
import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { verifyToken } from './utils/auth';
import { getTenant } from './tenantManager';
import ipRangeCheck from 'ip-range-check';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log('Authorizer invoked:', {
      methodArn: event.methodArn,
      sourceIp: event.requestContext.identity.sourceIp,
    });

    // 1. JWT検証
    const authHeader = event.headers?.['Authorization'] || event.headers?.['authorization'];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const claims = await verifyToken(token);

    // 2. テナントID取得
    const tenantId = claims['custom:tenant_id'];
    const userId = claims['cognito:username'];

    if (!tenantId) {
      throw new Error('No tenant_id in token');
    }

    // 3. テナント情報取得
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      console.error(`Tenant not found: ${tenantId}`);
      throw new Error('Tenant not found');
    }

    // 4. IP制限チェック
    if (tenant.ipAccessControl?.enabled) {
      const clientIp = extractClientIp(event);
      const allowedRanges = tenant.ipAccessControl.allowedIpRanges;

      console.log('IP access control check:', {
        tenantId,
        userId,
        clientIp,
        allowedRanges,
      });

      const allowed = allowedRanges.some(range => {
        try {
          return ipRangeCheck(clientIp, range);
        } catch (error) {
          console.error(`Invalid IP range: ${range}`, error);
          return false;
        }
      });

      if (!allowed) {
        console.warn(`Access denied for user ${userId} from IP ${clientIp}`, {
          tenantId,
          allowedRanges,
        });

        // 監査ログ記録（オプション）
        await logAccessDenied(tenantId, userId, clientIp);

        return generateDenyPolicy(userId, event.methodArn);
      }

      console.log(`Access granted for user ${userId} from IP ${clientIp}`);
    }

    // 5. 許可ポリシーを生成
    return generateAllowPolicy(userId, event.methodArn, {
      tenantId,
      isAdmin: claims['custom:tenantAdmin'] === 'true',
      clientIp: extractClientIp(event),
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized'); // API Gatewayが401を返す
  }
};

/**
 * クライアントIPアドレスを抽出
 */
function extractClientIp(event: APIGatewayRequestAuthorizerEvent): string {
  // X-Forwarded-Forヘッダーから取得（CloudFrontが設定）
  const xForwardedFor = event.headers?.['X-Forwarded-For'] || event.headers?.['x-forwarded-for'];

  if (xForwardedFor) {
    // カンマ区切りの場合、最初のIPがクライアントIP
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // フォールバック: sourceIpはCloudFrontのエッジサーバーIP
  return event.requestContext?.identity?.sourceIp || '0.0.0.0';
}

/**
 * 許可ポリシーを生成
 */
function generateAllowPolicy(
  principalId: string,
  resource: string,
  context: any
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: resource.replace(/\/[^/]+$/, '/*'), // すべてのパスを許可
      }],
    },
    context: {
      // contextは文字列のみサポート（数値やブール値は文字列に変換）
      tenantId: context.tenantId,
      isAdmin: String(context.isAdmin),
      clientIp: context.clientIp,
    },
  };
}

/**
 * 拒否ポリシーを生成
 */
function generateDenyPolicy(
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Deny',
        Resource: resource,
      }],
    },
  };
}

/**
 * アクセス拒否ログを記録（オプション）
 */
async function logAccessDenied(
  tenantId: string,
  userId: string,
  clientIp: string
): Promise<void> {
  // 将来的にDynamoDB監査テーブルやCloudWatch Logsに記録
  console.log('ACCESS_DENIED', { tenantId, userId, clientIp, timestamp: new Date().toISOString() });
}
```

**依存関係追加**: `packages/cdk/lambda/package.json`

```json
{
  "dependencies": {
    "ip-range-check": "^0.2.0"
  }
}
```

### 2. IPユーティリティ実装

**新規ファイル**: `packages/cdk/lambda/utils/ipUtils.ts`

```typescript
import { isIP } from 'net';

/**
 * IP範囲（CIDR表記）の検証
 */
export function validateIpRange(range: string): boolean {
  const trimmed = range.trim();

  // 単一IPアドレスの場合
  if (!trimmed.includes('/')) {
    return isIP(trimmed) !== 0;
  }

  // CIDR表記の場合
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [ip, prefix] = parts;
  const ipVersion = isIP(ip);

  if (ipVersion === 0) {
    return false;
  }

  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum)) {
    return false;
  }

  // IPv4: 0-32, IPv6: 0-128
  const maxPrefix = ipVersion === 4 ? 32 : 128;
  return prefixNum >= 0 && prefixNum <= maxPrefix;
}

/**
 * IP範囲の配列を検証
 */
export function validateIpRanges(ranges: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const range of ranges) {
    if (!validateIpRange(range)) {
      errors.push(`Invalid IP range: ${range}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 3. API Gateway構成変更

**修正ファイル**: `packages/cdk/lib/construct/api/index.ts`

```typescript
import { RequestAuthorizer, IdentitySource, AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

// ... 既存のコード

// Lambda Request Authorizerの作成
const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
  entry: path.join(__dirname, '../../../lambda/authorizer.ts'),
  handler: 'handler',
  runtime: LAMBDA_RUNTIME_NODEJS,
  timeout: cdk.Duration.seconds(10), // Authorizerは最大10秒
  environment: {
    USER_POOL_ID: userPool.userPoolId,
    USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
    TENANTS_TABLE_NAME: tenantsTable.tableName,
    REGION: cdk.Stack.of(this).region,
  },
  bundling: {
    externalModules: ['aws-sdk'], // AWS SDK v2は含めない
  },
});

// DynamoDBテーブルへの読み取り権限
tenantsTable.grantReadData(authorizerFunction);

// CloudWatch Logsへの書き込み権限（自動付与されるが明示）
authorizerFunction.addToRolePolicy(new iam.PolicyStatement({
  actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
  resources: ['*'],
}));

// Lambda Request Authorizerの作成
const authorizer = new RequestAuthorizer(this, 'RequestAuthorizer', {
  handler: authorizerFunction,
  identitySources: [IdentitySource.header('Authorization')],
  resultsCacheTtl: cdk.Duration.minutes(5), // キャッシュTTL（重要）
  authorizerName: 'TenantIpAuthorizer',
});

// API Gatewayのデフォルト認証設定を更新
const commonAuthorizerProps = {
  authorizationType: AuthorizationType.CUSTOM,
  authorizer,
};

api.defaultMethodOptions = commonAuthorizerProps;

// ... 既存のリソース定義
```

**重要**: `resultsCacheTtl`は慎重に設定してください。
- 短すぎる（1分未満）: Lambda Authorizer呼び出しが頻繁に発生しコストが増加
- 長すぎる（10分以上）: IP制限設定変更が反映されるまで時間がかかる
- **推奨**: 5分（IP制限設定変更後、最大5分でテナント全体に反映）

### 4. テナント管理API実装

**新規ファイル**: `packages/cdk/lambda/updateTenantIpAccessControl.ts`

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTenantId } from './utils/tenantUtils';
import { verifyTokenWithRoleCheck } from './utils/auth';
import { updateTenant, getTenant } from './tenantManager';
import { validateIpRanges } from './utils/ipUtils';

interface UpdateIpAccessControlRequest {
  enabled: boolean;
  allowedIpRanges: string[];
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. 認証と権限チェック（管理者のみ）
    const token = event.headers['Authorization'] || event.headers['authorization'] || '';
    const { claims, isCurrentlyAdmin } = await verifyTokenWithRoleCheck(
      token.replace(/^Bearer\s+/i, ''),
      true
    );

    if (!isCurrentlyAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Admin role required to update IP access control',
        }),
      };
    }

    // 2. リクエストボディの検証
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request body is required' }),
      };
    }

    const request: UpdateIpAccessControlRequest = JSON.parse(event.body);

    // 必須フィールドのチェック
    if (typeof request.enabled !== 'boolean') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Field "enabled" is required and must be a boolean' }),
      };
    }

    if (!Array.isArray(request.allowedIpRanges)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Field "allowedIpRanges" is required and must be an array' }),
      };
    }

    // IP範囲の検証
    const validation = validateIpRanges(request.allowedIpRanges);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Invalid IP ranges',
          errors: validation.errors,
        }),
      };
    }

    // 空のIP範囲でenabledをtrueにしようとした場合
    if (request.enabled && request.allowedIpRanges.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Cannot enable IP access control without allowed IP ranges',
        }),
      };
    }

    // 3. テナント情報の更新
    const tenantId = getTenantId(event);
    const userId = claims['cognito:username'];

    // 既存のテナント情報を取得
    const existingTenant = await getTenant(tenantId);
    if (!existingTenant) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Tenant not found' }),
      };
    }

    // テナント情報を更新
    const updatedTenant = await updateTenant({
      tenantId,
      ipAccessControl: {
        enabled: request.enabled,
        allowedIpRanges: request.allowedIpRanges,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    });

    console.log('IP access control updated:', {
      tenantId,
      updatedBy: userId,
      enabled: request.enabled,
      ipRangesCount: request.allowedIpRanges.length,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'IP access control updated successfully',
        ipAccessControl: updatedTenant.ipAccessControl,
      }),
    };
  } catch (error) {
    console.error('Error updating IP access control:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

**新規ファイル**: `packages/cdk/lambda/getTenantIpAccessControl.ts`

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTenantId } from './utils/tenantUtils';
import { verifyTokenWithRoleCheck } from './utils/auth';
import { getTenant } from './tenantManager';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. 認証チェック（管理者のみ）
    const token = event.headers['Authorization'] || event.headers['authorization'] || '';
    const { isCurrentlyAdmin } = await verifyTokenWithRoleCheck(
      token.replace(/^Bearer\s+/i, ''),
      true
    );

    if (!isCurrentlyAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Admin role required to view IP access control settings',
        }),
      };
    }

    // 2. テナント情報の取得
    const tenantId = getTenantId(event);
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Tenant not found' }),
      };
    }

    // 3. IP制限設定を返却（デフォルト値を設定）
    const ipAccessControl = tenant.ipAccessControl || {
      enabled: false,
      allowedIpRanges: [],
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ipAccessControl,
      }),
    };
  } catch (error) {
    console.error('Error getting IP access control:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

**API Gatewayエンドポイント追加**: `packages/cdk/lib/construct/api/admin.ts`

```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

// ... 既存のコード

// IP制限設定の更新（管理者専用）
const updateTenantIpAccessControlFunction = new NodejsFunction(
  this,
  'UpdateTenantIpAccessControl',
  {
    entry: path.join(__dirname, '../../../lambda/updateTenantIpAccessControl.ts'),
    handler: 'handler',
    runtime: LAMBDA_RUNTIME_NODEJS,
    timeout: cdk.Duration.seconds(30),
    environment: {
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      TENANTS_TABLE_NAME: tenantsTable.tableName,
      REGION: cdk.Stack.of(this).region,
    },
  }
);

// IP制限設定の取得（管理者専用）
const getTenantIpAccessControlFunction = new NodejsFunction(
  this,
  'GetTenantIpAccessControl',
  {
    entry: path.join(__dirname, '../../../lambda/getTenantIpAccessControl.ts'),
    handler: 'handler',
    runtime: LAMBDA_RUNTIME_NODEJS,
    timeout: cdk.Duration.seconds(30),
    environment: {
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      TENANTS_TABLE_NAME: tenantsTable.tableName,
      REGION: cdk.Stack.of(this).region,
    },
  }
);

// DynamoDB権限
tenantsTable.grantReadWriteData(updateTenantIpAccessControlFunction);
tenantsTable.grantReadData(getTenantIpAccessControlFunction);

// API Gatewayリソース
const ipAccessControlResource = adminResource.addResource('ip-access-control');

ipAccessControlResource.addMethod(
  'PUT',
  new LambdaIntegration(updateTenantIpAccessControlFunction),
  commonAuthorizerProps
);

ipAccessControlResource.addMethod(
  'GET',
  new LambdaIntegration(getTenantIpAccessControlFunction),
  commonAuthorizerProps
);
```

### 5. フロントエンド実装

**新規コンポーネント**: `packages/web/src/pages/AdminSettings/IpAccessControlSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Toggle,
  Input,
  FormField,
  Alert,
  Box,
  ColumnLayout,
  StatusIndicator,
} from '@cloudscape-design/components';
import { useApi } from '../../hooks/useApi';

interface IpAccessControl {
  enabled: boolean;
  allowedIpRanges: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export const IpAccessControlSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [ipRanges, setIpRanges] = useState<string[]>(['']);
  const [currentSettings, setCurrentSettings] = useState<IpAccessControl | null>(null);

  const api = useApi();

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/ip-access-control');
      const settings = response.data.ipAccessControl;

      if (settings) {
        setCurrentSettings(settings);
        setEnabled(settings.enabled);
        setIpRanges(settings.allowedIpRanges.length > 0 ? settings.allowedIpRanges : ['']);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 空の値を除外
      const filteredRanges = ipRanges.filter(r => r.trim() !== '');

      await api.put('/admin/ip-access-control', {
        enabled,
        allowedIpRanges: filteredRanges,
      });

      setSuccess('IP制限設定を更新しました');
      await fetchCurrentSettings(); // 最新の設定を再取得
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.errors) {
        setError(`更新に失敗しました: ${errorData.errors.join(', ')}`);
      } else {
        setError(errorData?.message || '更新に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const addIpRange = () => {
    setIpRanges([...ipRanges, '']);
  };

  const removeIpRange = (index: number) => {
    const newRanges = ipRanges.filter((_, i) => i !== index);
    setIpRanges(newRanges.length > 0 ? newRanges : ['']);
  };

  const updateIpRange = (index: number, value: string) => {
    const newRanges = [...ipRanges];
    newRanges[index] = value;
    setIpRanges(newRanges);
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="テナントへのアクセスを特定のIPアドレス範囲に制限します"
        >
          IPアクセス制限設定
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && <Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}
        {success && <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>{success}</Alert>}

        {currentSettings && (
          <ColumnLayout columns={2} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">現在の状態</Box>
              <StatusIndicator type={currentSettings.enabled ? 'success' : 'stopped'}>
                {currentSettings.enabled ? '有効' : '無効'}
              </StatusIndicator>
            </div>
            <div>
              <Box variant="awsui-key-label">最終更新</Box>
              <div>
                {currentSettings.updatedAt
                  ? new Date(currentSettings.updatedAt).toLocaleString('ja-JP')
                  : '未設定'}
              </div>
              {currentSettings.updatedBy && (
                <div>
                  <Box variant="small" color="text-body-secondary">
                    更新者: {currentSettings.updatedBy}
                  </Box>
                </div>
              )}
            </div>
          </ColumnLayout>
        )}

        <FormField label="IP制限">
          <Toggle
            checked={enabled}
            onChange={({ detail }) => setEnabled(detail.checked)}
            disabled={loading || saving}
          >
            IP制限を有効にする
          </Toggle>
        </FormField>

        {enabled && (
          <FormField
            label="許可するIPアドレス範囲"
            description="CIDR表記でIPアドレス範囲を指定してください（例: 203.0.113.0/24, 192.0.2.1/32）"
          >
            <SpaceBetween size="xs">
              {ipRanges.map((range, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={range}
                    onChange={({ detail }) => updateIpRange(index, detail.value)}
                    placeholder="例: 203.0.113.0/24"
                    disabled={loading || saving}
                  />
                  {ipRanges.length > 1 && (
                    <Button
                      onClick={() => removeIpRange(index)}
                      disabled={loading || saving}
                    >
                      削除
                    </Button>
                  )}
                </div>
              ))}

              <Button
                onClick={addIpRange}
                disabled={loading || saving}
              >
                IPアドレス範囲を追加
              </Button>
            </SpaceBetween>
          </FormField>
        )}

        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              onClick={fetchCurrentSettings}
              disabled={loading || saving}
            >
              リセット
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={loading}
            >
              保存
            </Button>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </Container>
  );
};
```

**ルーティング追加**: `packages/web/src/App.tsx`

```typescript
import { IpAccessControlSettings } from './pages/AdminSettings/IpAccessControlSettings';

// ... 既存のコード

// 管理者ルート
<Route path="/admin/ip-access-control" element={<IpAccessControlSettings />} />
```

### 6. エラーハンドリング

**修正ファイル**: `packages/web/src/hooks/useHttp.ts`

```typescript
// 既存のインターセプターに追加
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403) {
      const errorData = error.response.data;

      // IP制限エラーの場合
      if (errorData?.message?.toLowerCase().includes('ip') ||
          errorData?.message?.toLowerCase().includes('access denied')) {
        showIpRestrictionError();
      }
    }

    // ... 既存のエラーハンドリング
    return Promise.reject(error);
  }
);

function showIpRestrictionError() {
  // ユーザーにわかりやすいエラーメッセージを表示
  alert(
    'アクセスが制限されています。\n' +
    '許可されたネットワークからアクセスしてください。\n' +
    '詳細については管理者にお問い合わせください。'
  );
}
```

---

## 段階的な実装アプローチ

### フェーズ1: 基盤実装（1週間）

**目標**: Lambda Authorizerの実装とテスト

**タスク**:
1. ✅ Lambda Authorizer実装 (`authorizer.ts`)
2. ✅ IPユーティリティ実装 (`ipUtils.ts`)
3. ✅ Tenantsテーブルスキーマ拡張（手動でテストデータ追加）
4. ✅ API Gateway構成変更（CDKコード更新）
5. ✅ ユニットテストの作成

**検証項目**:
- [ ] JWT検証が正しく動作すること
- [ ] テナント情報の取得が正しく動作すること
- [ ] IPアドレスの抽出が正しく動作すること
- [ ] IP範囲チェックが正しく動作すること（IPv4/IPv6）
- [ ] 許可/拒否ポリシーが正しく生成されること

### フェーズ2: 管理API実装（1週間）

**目標**: テナント管理者がIP制限設定を更新できるようにする

**タスク**:
1. ✅ `updateTenantIpAccessControl.ts` 実装
2. ✅ `getTenantIpAccessControl.ts` 実装
3. ✅ API Gatewayエンドポイント追加
4. ✅ IP範囲検証ロジックの実装
5. ✅ ユニットテストの作成

**検証項目**:
- [ ] 管理者のみがアクセスできること
- [ ] IP範囲の検証が正しく動作すること
- [ ] 不正なIP範囲が拒否されること
- [ ] DynamoDB更新が正しく動作すること

### フェーズ3: フロントエンド実装（1週間）

**目標**: 管理画面でIP制限設定を変更できるようにする

**タスク**:
1. ✅ `IpAccessControlSettings.tsx` コンポーネント実装
2. ✅ ルーティング追加
3. ✅ エラーハンドリング実装
4. ✅ UI/UXテスト

**検証項目**:
- [ ] 現在の設定が正しく表示されること
- [ ] IP範囲の追加/削除が正しく動作すること
- [ ] 保存が正しく動作すること
- [ ] エラーメッセージが適切に表示されること

### フェーズ4: 統合テストとデプロイ（1-2週間）

**目標**: 本番環境へのデプロイと監視

**タスク**:
1. 統合テスト（E2Eテスト）
2. パフォーマンステスト
3. セキュリティレビュー
4. ドキュメント作成
5. ステージング環境へのデプロイ
6. 本番環境へのデプロイ

**検証項目**:
- [ ] すべてのAPIが正しく動作すること
- [ ] IP制限が正しく適用されること
- [ ] Lambda Authorizerのパフォーマンスが許容範囲内であること
- [ ] キャッシュが正しく動作すること
- [ ] 監査ログが正しく記録されること

---

## 注意点とリスク

### 1. Lambda Authorizerのキャッシュ

**リスク**: キャッシュTTLが長すぎると、IP制限設定変更が反映されるまで時間がかかる

**対策**:
- 推奨TTL: 5分
- 管理画面に「設定変更は最大5分で反映されます」と表示
- 緊急時はAPI Gateway AuthorizerのキャッシュをCLIで手動削除可能

```bash
# キャッシュを手動でクリア（AWS CLI）
aws apigateway flush-authorizer-cache \
  --rest-api-id <API_ID> \
  --authorizer-id <AUTHORIZER_ID>
```

### 2. X-Forwarded-Forヘッダーの信頼性

**リスク**: プロキシ経由のアクセスで、X-Forwarded-Forヘッダーが偽装される可能性

**対策**:
- CloudFrontを必ず経由させる（直接API Gatewayアクセスを禁止）
- WAFでCloudFront以外のアクセスをブロック
- `X-Forwarded-For`の最初のIPのみを信頼

### 3. IPv6対応

**リスク**: IPv6アドレスの検証と処理が正しく動作しない

**対策**:
- `ip-range-check`ライブラリはIPv6に対応
- テストケースでIPv6アドレスを必ずテスト
- フロントエンドでIPv6の例を明示

### 4. DynamoDBスキャン回避

**リスク**: Lambda Authorizerで毎回DynamoDBをスキャンするとコストが増加

**対策**:
- `getTenant(tenantId)`は`GetItem`操作（スキャンではない）
- DynamoDB On-Demandモードで自動スケーリング
- Lambda Authorizerのレスポンスキャッシュを活用

### 5. 管理者権限の確認

**リスク**: トークンのclaimが古い場合、管理者権限が取り消されても更新できる

**対策**:
- `verifyTokenWithRoleCheck`で現在の属性をリアルタイム取得（既存実装）
- 管理者権限変更後は`AdminUserGlobalSignOut`でセッション無効化

### 6. IP制限無効時の動作

**重要**: `ipAccessControl.enabled = false`の場合、IP制限をスキップする

**確認**:
```typescript
if (tenant.ipAccessControl?.enabled) {
  // IP制限チェック
}
// enabledがfalseの場合は何もしない（すべて許可）
```

### 7. エラーログと監査

**リスク**: アクセス拒否の監査ログが不十分

**対策**:
- CloudWatch Logsに詳細なログを記録（Lambda Authorizerで実装済み）
- 将来的にDynamoDB監査テーブルへの記録を検討
- IP制限違反の集計レポートを作成

---

## 代替案

### 代替案1: Lambda関数内での検証

**実装**: 各Lambda関数の先頭でIP制限を実施

**メリット**:
- 既存アーキテクチャの変更が最小限

**デメリット**:
- すべてのLambda関数（約50+ファイル）に共通コードを追加する必要がある
- メンテナンス負荷が高い
- 実装漏れのリスク

**推奨度**: ❌ 非推奨（メンテナンス性が低い）

### 代替案2: WAF + Lambda連携

**実装**: WAFでテナントごとのIPセットを管理し、Lambda Authorizerで動的に更新

**メリット**:
- 最も早い段階でブロック（CloudFront/API Gateway層）
- DDoS対策にも効果的

**デメリット**:
- WAF IPセットの管理が複雑（上限10,000エントリ/IPセット）
- コストが高い（WAF課金）
- テナント数が多い場合にスケールしにくい

**推奨度**: △ 将来的な検討案（高セキュリティ要件の場合）

### 代替案3: Cognito Pre Token Generationでの検証

**実装**: Pre Token Generation TriggerでIPアドレスをチェック

**メリット**:
- トークン発行時点でIP制限を実施

**デメリット**:
- Cognito Triggerの制限時間（5秒）
- トークン発行後のIP変更に対応できない
- IPアドレスがトークンに含まれない（取得が困難）

**推奨度**: ❌ 非推奨（技術的制約が大きい）

---

## コスト試算

### Lambda Authorizer方式（推奨）

**前提**:
- テナント数: 100
- ユーザー数: 10,000
- APIリクエスト数: 100万リクエスト/月
- Lambda Authorizer キャッシュTTL: 5分

**コスト内訳**:

| 項目 | 計算 | 月額コスト |
|------|------|-----------|
| Lambda Authorizer呼び出し | 100万リクエスト ÷ (5分 × 平均10リクエスト/ユーザー) ≈ 20,000回 | $0.004 |
| Lambda Authorizer実行時間 | 20,000回 × 100ms × $0.0000166667/100ms-GB | $0.33 |
| DynamoDB GetItem | 20,000回 × $0.25/100万リクエスト | $0.005 |
| CloudWatch Logs | 20,000回 × 1KB × $0.50/GB | $0.01 |
| **合計** | | **約$0.35/月** |

**結論**: 追加コストはほぼ無視できるレベル（月額$1未満）

### WAF方式（代替案）

**前提**:
- テナント数: 100
- APIリクエスト数: 100万リクエスト/月

**コスト内訳**:

| 項目 | 計算 | 月額コスト |
|------|------|-----------|
| WAF基本料金 | $5/月 | $5.00 |
| WAFルール | $1/ルール × 2ルール | $2.00 |
| WAFリクエスト | 100万リクエスト × $0.60/100万リクエスト | $0.60 |
| IP Set管理 | $1/IPセット × 5IPセット | $5.00 |
| Lambda更新処理 | 100回/月 × $0.20/100万リクエスト | $0.02 |
| **合計** | | **約$12.62/月** |

**結論**: Lambda Authorizer方式の約36倍のコスト

---

## 参考資料

### 内部ドキュメント

- [TENANT_ADMIN_IMPLEMENTATION.md](./TENANT_ADMIN_IMPLEMENTATION.md) - テナント管理者機能の実装詳細
- [OPENFGA_IMPLEMENTATION.md](./OPENFGA_IMPLEMENTATION.md) - OpenFGA認可システムの実装詳細

### 関連ファイル

**認証・認可**:
- [packages/cdk/lib/construct/auth.ts](../packages/cdk/lib/construct/auth.ts) - Cognito構成
- [packages/cdk/lambda/utils/auth.ts](../packages/cdk/lambda/utils/auth.ts) - JWT検証
- [packages/cdk/lambda/utils/tenantUtils.ts](../packages/cdk/lambda/utils/tenantUtils.ts) - テナント識別

**テナント管理**:
- [packages/cdk/lambda/tenantManager.ts](../packages/cdk/lambda/tenantManager.ts) - テナント管理ロジック
- [packages/cdk/lib/construct/tenant-manager.ts](../packages/cdk/lib/construct/tenant-manager.ts) - TenantsテーブルCDK定義

**API Gateway**:
- [packages/cdk/lib/construct/api/index.ts](../packages/cdk/lib/construct/api/index.ts) - API Gateway構成
- [packages/cdk/lib/construct/api/admin.ts](../packages/cdk/lib/construct/api/admin.ts) - 管理者API

### AWS公式ドキュメント

- [Lambda Authorizers for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html)
- [Using AWS Lambda with Amazon API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [IP Range Checking in Node.js](https://www.npmjs.com/package/ip-range-check)

---

## 結論

テナント別IP制限機能は**実現可能**であり、**Lambda Request Authorizer方式**での実装を推奨します。

この方式は：
- ✅ ChatGPT Enterpriseと同様のアーキテクチャ
- ✅ コスト効率が良い（月額$1未満の追加コスト）
- ✅ 既存の認証フローとの統合が容易
- ✅ 将来的な拡張性が高い
- ✅ セキュリティとパフォーマンスのバランスが良い

実装期間は**2-3週間**（テストを含む）を見込んでおり、段階的なロールアウトにより安全にデプロイ可能です。

---

**次のステップ**:

1. このドキュメントのレビューと承認
2. フェーズ1（基盤実装）の開始
3. テスト環境での検証
4. ステージング環境へのデプロイ
5. 本番環境へのデプロイ

---

**作成者**: Claude Code
**最終更新**: 2025-10-30
