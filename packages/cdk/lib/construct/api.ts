import { Stack, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
  ResponseType,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IdentityPool } from '@aws-cdk/aws-cognito-identitypool-alpha';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Agent, AgentMap } from 'generative-ai-use-cases-jp';

export interface BackendApiProps {
  userPool: UserPool;
  idPool: IdentityPool;
  table: Table;
}

export class Api extends Construct {
  readonly api: RestApi;
  readonly predictStreamFunction: NodejsFunction;
  readonly modelRegion: string;
  readonly modelIds: string[];
  readonly multiModalModelIds: string[];
  readonly imageGenerationModelIds: string[];
  readonly endpointNames: string[];
  readonly agentNames: string[];

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const { userPool, table, idPool } = props;

    // region for bedrock / sagemaker
    const modelRegion = this.node.tryGetContext('modelRegion') || 'us-east-1';
    // region for bedrock agent
    const agentRegion = this.node.tryGetContext('agentRegion') || 'us-east-1';

    // Model IDs
    const modelIds: string[] = this.node.tryGetContext('modelIds') || [
      'anthropic.claude-v2',
    ];
    const imageGenerationModelIds: string[] = this.node.tryGetContext(
      'imageGenerationModelIds'
    ) || ['stability.stable-diffusion-xl-v1'];
    const endpointNames: string[] =
      this.node.tryGetContext('endpointNames') || [];
    const agents: Agent[] = this.node.tryGetContext('agents') || [];

    // Validate Model Names
    const supportedModelIds = [
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-v2:1',
      'anthropic.claude-v2',
      'anthropic.claude-instant-v1',
      // Titan は日本語文字化けのため未対応
      // 'amazon.titan-text-express-v1',
      'stability.stable-diffusion-xl-v0',
      'stability.stable-diffusion-xl-v1',
      'amazon.titan-image-generator-v1',
      'meta.llama2-13b-chat-v1',
      'meta.llama2-70b-chat-v1',
      'mistral.mistral-7b-instruct-v0:2',
      'mistral.mixtral-8x7b-instruct-v0:1',
    ];
    const multiModalModelIds = ['anthropic.claude-3-sonnet-20240229-v1:0'];
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

    // Lambda
    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

    const predictStreamFunction = new NodejsFunction(this, 'PredictStream', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predictStream.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        AGENT_REGION: agentRegion,
        AGENT_MAP: JSON.stringify(agentMap),
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

    predictStreamFunction.grantInvoke(idPool.authenticatedRole);

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
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

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
    }

    // Bedrock は常に権限付与
    // Bedrock Policy
    const bedrockPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['bedrock:*', 'logs:*'],
    });
    predictStreamFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    predictFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    predictTitleFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    generateImageFunction.role?.addToPrincipalPolicy(bedrockPolicy);

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

    this.api = api;
    this.predictStreamFunction = predictStreamFunction;
    this.modelRegion = modelRegion;
    this.modelIds = modelIds;
    this.multiModalModelIds = multiModalModelIds;
    this.imageGenerationModelIds = imageGenerationModelIds;
    this.endpointNames = endpointNames;
    this.agentNames = Object.keys(agentMap);
  }
}
