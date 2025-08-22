# テナントスタックのデプロイメント

このドキュメントでは、メインアプリケーションスタックとは別にテナント固有のDynamoDBスタックをデプロイする方法について説明します。

## 概要

CDKアプリケーションは、シンプルなテーブルベースのアプローチを使用してテナント固有のインフラストラクチャを個別にデプロイすることをサポートしています。これにより以下が可能になります：

- テナントリソースを独立して管理
- 必要に応じてテナントインフラストラクチャをスケール
- テナント間の完全なデータ分離を提供

## アーキテクチャ

テナント固有のデプロイメントでは、複雑なIAMロール管理の必要性を排除し、各テナント用に分離されたDynamoDBテーブルを作成します。各テナントは、環境対応の命名規則と適切な削除保護を持つ独自のテーブルセットを持ちます。

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
│       └── tenant-dynamodb-stack.ts
├── construct/
│   └── tenant-dynamodb.ts  # テナントテーブル用のDynamoDBコンストラクト
├── create-stacks.ts     # メインスタック作成
└── create-tenant-stacks.ts  # テナントスタック作成
```

## テナントDynamoDBスタックのデプロイ

### 設定

`packages/cdk/cdk.tenant.json`ファイルを作成してテナントデプロイメントを設定します：

```json
{
  "context": {
    "tenantId": "tenant123",
    "environment": "dev",
    "tenantRegion": "us-east-1"
  }
}
```

### デプロイメントコマンド

```bash
# すべてのテナントスタックをデプロイ
npm run cdk:tenant:deploy

# 特定のテナントスタックをデプロイ
npm run cdk:tenant:deploy -- TenantDynamoDBStackdev-tenant123

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

- **削除保護**：本番環境（`prod`）のテーブルは`RETAIN`削除ポリシーを使用し、開発環境（`dev`）は簡単なクリーンアップのために`DESTROY`を使用
- **課金モード**：すべてのテーブルはコスト最適化のために`PAY_PER_REQUEST`課金モードを使用
- **タグ付け**：すべてのテーブルはリソース管理のために自動的に`TenantId`と`Environment`でタグ付けされる

## スタック命名

テナントスタックは以下のパターンを使用して命名されます：`TenantDynamoDBStack{environment}-{tenantId}`

例：
- 開発環境：`TenantDynamoDBStackdev-tenant123`
- 本番環境：`TenantDynamoDBStackprod-tenant123`

## さらなるテナントスタックの追加

テナント固有のスタックをさらに追加するには：

1. `packages/cdk/lib/stacks/tenant/`に新しいスタッククラスを作成
2. `packages/cdk/lib/create-tenant-stacks.ts`でインポートしてインスタンス化
3. 上記と同じパターンを使用してデプロイ

## ベストプラクティス

1. **命名規則**：環境とテナントIDを含む、テナントリソースの一貫した命名を使用
2. **テーブル命名**：すべてのDynamoDBテーブルには`{BaseTableName}-{environment}-tenant-{tenantId}`パターンに従う
3. **環境分離**：適切なライフサイクル管理のために異なる環境（dev、staging、prod）を使用
4. **削除保護**：本番テーブルが偶発的な削除を防ぐ適切な削除ポリシーを持つことを確認
5. **リソースタグ付け**：すべてのテナントリソースはコスト追跡と管理のために自動的にタグ付けされる
6. **テスト**：最初に開発環境でテナントスタックのデプロイメントを常にテスト
7. **ドキュメント**：テナント固有の設定や要件を文書化
