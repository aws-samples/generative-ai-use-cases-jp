# テナントスタックのデプロイメント

このドキュメントでは、メインアプリケーションスタックとは別にテナント固有のインフラストラクチャスタック（DynamoDBとS3）をデプロイする方法について説明します。

## 概要

CDKアプリケーションは、シンプルなアプローチを使用してテナント固有のインフラストラクチャを個別にデプロイすることをサポートしています。これにより以下が可能になります：

- テナントリソースを独立して管理（DynamoDBテーブルとS3バケット）
- 必要に応じてテナントインフラストラクチャをスケール
- テナント間の完全なデータとストレージの分離を提供

## アーキテクチャ

テナント固有のデプロイメントでは、複雑なIAMロール管理の必要性を排除し、各テナント用に分離されたDynamoDBテーブルとS3バケットを作成します。各テナントは、環境対応の命名規則と適切な削除保護を持つ独自のリソースセットを持ちます。

### DynamoDBテーブル
各テナントは、適切なインデックスとアクセスパターンを持つデータ保存用の専用DynamoDBテーブルを受け取ります。

### S3バケット
各テナントは3つの専用S3バケットを受け取ります：
- **Documentsバケット**: RAG/ナレッジベースドキュメント保存用
- **Chatバケット**: チャットファイル添付とアップロード用
- **Analyticsバケット**: 使用状況分析とレポートデータ用

すべてのS3バケットは、AWS S3命名要件への準拠を確保するためのハッシュベースの衝突回避機能を備えたグローバル一意命名戦略を使用します。

## 設定ファイル

アプリケーションは、異なるデプロイタイプに対して個別のCDK設定ファイルを使用します：

- `cdk.json` - 共通スタック（メインアプリケーション）の設定
- `cdk.tenant.json` - テナント固有スタックの設定（gitignored）
- `packages/cdk/cdk.tenant.example.json` - テナント設定用のサンプルテンプレート

この分離により、共通デプロイとテナントデプロイで異なる環境設定を維持できます。

テナントデプロイを開始するには：

1. `packages/cdk/cdk.tenant.example.json`を`packages/cdk/cdk.tenant.json`にコピー
2. テナント固有の設定で値を更新
3. `npm run cdk:tenant:deploy`を実行

## デプロイメントコマンド

アプリケーションは、共通スタックとテナントスタック用に個別のデプロイメントコマンドを提供します：

- `npm run cdk:deploy` - `cdk.json`を使用してすべての共通スタックをデプロイ
- `npm run cdk:tenant:deploy` - `cdk.tenant.json`を使用してテナント固有のスタックをデプロイ
- `npm run cdk:tenant:synth` - デプロイなしでテナントスタックを合成
- `npm run cdk:tenant:diff` - テナントスタックの差分を表示
- `npm run cdk:tenant:list` - すべてのテナントスタックをリスト表示
- `npm run cdk:destroy` - すべての共通スタックを削除
- `npm run cdk:tenant:destroy` - すべてのテナントスタックを削除

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
│       ├── tenant-dynamodb-stack.ts
│       └── tenant-s3-stack.ts
├── construct/
│   ├── tenant-dynamodb.ts  # テナントテーブル用のDynamoDBコンストラクト
│   └── tenant-s3.ts        # テナントバケット用のS3コンストラクト
├── create-stacks.ts     # メインスタック作成
└── create-tenant-stacks.ts  # テナントスタック作成
```

## テナントインフラストラクチャスタックのデプロイ

### 設定

`packages/cdk/cdk.tenant.json`ファイルを作成してテナントデプロイメントを設定します：

```json
{
  "context": {
    "tenantId": "tenant123",
    "environment": "dev",
    "tenantRegion": "us-east-1",
    "enableAutoDelete": false
  }
}
```

### デプロイメントコマンド

```bash
# すべてのテナントスタックをデプロイ
npm run cdk:tenant:deploy

# 特定のテナントスタックをデプロイ
npm run cdk:tenant:deploy -- TenantDynamoDBStackdev-tenant123
npm run cdk:tenant:deploy -- TenantS3Stackdev-tenant123

# コンテキストオーバーライドでデプロイ（削除可能なリソースを持つ開発用）
npm run cdk:tenant:deploy -- --context tenantId=my-tenant --context environment=dev --context enableAutoDelete=true

# 本番環境用デプロイ（保持されるリソース）
npm run cdk:tenant:deploy -- --context tenantId=my-tenant --context environment=prod --context enableAutoDelete=false

# テナントスタックを合成（デプロイなし）
npm run cdk:tenant:synth

# テナントスタックの差分を表示
npm run cdk:tenant:diff

# すべてのテナントスタックをリスト表示
npm run cdk:tenant:list

# すべてのテナントスタックを削除
npm run cdk:tenant:destroy
```

### 設定オプション

- `tenantId`（必須）：テナントの一意の識別子
- `environment`（必須）：環境名（例：dev、staging、prod）
- `tenantRegion`：デプロイメント用のAWSリージョン（デフォルト：CDK_DEFAULT_REGIONまたはus-east-1）
- `enableAutoDelete`：リソース削除ポリシーのブールフラグ（true = DESTROY、false = RETAIN、デフォルト：false）

## テナントDynamoDBテーブル

テナントデプロイメントは、各テナント用に3つの専用テーブルを作成します：

### テーブル命名規則

すべてのテーブルは以下のパターンに従います：`{BaseTableName}-{environment}-tenant-{tenantId}`

### ChatHistoryテーブル
- **目的**：テナント固有のチャット会話履歴を保存
- **パーティションキー**：`id` (STRING)
- **ソートキー**：`createdDate` (STRING)
- **グローバルセカンダリインデックス**：`feedback`属性の`FeedbackIndex`

### TokenUsageStatsテーブル
- **目的**：テナントのトークン使用統計を追跡
- **パーティションキー**：`id` (STRING)
- **ソートキー**：`userId` (STRING)
- **グローバルセカンダリインデックス**：月次集計用の`MonthIndex`

### UseCaseBuilderテーブル
- **目的**：テナント固有のユースケース設定を保存
- **パーティションキー**：`id` (STRING)
- **ソートキー**：`dataType` (STRING)
- **グローバルセカンダリインデックス**：ユースケースクエリ用の`UseCaseIdIndexName`

### 環境ベースの機能

- **削除保護**：`enableAutoDelete`が`false`の場合は`RETAIN`削除ポリシーを使用し、`enableAutoDelete`が`true`の場合は`DESTROY`を使用
- **課金モード**：すべてのテーブルはコスト最適化のために`PAY_PER_REQUEST`課金モードを使用
- **タグ付け**：すべてのテーブルはリソース管理のために自動的に`TenantId`と`Environment`でタグ付けされる

## テナントS3バケット

テナントデプロイメントは、グローバル一意命名を持つ各テナント用に3つの専用S3バケットを作成します：

### バケット命名規則

すべてのバケットは、AWS S3要件に準拠するためのグローバル一意パターンに従います：
```
{BucketBaseName}-{environment}-tenant-{tenantId}-{guidHash}
```

- **最大長**：63文字（AWS S3制限）
- **ハッシュ戦略**：一意性と衝突回避のためのSHA256ベースハッシュ化
- **サニタイゼーション**：テナントIDの特殊文字は自動的にハイフンに置換
- **大文字小文字**：すべてのバケット名は小文字

### Documentsバケット
- **目的**：RAG/ナレッジベースドキュメントとファイルの保存
- **ベース名**：`docs`（設定可能）
- **機能**：Webアプリケーションアクセス用CORS有効、バージョニング、暗号化
- **使用例**：ドキュメントアップロード、ナレッジベースコンテンツ、RAGデータソース

### Chatバケット
- **目的**：チャット添付ファイルとアップロードファイルの保存
- **ベース名**：`chat`（設定可能）
- **機能**：Webアプリケーションアクセス用CORS有効、バージョニング、暗号化
- **使用例**：会話内のファイル添付、一時アップロード、共有メディア

### Analyticsバケット
- **目的**：使用状況分析、レポート、メトリクスデータの保存
- **ベース名**：`analytics`（設定可能）
- **機能**：バックエンド専用アクセス（CORS無し）、バージョニング、暗号化
- **使用例**：使用統計、システムメトリクス、監査ログ、レポートデータ

### セキュリティ機能

- **暗号化**：デフォルトでS3管理サーバーサイド暗号化（SSE-S3）有効
- **パブリックアクセス**：すべてのバケットで完全なパブリックアクセスブロック
- **SSL/TLS**：すべての操作でHTTPS専用アクセス強制
- **バージョニング**：データ保護のためのオブジェクトバージョニング有効
- **ライフサイクル管理**：7日後の不完全マルチパートアップロードの自動クリーンアップ

### CORS設定

DocumentsとChatバケットには、Webアプリケーションアクセス用のCORS設定が含まれています：
```json
{
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedOrigins": ["*"],
  "AllowedHeaders": ["*"],
  "MaxAge": 3000
}
```

**注意**：本番環境では、`AllowedOrigins`をアプリケーションの実際のドメインに制限する必要があります。

## スタック命名

テナントスタックは以下のパターンを使用して命名されます：

### DynamoDBスタック
- パターン：`TenantDynamoDBStack{environment}-{tenantId}`
- 例：
  - 開発環境：`TenantDynamoDBStackdev-tenant123`
  - 本番環境：`TenantDynamoDBStackprod-tenant123`

### S3スタック
- パターン：`TenantS3Stack{environment}-{tenantId}`
- 例：
  - 開発環境：`TenantS3Stackdev-tenant123`
  - 本番環境：`TenantS3Stackprod-tenant123`

## さらなるテナントスタックの追加

テナント固有のスタックをさらに追加するには：

1. `packages/cdk/lib/stacks/tenant/`に新しいスタッククラスを作成
2. `packages/cdk/lib/create-tenant-stacks.ts`でインポートしてインスタンス化
3. 上記と同じパターンを使用してデプロイ

## ベストプラクティス

1. **命名規則**：環境とテナントIDを含む、テナントリソースの一貫した命名を使用
2. **リソース命名**：
   - DynamoDBテーブル：`{BaseTableName}-{environment}-tenant-{tenantId}`
   - S3バケット：`{BaseBucketName}-{environment}{hash}-tenant-{tenantId}-{guid}`
3. **環境分離**：適切なライフサイクル管理のために異なる環境（dev、staging、prod）を使用
4. **削除保護**：偶発的な削除を防ぐために本番デプロイメントには`enableAutoDelete: false`を使用
5. **リソースタグ付け**：すべてのテナントリソースはコスト追跡と管理のために自動的にタグ付けされる
6. **セキュリティ**：
   - S3バケットはデフォルトで暗号化とパブリックアクセスブロックで設定される
   - 本番環境では実際のアプリケーションドメインにCORSオリジンを制限
7. **テスト**：最初に`enableAutoDelete: true`を使用して開発環境でテナントスタックのデプロイメントを常にテスト
8. **監視**：コスト最適化のためにS3バケット使用量とDynamoDBパフォーマンスを監視
9. **ドキュメント**：テナント固有の設定や要件を文書化
