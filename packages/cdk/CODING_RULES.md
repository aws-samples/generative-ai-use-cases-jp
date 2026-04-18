# コーディング規約

## CDK (AWS Cloud Development Kit)

### 1. ファイル・ディレクトリ構成

**概要**: 機能別にディレクトリを分けて、コードの可読性と保守性を向上させる

#### 基本構成

```
packages/cdk/
├── bin/                    # CDKアプリのエントリーポイント
├── lib/                    # CDK Stackとメインロジック
│   ├── construct/          # 再利用可能なConstruct
│   └── utils/              # ヘルパー関数・ユーティリティ
├── lambda/                 # TypeScript/JavaScript Lambda関数
├── lambda-python/          # Python Lambda関数
├── custom-resources/       # カスタムリソース
├── assets/                 # 静的アセット
├── parameter.ts            # 設定管理（メイン）
└── cdk.json               # CDK設定ファイル
```

#### ファイル配置ルール

- **Stack**: `lib/` 直下に配置（例: `lib/genu-stack.ts`）
- **Construct**: `lib/construct/` 配下に配置（例: `lib/construct/auth.ts`）
- **Lambda関数**: 言語別にディレクトリ分け
  - TypeScript/JavaScript: `lambda/`（基本はこちらを使用）
  - Python: `lambda-python/`（Pythonでしか実装できない機能のみ）
- **カスタムリソース**: `custom-resources/` 配下に機能別フォルダ作成
- **ユーティリティ**: `lib/utils/` 配下に配置

#### Lambda関数の言語選択基準

```typescript
// ✅ 良い例 - 基本はTypeScript/JavaScriptを使用
// lambda/createChat.ts
export const handler = async (event: APIGatewayProxyEvent) => {
  // 一般的なAPI処理
};

// ✅ 良い例 - Pythonでしか実装できない機能
// lambda-python/generic-agent-core-runtime/app.py
# AgentCore固有のPythonライブラリが必要な処理
import agent_core_specific_library

// ❌ 悪い例 - TypeScriptで実装可能なのにPythonを使用
// lambda-python/simple-api/handler.py
# 単純なAPI処理をPythonで実装
```

#### Lambda関数のファイル分割単位

```typescript
// ✅ 良い例 - Web API単位で分割
// lambda/createChat.ts - チャット作成API
// lambda/deleteChat.ts - チャット削除API
// lambda/listChats.ts - チャット一覧取得API

// ❌ 悪い例 - 機能単位で1つのファイルにまとめる
// lambda/chatHandler.ts - チャット関連の全API処理
export const createChatHandler = async () => {};
export const deleteChatHandler = async () => {};
export const listChatsHandler = async () => {};

// ❌ 悪い例 - 過度に細かく分割
// lambda/validateChatInput.ts - バリデーションのみ
// lambda/saveChatToDb.ts - DB保存のみ
```

#### Lambda関数の定義（Construct内）

**概要**: `NodejsFunction`を使用してConstruct内で定義し、必要最小限の設定のみを行う

##### 使用するConstruct

- **TypeScript/JavaScript**: `NodejsFunction` (aws-cdk-lib/aws-lambda-nodejs) - 必須
- **Python**: 以下のいずれかを使用
  - `PythonFunction` (@aws-cdk/aws-lambda-python-alpha) - 単純なPython関数
  - `DockerImageFunction` (aws-cdk-lib/aws-lambda) - 複雑な依存関係がある場合
- **禁止**: `Function` (aws-cdk-lib/aws-lambda) - TypeScriptの場合

##### 基本設定

```typescript
const functionName = new NodejsFunction(this, 'LogicalId', {
  runtime: LAMBDA_RUNTIME_NODEJS, // 必須: 定数を使用
  entry: './lambda/functionName.ts', // 必須: ファイルパス
  timeout: Duration.minutes(15), // 必須: 15分固定
  environment: {
    // 必要な環境変数のみ
    // 設定ルール参照
  },
  bundling: {
    // 外部モジュールがある場合のみ
    nodeModules: ['module-name'],
  },
});
```

##### 環境変数設定ルール

```typescript
environment: {
  // ✅ 必須設定
  TABLE_NAME: props.table.tableName,           // DynamoDB使用時
  MODEL_REGION: props.modelRegion,             // Bedrock使用時

  // ✅ 条件付き設定（三項演算子使用）
  ...(props.knowledgeBaseId
    ? { KNOWLEDGE_BASE_ID: props.knowledgeBaseId }
    : {}),

  // ❌ 不要な設定
  AWS_REGION: 'us-east-1',                     // 自動設定される
  NODE_ENV: 'production',                      // 不要
}
```

##### バンドル設定ルール

```typescript
bundling: {
  // ✅ 必要な外部モジュールのみ指定
  nodeModules: [
    '@aws-sdk/client-bedrock-runtime',         // Bedrock使用時
    '@aws-sdk/client-dynamodb',               // DynamoDB使用時
    'cheerio',                                // HTML解析時
  ],

  // ❌ 不要な設定
  nodeModules: ['aws-sdk'],                   // v2は使用禁止
  minify: true,                              // デフォルトで有効
}
```

##### 権限付与パターン

```typescript
// ✅ 必要最小限の権限のみ
props.table.grantReadData(functionName); // 読み取りのみ
props.table.grantWriteData(functionName); // 書き込みのみ
props.table.grantReadWriteData(functionName); // 読み書き両方

// ✅ Bedrock権限（カスタムポリシー）
functionName.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [`arn:aws:bedrock:${props.modelRegion}::foundation-model/*`],
  })
);

// ❌ 過度な権限
functionName.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['*'],
    resources: ['*'],
  })
);
```

##### 命名規則

```typescript
// ✅ 良い例
const createChatFunction = new NodejsFunction(this, 'CreateChat', {});
const listChatsFunction = new NodejsFunction(this, 'ListChats', {});

// ❌ 悪い例
const function1 = new NodejsFunction(this, 'Function1', {});
const chatFunc = new NodejsFunction(this, 'chatFunc', {});
```

### 2. 命名規則

**概要**: PascalCaseを使用し、役割が明確に分かる名前を付ける

#### Construct名

```typescript
// ✅ 良い例
export class ChatConstruct extends Construct {}
export class RagKendraConstruct extends Construct {}

// ❌ 悪い例
export class chat extends Construct {}
export class ChatComponent extends Construct {}
```

#### Stack名

```typescript
// ✅ 良い例
export class GenUStack extends Stack {}
export class WebSocketApiStack extends Stack {}

// ❌ 悪い例
export class stack extends Stack {}
export class MyStack extends Stack {}
```

#### リソース名

```typescript
// ✅ 良い例 - 自動付番を利用
const chatTable = new Table(this, 'ChatTable', {
  // resourceNameは指定しない
});
const ragBucket = new Bucket(this, 'RagBucket', {
  // bucketNameは指定しない
});

// ❌ 悪い例 - 明示的な名前指定
const table1 = new Table(this, 'Table1', {
  tableName: 'my-chat-table', // 名前の衝突リスクあり
});
const bucket = new Bucket(this, 'bucket', {
  bucketName: 'my-rag-bucket', // グローバルで一意である必要がある
});
```

### 3. リソース名管理

**概要**: CDKの自動付番機能を活用し、明示的なリソース名指定は避ける

#### 自動付番の利用

```typescript
// ✅ 良い例 - CDKが自動でユニークな名前を生成
const lambda = new Function(this, 'ProcessorFunction', {
  // functionNameは指定しない
});

const queue = new Queue(this, 'MessageQueue', {
  // queueNameは指定しない
});

// ❌ 悪い例 - 明示的な名前指定
const lambda = new Function(this, 'ProcessorFunction', {
  functionName: 'my-processor', // 環境間での衝突リスク
});
```

#### 例外的な名前指定

```typescript
// ✅ 良い例 - 外部参照が必要な場合のみ明示的に指定
const apiGateway = new RestApi(this, 'Api', {
  restApiName: `${props.systemName}-api`, // システム名をプレフィックスに使用
});
```

### 4. Construct設計原則

**概要**: 単一責任の原則に従い、必要なプロパティのみを公開する。不必要な分割は避け、汎用性が高い場合のみConstruct化する

#### 適切なConstruct分割

```typescript
// ✅ 良い例 - 可読性向上のための分割
export class AuthenticationConstruct extends Construct {
  // 認証関連のリソースをまとめて可読性を向上
  // 複雑な認証ロジックを分離
}

export class DatabaseConstruct extends Construct {
  // データベース関連のリソースをまとめて可読性を向上
}

// ❌ 悪い例 - 分割する意味がない
export class ChatMessageTableConstruct extends Construct {
  // 単純なテーブル1つだけで分割の必要性がない
}
```

#### Stack分割の判断基準

```typescript
// ✅ 良い例 - 明確な責任分離がある場合
export class NetworkStack extends Stack {} // ネットワーク基盤
export class ApplicationStack extends Stack {} // アプリケーション

// ❌ 悪い例 - 分ける必要がない場合
export class S3Stack extends Stack {} // S3だけ
export class DynamoDBStack extends Stack {} // DynamoDB だけ
export class LambdaStack extends Stack {} // Lambda だけ
```

#### 単一責任の原則

```typescript
// ✅ 良い例 - 認証のみを担当
export class AuthConstruct extends Construct {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;
}

// ❌ 悪い例 - 複数の責任を持つ
export class AppConstruct extends Construct {
  // 認証、API、データベースを全て含む
}
```

#### プロパティの公開

```typescript
// ✅ 良い例
export class ApiConstruct extends Construct {
  public readonly api: RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);
    // 実装
  }
}
```

### 5. 設定管理

**概要**: `packages/cdk/parameter.ts`で設定を一元管理し、cdk.jsonにも同様の設定を追加する。メインはparameter.tsを使用する

#### parameter.tsの活用（メイン）

```typescript
// ✅ 良い例 - parameter.tsから設定を取得
import { getParameter } from './parameter';

const enableRag = getParameter('enableRag');
const modelRegion = getParameter('modelRegion');

// ❌ 悪い例 - ハードコード
const enableRag = true;
const modelRegion = 'us-east-1';
```

#### cdk.jsonとの併用

```json
// cdk.jsonにも同様の設定を記載（parameter.tsと整合性を保つ）
{
  "context": {
    "enableRag": true,
    "ragType": "kendra",
    "modelRegion": "us-east-1"
  }
}
```

#### 設定値の型安全性

```typescript
// ✅ 良い例 - 型定義された設定
interface AppConfig {
  enableRag: boolean;
  modelRegion: string;
  ragType: 'kendra' | 'knowledgeBase';
}

// ❌ 悪い例 - any型や型なし
const config: any = getParameter();
```

### 6. エラーハンドリング

**概要**: 必須パラメータの検証と適切な例外処理を行う

#### 必須パラメータの検証

```typescript
// ✅ 良い例
constructor(scope: Construct, id: string, props: MyConstructProps) {
  super(scope, id);

  if (!props.bucketName) {
    throw new Error('bucketName is required');
  }
}
```

#### 条件付きリソース作成

```typescript
// ✅ 良い例
if (enableRag) {
  new RagConstruct(this, 'Rag', {
    // props
  });
}
```

### 7. セキュリティ

**概要**: 最小権限の原則に従い、機密情報は適切に管理する

#### IAMポリシーの最小権限

```typescript
// ✅ 良い例
lambdaFunction.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['s3:GetObject'],
    resources: [`${bucket.bucketArn}/*`],
  })
);

// ❌ 悪い例
lambdaFunction.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['s3:*'],
    resources: ['*'],
  })
);
```

#### 機密情報の管理

```typescript
// ✅ 良い例
const secret = new Secret(this, 'ApiSecret', {
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'admin' }),
    generateStringKey: 'password',
  },
});

// ❌ 悪い例
const password = 'hardcoded-password';
```

### 8. パフォーマンス

**概要**: 不要なリソース作成を避け、効率的なデプロイを実現する

#### 不要なリソース作成の回避

```typescript
// ✅ 良い例 - 条件付きで作成
const ragConstruct = enableRag ? new RagConstruct(this, 'Rag') : undefined;

// ❌ 悪い例 - 常に作成してから削除
const ragConstruct = new RagConstruct(this, 'Rag');
if (!enableRag) {
  ragConstruct.node.tryRemoveChild('Rag');
}
```

### 9. カスタムリソース

**概要**: 既存のCDK Constructを最優先で使用し、カスタムリソースは最終手段として使用する

#### カスタムリソース使用基準

```typescript
// ✅ 良い例 - 既存のCDK Constructを使用
const bucket = new Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: BucketEncryption.S3_MANAGED,
});

// ✅ 良い例 - CDKが対応していないリソースの場合のみカスタムリソース
const customResource = new CustomResource(this, 'UnsupportedResource', {
  serviceToken: provider.serviceToken,
  properties: {
    // CDKで対応していないAWSリソースの設定
  },
});

// ❌ 悪い例 - CDKで対応可能なのにカスタムリソースを使用
const customBucket = new CustomResource(this, 'CustomBucket', {
  // S3バケットはCDKで対応済み
});
```

#### カスタムリソースが必要な場合

1. **CDKが対応していないAWSリソース**
   - 新しいAWSサービスでCDKサポートが追いついていない場合
2. **CDKが対応していないパラメータ設定**
   - 既存リソースの一部パラメータがCDKで未対応の場合
3. **複雑な初期化処理**
   - リソース作成後に特別な設定が必要な場合

#### 注意事項

- **メンテナンス性の低下**: CDKのアップデートで自動的に恩恵を受けられない
- **可読性の低下**: 生のAWS APIを直接操作するため理解が困難
- **最終手段**: 他に選択肢がない場合のみ使用する
- **将来の移行**: CDKが対応した際は既存Constructに移行する

**概要**: リソース間の依存関係を明示的に定義し、正しいデプロイ順序を保証する

#### 明示的な依存関係

```typescript
// ✅ 良い例
const database = new DatabaseConstruct(this, 'Database');
const api = new ApiConstruct(this, 'Api', {
  table: database.table,
});

api.node.addDependency(database);
```
