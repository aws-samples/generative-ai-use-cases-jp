# テナントスタックのデプロイメント

このドキュメントでは、メインアプリケーションスタックとは別にテナント固有のスタックをデプロイする方法について説明します。

## 概要

CDKアプリケーションは、テナント固有のインフラストラクチャを個別にデプロイすることをサポートするようになりました。これにより以下が可能になります：

- アプリケーション全体を再デプロイすることなく、個々のテナント用のIAMロールを作成
- テナントリソースを独立して管理
- 必要に応じてテナントインフラストラクチャをスケール

## 設定ファイル

アプリケーションは、異なるデプロイタイプに対して個別のCDK設定ファイルを使用します：

- `cdk.json` - 共通スタック（メインアプリケーション）の設定
- `cdk.tenant.json` - テナント固有スタックの設定（gitignored）
- `cdk.tenant.example.json` - テナント設定用のサンプルテンプレート

この分離により、共通デプロイとテナントデプロイで異なる環境設定を維持できます。

テナントデプロイを開始するには：

1. `cdk.tenant.example.json`を`cdk.tenant.json`にコピー
2. テナント固有の設定で値を更新
3. `npm run cdk:deploy:tenant`を実行

## デプロイメントコマンド

アプリケーションは、共通スタックとテナントスタック用に個別のデプロイメントコマンドを提供します：

- `npm run cdk:deploy` - `cdk.json`を使用してすべての共通スタックをデプロイ
- `npm run cdk:deploy:tenant` - `cdk.tenant.json`を使用してテナント固有のスタックをデプロイ
- `npm run cdk:destroy` - すべての共通スタックを削除
- `npm run cdk:destroy:tenant` - すべてのテナントスタックを削除

## ディレクトリ構造

```
packages/cdk/lib/
├── stacks/
│   ├── common/          # 共通スタック（メインアプリケーション）
│   │   ├── agent-stack.ts
│   │   ├── cloud-front-waf-stack.ts
│   │   ├── dashboard-stack.ts
│   │   ├── generative-ai-use-cases-stack.ts
│   │   ├── guardrail-stack.ts
│   │   ├── rag-knowledge-base-stack.ts
│   │   └── video-tmp-bucket-stack.ts
│   └── tenant/          # テナント固有のスタック
│       └── tenant-iam-role-stack.ts
├── create-stacks.ts     # メインスタック作成
└── create-tenant-stacks.ts  # テナントスタック作成
```

## テナントIAMロールスタックのデプロイ

### 設定

`cdk.tenant.json`ファイルを作成してテナントデプロイメントを設定します：

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/generative-ai-use-cases-tenant.ts",
  "context": {
    "tenantId": "tenant123",
    "identityProviderArn": "arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_XXXXXXXX",
    "audience": "your-client-id",
    "tenantIdClaim": "custom:tenant_id",
    "tenantRegion": "us-east-1",
    "roleName": "CustomTenantRole"
  }
}
```

### デプロイメントコマンド

```bash
# すべてのテナントスタックをデプロイ
npm run cdk:deploy:tenant

# 特定のテナントスタックをデプロイ
npm run cdk:deploy:tenant -- TenantStack-tenant123

# すべてのテナントスタックを削除
npm run cdk:destroy:tenant
```

### 設定オプション

- `tenantId`（必須）：テナントの一意の識別子
- `identityProviderArn`（必須）：IDプロバイダー（Cognito User PoolまたはOIDCプロバイダー）のARN
- `audience`（必須）：IDプロバイダーのオーディエンス/クライアントID
- `tenantIdClaim`：テナントIDを含むJWTクレーム（デフォルト："custom:tenant_id"）
- `tenantRegion`：デプロイメント用のAWSリージョン（デフォルト：CDK_DEFAULT_REGIONまたはus-east-1）
- `roleName`：カスタムロール名（デフォルト：TenantRole-{tenantId}）

## スタックの出力

デプロイ後、スタックは以下を出力します：

- **RoleArn**：作成されたIAMロールのARN
- **RoleName**：作成されたIAMロールの名前

## さらなるテナントスタックの追加

テナント固有のスタックをさらに追加するには：

1. `packages/cdk/lib/stacks/tenant/`に新しいスタッククラスを作成
2. `packages/cdk/lib/create-tenant-stacks.ts`でインポートしてインスタンス化
3. 上記と同じパターンを使用してデプロイ

## IAMポリシー設定

テナントIAMロールには、テナント分離ポリシーを作成するためのヘルパーメソッドが含まれています：

### テナントごとのDynamoDBテーブル

ロールは、`<BaseTableName>-<TenantId>`の命名パターンを持つテナントごとのDynamoDBテーブルへのアクセスをサポートします。

```typescript
// 例：'ChatHistory-tenant123'テーブルへのアクセスを許可
const dynamoPolicy =
  tenantIamRole.createDynamoDbTenantTablePolicyStatement('ChatHistory');
tenantIamRole.addToPolicy(dynamoPolicy);
```

このポリシーにより、テナントはJWTトークン内のテナントIDクレームに基づいて、自分のテーブルのみにアクセスできます。

## ベストプラクティス

1. **命名規則**：テナントリソースには一貫した命名を使用（例：スタック名にテナントIDを含める）
2. **テーブル命名**：DynamoDBテーブルには`<BaseTableName>-<TenantId>`パターンに従う
3. **分離**：テナントリソースを共通リソースから分離して保持
4. **ドキュメント**：テナント固有の設定や要件を文書化
5. **テスト**：最初に開発環境でテナントスタックのデプロイメントをテスト
