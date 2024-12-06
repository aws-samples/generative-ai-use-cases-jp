import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
  ResponseType,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IdentityPool } from '@aws-cdk/aws-cognito-identitypool-alpha';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3';
import { Agent, AgentMap } from 'generative-ai-use-cases-jp';
import { modelFeatureFlags } from '@generative-ai-use-cases-jp/common';

export interface BackendApiProps {
  userPool: UserPool;
  idPool: IdentityPool;
  table: Table;
  agents?: Agent[];
  guardrailIdentify?: string;
  guardrailVersion?: string;
}

export class Api extends Construct {
  readonly api: RestApi;
  readonly predictStreamFunction: NodejsFunction;
  readonly invokePromptFlowFunction: NodejsFunction;
  readonly optimizePromptFunction: NodejsFunction;
  readonly modelRegion: string;
  readonly modelIds: string[];
  readonly imageGenerationModelIds: string[];
  readonly endpointNames: string[];
  readonly agentNames: string[];
  readonly crossAccountBedrockRoleArn: string;
  readonly fileBucket: Bucket;
  readonly getFileDownloadSignedUrlFunction: IFunction;

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const { userPool, table, idPool } = props;

    // region for bedrock / sagemaker
    const modelRegion = this.node.tryGetContext('modelRegion') || 'us-east-1';
    // region for bedrock agent
    const agentRegion = this.node.tryGetContext('agentRegion') || 'us-east-1';

    // Model IDs
    const modelIds: string[] = this.node.tryGetContext('modelIds') || [
      'anthropic.claude-3-sonnet-20240229-v1:0',
    ];
    const imageGenerationModelIds: string[] = this.node.tryGetContext(
      'imageGenerationModelIds'
    ) || ['stability.stable-diffusion-xl-v1'];
    const endpointNames: string[] =
      this.node.tryGetContext('endpointNames') || [];
    const agents: Agent[] = [
      ...(props.agents || []),
      ...(this.node.tryGetContext('agents') || []),
    ];

    // Validate Model Names
    const supportedModelIds = Object.keys(modelFeatureFlags);
    for (const modelId of modelIds) {
      if (!supportedModelIds.includes(modelId)) {
        throw new Error(`Unsupported Model Name: ${modelId}`);
      }
    }
    for (const modelId of imageGenerationModelIds) {
      if (!supportedModelIds.includes(modelId)) {
        throw new Error(`Unsupported Model Name: ${modelId}`);
      }
    }
    const agentMap: AgentMap = {};
    for (const agent of agents) {
      agentMap[agent.displayName] = {
        agentId: agent.agentId,
        aliasId: agent.aliasId,
      };
    }

    // S3 (File Bucket)
    const fileBucket = new Bucket(this, 'FileBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    fileBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // cross account access IAM role
    const crossAccountBedrockRoleArn = this.node.tryGetContext(
      'crossAccountBedrockRoleArn'
    );

    // Lambda
    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn,
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

    const predictStreamFunction = new NodejsFunction(this, 'PredictStream', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predictStream.ts',
      timeout: Duration.minutes(15),
      memorySize: 256,
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        AGENT_REGION: agentRegion,
        AGENT_MAP: JSON.stringify(agentMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn,
        BUCKET_NAME: fileBucket.bucketName,
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),
      },
      bundling: {
        nodeModules: [
          '@aws-sdk/client-bedrock-runtime',
          '@aws-sdk/client-bedrock-agent-runtime',
          // デフォルトの client-sagemaker-runtime のバージョンは StreamingResponse に
          // 対応していないため package.json に記載のバージョンを Bundle する
          '@aws-sdk/client-sagemaker-runtime',
        ],
      },
    });
    fileBucket.grantWrite(predictStreamFunction);
    predictStreamFunction.grantInvoke(idPool.authenticatedRole);

    // Prompt Flow Lambda Function の追加
    const invokePromptFlowFunction = new NodejsFunction(
      this,
      'InvokePromptFlow',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/invokeFlow.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: [
            '@aws-sdk/client-bedrock-runtime',
            '@aws-sdk/client-bedrock-agent-runtime',
          ],
        },
        environment: {
          MODEL_REGION: modelRegion,
        },
      }
    );
    invokePromptFlowFunction.grantInvoke(idPool.authenticatedRole);

    const predictTitleFunction = new NodejsFunction(this, 'PredictTitle', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predictTitle.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
      environment: {
        TABLE_NAME: table.tableName,
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn,
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),
      },
    });
    table.grantWriteData(predictTitleFunction);

    const generateImageFunction = new NodejsFunction(this, 'GenerateImage', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/generateImage.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn,
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

    const optimizePromptFunction = new NodejsFunction(
      this,
      'OptimizePromptFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/optimizePrompt.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: ['@aws-sdk/client-bedrock-agent-runtime'],
        },
        environment: {
          MODEL_REGION: modelRegion,
        },
      }
    );
    optimizePromptFunction.grantInvoke(idPool.authenticatedRole);

    // SageMaker Endpoint がある場合は権限付与
    if (endpointNames.length > 0) {
      // SageMaker Policy
      const sagemakerPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeEndpoint', 'sagemaker:InvokeEndpoint'],
        resources: endpointNames.map(
          (endpointName) =>
            `arn:aws:sagemaker:${modelRegion}:${
              Stack.of(this).account
            }:endpoint/${endpointName}`
        ),
      });
      predictFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      invokePromptFlowFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    }

    // Bedrock は常に権限付与
    // Bedrock Policy
    if (
      typeof crossAccountBedrockRoleArn !== 'string' ||
      crossAccountBedrockRoleArn === ''
    ) {
      const bedrockPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:*', 'logs:*'],
      });
      predictStreamFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      invokePromptFlowFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      optimizePromptFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    } else {
      // crossAccountBedrockRoleArn が指定されている場合のポリシー
      const logsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:*'],
        resources: ['*'],
      });
      const assumeRolePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [crossAccountBedrockRoleArn],
      });
      predictStreamFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(logsPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      generateImageFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantWriteData(createChatFunction);

    const deleteChatFunction = new NodejsFunction(this, 'DeleteChat', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/deleteChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(deleteChatFunction);

    const createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantWriteData(createMessagesFunction);

    const updateChatTitleFunction = new NodejsFunction(
      this,
      'UpdateChatTitle',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/updateTitle.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(updateChatTitleFunction);

    const listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(listChatsFunction);

    const findChatbyIdFunction = new NodejsFunction(this, 'FindChatbyId', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/findChatById.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(findChatbyIdFunction);

    const listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(listMessagesFunction);

    const updateFeedbackFunction = new NodejsFunction(this, 'UpdateFeedback', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/updateFeedback.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantWriteData(updateFeedbackFunction);

    const getWebTextFunction = new NodejsFunction(this, 'GetWebText', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/getWebText.ts',
      timeout: Duration.minutes(15),
    });

    const createShareId = new NodejsFunction(this, 'CreateShareId', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantWriteData(createShareId);

    const getSharedChat = new NodejsFunction(this, 'GetSharedChat', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/getSharedChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(getSharedChat);

    const findShareId = new NodejsFunction(this, 'FindShareId', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/findShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(findShareId);

    const deleteShareId = new NodejsFunction(this, 'DeleteShareId', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/deleteShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(deleteShareId);

    const listSystemContextsFunction = new NodejsFunction(
      this,
      'ListSystemContexts',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/listSystemContexts.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadData(listSystemContextsFunction);

    const createSystemContextFunction = new NodejsFunction(
      this,
      'CreateSystemContexts',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/createSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantWriteData(createSystemContextFunction);

    const updateSystemContextTitleFunction = new NodejsFunction(
      this,
      'UpdateSystemContextTitle',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/updateSystemContextTitle.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(updateSystemContextTitleFunction);

    const deleteSystemContextFunction = new NodejsFunction(
      this,
      'DeleteSystemContexts',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/deleteSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(deleteSystemContextFunction);

    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/getFileUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });
    fileBucket.grantWrite(getSignedUrlFunction);

    const getFileDownloadSignedUrlFunction = new NodejsFunction(
      this,
      'GetFileDownloadSignedUrlFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/getFileDownloadSignedUrl.ts',
        timeout: Duration.minutes(15),
      }
    );
    fileBucket.grantRead(getFileDownloadSignedUrlFunction);

    const deleteFileFunction = new NodejsFunction(this, 'DeleteFileFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/deleteFile.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
      },
    });
    fileBucket.grantDelete(deleteFileFunction);

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const api = new RestApi(this, 'Api', {
      deployOptions: {
        stageName: 'api',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      cloudWatchRole: true,
    });

    api.addGatewayResponse('Api4XX', {
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    api.addGatewayResponse('Api5XX', {
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    const predictResource = api.root.addResource('predict');

    // POST: /predict
    predictResource.addMethod(
      'POST',
      new LambdaIntegration(predictFunction),
      commonAuthorizerProps
    );

    // POST: /predict/title
    const predictTitleResource = predictResource.addResource('title');
    predictTitleResource.addMethod(
      'POST',
      new LambdaIntegration(predictTitleFunction),
      commonAuthorizerProps
    );

    const chatsResource = api.root.addResource('chats');

    // POST: /chats
    chatsResource.addMethod(
      'POST',
      new LambdaIntegration(createChatFunction),
      commonAuthorizerProps
    );

    // GET: /chats
    chatsResource.addMethod(
      'GET',
      new LambdaIntegration(listChatsFunction),
      commonAuthorizerProps
    );

    const chatResource = chatsResource.addResource('{chatId}');

    // GET: /chats/{chatId}
    chatResource.addMethod(
      'GET',
      new LambdaIntegration(findChatbyIdFunction),
      commonAuthorizerProps
    );

    // DELETE: /chats/{chatId}
    chatResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteChatFunction),
      commonAuthorizerProps
    );

    const titleResource = chatResource.addResource('title');

    // PUT: /chats/{chatId}/title
    titleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateChatTitleFunction),
      commonAuthorizerProps
    );

    const messagesResource = chatResource.addResource('messages');

    // GET: /chats/{chatId}/messages
    messagesResource.addMethod(
      'GET',
      new LambdaIntegration(listMessagesFunction),
      commonAuthorizerProps
    );

    // POST: /chats/{chatId}/messages
    messagesResource.addMethod(
      'POST',
      new LambdaIntegration(createMessagesFunction),
      commonAuthorizerProps
    );

    const systemContextsResource = api.root.addResource('systemcontexts');

    // POST: /systemcontexts
    systemContextsResource.addMethod(
      'POST',
      new LambdaIntegration(createSystemContextFunction),
      commonAuthorizerProps
    );

    // GET: /systemcontexts
    systemContextsResource.addMethod(
      'GET',
      new LambdaIntegration(listSystemContextsFunction),
      commonAuthorizerProps
    );

    const systemContextResource =
      systemContextsResource.addResource('{systemContextId}');

    // DELETE: /systemcontexts/{systemContextId}
    systemContextResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteSystemContextFunction),
      commonAuthorizerProps
    );

    const systemContextTitleResource =
      systemContextResource.addResource('title');

    // PUT: /systemcontexts/{systemContextId}/title
    systemContextTitleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateSystemContextTitleFunction),
      commonAuthorizerProps
    );

    const feedbacksResource = chatResource.addResource('feedbacks');

    // POST: /chats/{chatId}/feedbacks
    feedbacksResource.addMethod(
      'POST',
      new LambdaIntegration(updateFeedbackFunction),
      commonAuthorizerProps
    );

    const imageResource = api.root.addResource('image');
    const imageGenerateResource = imageResource.addResource('generate');
    // POST: /image/generate
    imageGenerateResource.addMethod(
      'POST',
      new LambdaIntegration(generateImageFunction),
      commonAuthorizerProps
    );

    // Web コンテンツ抽出のユースケースで利用
    const webTextResource = api.root.addResource('web-text');
    // GET: /web-text
    webTextResource.addMethod(
      'GET',
      new LambdaIntegration(getWebTextFunction),
      commonAuthorizerProps
    );

    const shareResource = api.root.addResource('shares');
    const shareChatIdResource = shareResource
      .addResource('chat')
      .addResource('{chatId}');
    // GET: /shares/chat/{chatId}
    shareChatIdResource.addMethod(
      'GET',
      new LambdaIntegration(findShareId),
      commonAuthorizerProps
    );
    // POST: /shares/chat/{chatId}
    shareChatIdResource.addMethod(
      'POST',
      new LambdaIntegration(createShareId),
      commonAuthorizerProps
    );
    const shareShareIdResource = shareResource
      .addResource('share')
      .addResource('{shareId}');
    // GET: /shares/share/{shareId}
    shareShareIdResource.addMethod(
      'GET',
      new LambdaIntegration(getSharedChat),
      commonAuthorizerProps
    );
    // DELETE: /shares/share/{shareId}
    shareShareIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteShareId),
      commonAuthorizerProps
    );

    const fileResource = api.root.addResource('file');
    const urlResource = fileResource.addResource('url');
    // POST: /file/url
    urlResource.addMethod(
      'POST',
      new LambdaIntegration(getSignedUrlFunction),
      commonAuthorizerProps
    );
    // Get: /file/url
    urlResource.addMethod(
      'GET',
      new LambdaIntegration(getFileDownloadSignedUrlFunction),
      commonAuthorizerProps
    );
    // DELETE: /file/{fileName}
    fileResource
      .addResource('{fileName}')
      .addMethod(
        'DELETE',
        new LambdaIntegration(deleteFileFunction),
        commonAuthorizerProps
      );

    this.api = api;
    this.predictStreamFunction = predictStreamFunction;
    this.invokePromptFlowFunction = invokePromptFlowFunction;
    this.optimizePromptFunction = optimizePromptFunction;
    this.modelRegion = modelRegion;
    this.modelIds = modelIds;
    this.imageGenerationModelIds = imageGenerationModelIds;
    this.endpointNames = endpointNames;
    this.agentNames = Object.keys(agentMap);
    this.fileBucket = fileBucket;
    this.getFileDownloadSignedUrlFunction = getFileDownloadSignedUrlFunction;
  }

  // Bucket 名を指定してダウンロード可能にする
  allowDownloadFile(bucketName: string) {
    this.getFileDownloadSignedUrlFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
        actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
      })
    );
  }
}
