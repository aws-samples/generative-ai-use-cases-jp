import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Stack, Duration, CfnResource } from 'aws-cdk-lib';
import { Architecture, Runtime, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Database } from '../../temp-bedrock-chat/constructs/database';
import { WebSocket } from '../../temp-bedrock-chat/constructs/websocket';
import { Embedding } from '../../temp-bedrock-chat/constructs/embedding';
import { UsageAnalysis } from '../../temp-bedrock-chat/constructs/usage-analysis';
import { BotStore, Language } from '../../temp-bedrock-chat/constructs/bot-store';
import { excludeDockerImage } from '../../temp-bedrock-chat/constants/docker';
import { BedrockCustomBotCodebuild } from '../../temp-bedrock-chat/constructs/bedrock-custom-bot-codebuild';

/**
 * テナント専用のBedrock Chatスタックのプロパティ定義
 * 各テナントごとに独立したチャット機能のリソースを作成するための設定値
 */
export interface TenantBedrockChatStackProps extends cdk.StackProps {
  /**
   * テナント識別子
   * 各テナントを一意に識別するID（例：tenant-001, company-abc など）
   */
  readonly tenantId?: string;

  /**
   * 環境名（例：dev, staging, prod）
   * リソース名の一部として使用され、環境ごとの分離を実現
   */
  readonly environment: string;

  /**
   * Amazon Bedrockを使用するAWSリージョン
   * Bedrockサービスが利用可能なリージョンを指定（例：us-east-1, ap-northeast-1）
   */
  readonly bedrockRegion: string;

  /**
   * RAG（Retrieval-Augmented Generation）のレプリカを有効化するかどうか
   * RAGは文書検索と生成AIを組み合わせた機能で、レプリカにより可用性と性能が向上
   */
  readonly enableRagReplicas?: boolean;

  /**
   * Bedrockのクロスリージョン推論を有効化するかどうか
   * 複数リージョンでの推論により、レイテンシーの低減と可用性の向上を実現
   */
  readonly enableBedrockCrossRegionInference?: boolean;

  /**
   * Lambda SnapStartを有効化するかどうか
   * SnapStartはLambda関数の起動時間を短縮する機能（Java環境で特に効果的）
   */
  readonly enableLambdaSnapStart?: boolean;

  /**
   * ボットストアのレプリカを有効化するかどうか
   * ボットストアの可用性と読み取り性能を向上
   */
  readonly enableBotStoreReplicas?: boolean;

  /**
   * ボットストアで使用する言語設定
   * 日本語（ja）、英語（en）など、対応言語を指定
   */
  readonly botStoreLanguage?: Language;

  /**
   * グローバルで利用可能なAIモデルのリスト
   * 使用可能なBedrock AIモデルのID一覧（例：claude-3-sonnet など）
   */
  readonly globalAvailableModels?: string[];

  /**
   * 環境プレフィックス
   * リソース名の先頭に付与される識別子（例：prod-、dev- など）
   */
  readonly envPrefix?: string;

  /**
   * リソースの削除ポリシー
   * RETAIN（保持）またはDESTROY（削除）を指定
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  // Cognito関連のプロパティは削除済み
  // クロスアカウント環境ではプロキシ経由でユーザー情報を受け取るため不要
}

/**
 * テナント専用のBedrock Chatスタック
 * 
 * このスタックは、各テナントごとに独立したチャット機能を提供するためのAWSリソースを作成します。
 * マルチテナントアーキテクチャにおいて、各テナントのデータとリソースを完全に分離し、
 * セキュアで独立したチャット環境を実現します。
 */
export class TenantBedrockChatStack extends cdk.Stack {
  /**
   * データベースコンストラクト
   * チャット履歴、ボット情報、WebSocketセッションなどを管理するDynamoDBテーブル群
   */
  public readonly database: Database;

  /**
   * Embeddingコンストラクト（オプション）
   * RAG機能のための文書ベクトル化と検索機能を提供
   */
  public readonly embedding?: Embedding;

  /**
   * 使用状況分析コンストラクト（オプション）
   * チャットの利用状況をAthenaで分析するための機能
   */
  public readonly usageAnalysis?: UsageAnalysis;

  /**
   * ボットストアコンストラクト（オプション）
   * カスタムボットの定義と管理、OpenSearchによる検索機能
   */
  public readonly botStore?: BotStore;

  /**
   * ドキュメントバケット
   * RAG機能で使用する文書ファイルを保存するS3バケット
   */
  public readonly documentBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: TenantBedrockChatStackProps) {
    super(scope, id, props);

    // テナントIDの取得または作成
    // propsで提供されない場合は、CloudFormationパラメータとして定義
    const tenantId = props?.tenantId || new cdk.CfnParameter(this, 'TenantId', {
      description: 'Bedrock Chatリソース用のテナント識別子',
      type: 'String',
      allowedPattern: '^[a-zA-Z0-9-]+$',
      constraintDescription: 'テナントIDは英数字とハイフンのみ使用可能です',
    }).valueAsString;

    // 必須パラメータの取得
    const environment = props.environment;  // 環境名（dev, staging, prod など）
    const bedrockRegion = props.bedrockRegion;  // Bedrockを使用するリージョン

    // ==============================================
    // 1. ドキュメントバケットの作成
    // ==============================================
    // RAG機能で使用する文書ファイル（PDF、テキストなど）を保存するS3バケット
    // テナントごとに完全に分離されたストレージを提供
    this.documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `bedrock-chat-docs-${environment}-${tenantId}`,
      encryption: s3.BucketEncryption.S3_MANAGED,  // S3管理の暗号化を使用
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // パブリックアクセスを完全にブロック
      enforceSSL: true,  // HTTPS接続のみを許可
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,  // スタック削除時の動作
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,  // DESTROYの場合、中身も削除
      cors: [  // CORS設定（ブラウザからの直接アップロードを許可）
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ["*"],  // 本番環境では特定のドメインに制限すべき
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // ==============================================
    // 2. データベースの作成
    // ==============================================
    // DynamoDBテーブル群を作成（会話履歴、ボット定義、セッション管理など）
    // Point-in-Time Recovery（PITR）を有効化して、データの復旧を可能に
    this.database = new Database(this, 'Database', {
      pointInTimeRecovery: true,  // 過去35日間の任意の時点へのリストアが可能
    });

    // ==============================================
    // 3. 大容量メッセージ用バケットの作成
    // ==============================================
    // WebSocketやAPIで扱えない大きなメッセージ（画像、長文など）を
    // 一時的に保存するためのS3バケット
    const largeMessageBucket = new s3.Bucket(this, 'LargeMessageBucket', {
      bucketName: `bedrock-chat-large-msg-${environment}-${tenantId}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,
    });

    // ==============================================
    // 4. API Lambda関数の作成
    // ==============================================
    // Lambda関数用のIAMロールを作成
    const handlerRole = new iam.Role(this, 'HandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    
    // 基本的なLambda実行権限を付与
    handlerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    
    // tableAccessRoleをAssumeRoleできる権限を付与
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [this.database.tableAccessRole.roleArn],
      })
    );
    
    // Bedrock ChatのAPI処理を行うLambda関数
    // メインスタックのプロキシから呼び出される
    const apiHandler = new PythonFunction(this, 'ApiHandler', {
      entry: path.join(__dirname, '../../temp-bedrock-chat/backend'),
      index: 'app/main.py',
      bundling: {
        assetExcludes: [...excludeDockerImage],
        buildArgs: { POETRY_VERSION: "1.8.3" },
      },
      runtime: Runtime.PYTHON_3_13,
      architecture: Architecture.X86_64,
      memorySize: 1024,
      timeout: Duration.minutes(15),
      environment: {
        CONVERSATION_TABLE_NAME: this.database.conversationTable.tableName,
        BOT_TABLE_NAME: this.database.botTable.tableName,
        ENV_NAME: props.environment,
        ENV_PREFIX: props.envPrefix || '',
        // CORS設定はメインスタックのものを使用
        CORS_ALLOW_ORIGINS: '*',
        // Cognito認証は使用しない（プロキシ経由でユーザー情報を受け取る）
        USER_POOL_ID: '',
        CLIENT_ID: '',
        ACCOUNT: Stack.of(this).account,
        REGION: Stack.of(this).region,
        BEDROCK_REGION: props.bedrockRegion,
        TABLE_ACCESS_ROLE_ARN: this.database.tableAccessRole.roleArn,
        DOCUMENT_BUCKET: this.documentBucket.bucketName,
        LARGE_MESSAGE_BUCKET: largeMessageBucket.bucketName,
        OPENSEARCH_DOMAIN_ENDPOINT: this.botStore?.openSearchEndpoint || '',
        ENABLE_BEDROCK_CROSS_REGION_INFERENCE: 'true',
        GLOBAL_AVAILABLE_MODELS: props.globalAvailableModels 
          ? JSON.stringify(props.globalAvailableModels)
          : '[]',
        // UsageAnalysis関連の環境変数
        USAGE_ANALYSIS_DATABASE: this.usageAnalysis?.database.databaseName || '',
        USAGE_ANALYSIS_TABLE: this.usageAnalysis?.ddbExportTable.tableName || '',
        USAGE_ANALYSIS_WORKGROUP: this.usageAnalysis?.workgroupName || '',
        USAGE_ANALYSIS_OUTPUT_LOCATION: this.usageAnalysis
          ? `s3://${this.usageAnalysis.resultOutputBucket.bucketName}`
          : '',
        // Lambda Web Adapter設定
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '8000',
      },
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'LwaLayer',
          `arn:aws:lambda:${Stack.of(this).region}:753240598075:layer:LambdaAdapterLayerX86:23`
        ),
      ],
      role: handlerRole,
    });

    // Lambda Web Adapterのハンドラー設定
    (apiHandler.node.defaultChild as CfnResource).addPropertyOverride(
      'Handler',
      'run.sh'
    );

    // S3バケットへのアクセス権限を付与
    this.documentBucket.grantReadWrite(apiHandler);
    largeMessageBucket.grantReadWrite(apiHandler);
    
    // WebSocketセッションテーブルへのアクセス権限を付与（32KB超のメッセージ処理用）
    this.database.websocketSessionTable.grantReadWriteData(apiHandler);

    // Bedrockへのアクセス権限
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:*'],
        resources: ['*'],
      })
    );
    
    // Cognito権限は削除（クロスアカウントアクセス不可のため）
    // ユーザー情報はプロキシLambdaからカスタムヘッダー経由で受け取る

    // OpenSearchへのアクセス権限（BotStore使用時）
    if (this.botStore?.openSearchEndpoint) {
      handlerRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'aoss:APIAccessAll',
            'aoss:DescribeCollection',
            'aoss:GetCollection',
            'aoss:SearchCollections',
            'aoss:BatchGetCollection',
            'aoss:ListCollections',
          ],
          resources: ['*'],
        })
      );
      handlerRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['aoss:DescribeIndex', 'aoss:ReadDocument'],
          resources: [
            `arn:aws:aoss:${Stack.of(this).region}:${Stack.of(this).account}:collection/*`,
          ],
        })
      );
    }
    
    // SecretManager権限（Firecrawl APIキーなどの管理用）
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'secretsmanager:CreateSecret',
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:RestoreSecret',
          'secretsmanager:PutSecretValue',
          'secretsmanager:UpdateSecretVersionStage',
          'secretsmanager:DeleteSecret',
          'secretsmanager:RotateSecret',
          'secretsmanager:CancelRotateSecret',
          'secretsmanager:UpdateSecret',
          'secretsmanager:TagResource',
        ],
        resources: [
          `arn:aws:secretsmanager:${Stack.of(this).region}:${Stack.of(this).account}:secret:firecrawl/*/*`,
        ],
      })
    );
    
    // UsageAnalysis関連の権限（使用状況分析機能用）
    if (this.usageAnalysis) {
      // Athenaクエリ実行権限
      handlerRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'athena:GetWorkGroup',
            'athena:StartQueryExecution',
            'athena:StopQueryExecution',
            'athena:GetQueryExecution',
            'athena:GetQueryResults',
            'athena:GetDataCatalog',
          ],
          resources: [this.usageAnalysis.workgroupArn || ''],
        })
      );
      
      // Glueデータカタログへのアクセス権限
      handlerRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['glue:GetDatabase', 'glue:GetDatabases'],
          resources: [
            this.usageAnalysis.database.databaseArn || '',
            this.usageAnalysis.database.catalogArn || '',
          ],
        })
      );
      
      handlerRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'glue:GetDatabase',
            'glue:GetTable',
            'glue:GetTables',
            'glue:GetPartition',
            'glue:GetPartitions',
          ],
          resources: [
            this.usageAnalysis.database.databaseArn || '',
            this.usageAnalysis.database.catalogArn || '',
            this.usageAnalysis.ddbExportTable.tableArn || '',
          ],
        })
      );
      
      // S3バケットへのアクセス権限
      this.usageAnalysis.resultOutputBucket.grantReadWrite(handlerRole);
      this.usageAnalysis.ddbBucket.grantRead(handlerRole);
    }


    // ==============================================
    // 5. CodeBuildプロジェクトの作成（Knowledge Base用）
    // ==============================================
    // CodeBuildプロジェクト用のソースバケットを作成
    const codeBuildSourceBucket = new s3.Bucket(this, 'CodeBuildSourceBucket', {
      bucketName: `bedrock-chat-codebuild-src-${environment}-${tenantId}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,
    });
    
    // CodeBuild用のソースコードをS3バケットにデプロイ
    new s3deploy.BucketDeployment(this, 'CodeBuildSourceDeployment', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../temp-bedrock-chat/codebuild-source')),
      ],
      destinationBucket: codeBuildSourceBucket,
    });
    
    // Knowledge Base構築用のCodeBuildプロジェクトを作成
    const bedrockCustomBotCodebuild = new BedrockCustomBotCodebuild(this, 'BedrockCustomBotCodebuild', {
      envName: environment,
      envPrefix: props.envPrefix || '',
      bedrockRegion: bedrockRegion,
      sourceBucket: codeBuildSourceBucket,
    });

    // ==============================================
    // 6. Embedding（ベクトル化）機能の作成（オプション）
    // ==============================================
    // RAG（Retrieval-Augmented Generation）機能のための文書ベクトル化
    // 文書をAIが理解できる数値ベクトルに変換し、類似検索を可能にする
    if (props.enableRagReplicas !== false) {
      this.embedding = new Embedding(this, 'Embedding', {
        bedrockRegion,
        database: this.database,
        documentBucket: this.documentBucket,
        bedrockCustomBotProject: bedrockCustomBotCodebuild.project,
        enableRagReplicas: props.enableRagReplicas || false,  // レプリカによる高可用性
      });
    }

    // ==============================================
    // 7. 使用状況分析機能の作成
    // ==============================================
    // チャットの利用状況を分析するためのログ収集とAthenaクエリ環境
    // アクセスログ保存用バケットの作成
    const accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
      bucketName: `bedrock-chat-access-logs-${environment}-${tenantId}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,
    });

    // 使用状況分析コンストラクトの作成
    // DynamoDBのデータをエクスポートし、Athenaで分析可能にする
    this.usageAnalysis = new UsageAnalysis(this, 'UsageAnalysis', {
      envPrefix: props.envPrefix || '',
      accessLogBucket,  // ログの保存先
      sourceDatabase: this.database,  // 分析対象のデータベース
    });

    // ==============================================
    // 8. ボットストア機能の作成（オプション）
    // ==============================================
    // カスタムボットの定義、管理、検索機能を提供
    // OpenSearchを使用した高度な検索が可能
    this.botStore = new BotStore(this, 'BotStore', {
      envPrefix: props.envPrefix || '',
      botTable: this.database.botTable,  // ボット定義を保存するテーブル
      conversationTable: this.database.conversationTable,  // 会話履歴テーブル
      language: props.botStoreLanguage || 'ja',  // デフォルトは日本語
      enableBotStoreReplicas: props.enableBotStoreReplicas || false,  // レプリカによる高可用性
    });

    // ==============================================
    // 9. スタック出力の定義
    // ==============================================
    // 他のスタックやアプリケーションから参照するための出力値
    
    // API Lambda関数のARN（プロキシから呼び出すため）
    new cdk.CfnOutput(this, 'ApiHandlerArn', {
      value: apiHandler.functionArn,
      description: `テナント ${tenantId} のAPI Lambda関数ARN`,
      exportName: `${this.stackName}-ApiHandlerArn`,
    });

    // ドキュメントバケット名
    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: this.documentBucket.bucketName,
      description: `テナント ${tenantId} のドキュメントバケット名`,
      exportName: `${this.stackName}-DocumentBucketName`,
    });

    // ==============================================
    // 10. リソースタグの追加
    // ==============================================
    // コスト管理とリソース識別のためのタグ付け
    cdk.Tags.of(this).add('TenantId', tenantId.toString());  // テナント識別用
    cdk.Tags.of(this).add('Environment', environment);  // 環境識別用
    cdk.Tags.of(this).add('Purpose', 'TenantBedrockChat');  // 用途識別用

    // スタックの説明文を設定
    this.templateOptions.description = 
      `テナント ${tenantId} 専用のBedrock Chatリソースを作成します`;
  }
}