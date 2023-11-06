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
import { readFileSync } from 'fs';

export interface BackendApiProps {
  userPool: UserPool;
  idPool: IdentityPool;
  table: Table;
}

export class Api extends Construct {
  readonly api: RestApi;
  readonly predictStreamFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const { userPool, table, idPool } = props;

    // sagemaker | bedrock
    const modelType = this.node.tryGetContext('modelType') || 'bedrock';
    // region for bedrock / sagemaker
    const modelRegion = this.node.tryGetContext('modelRegion') || 'us-east-1';
    // model name for bedrock / sagemaker
    const modelName =
      this.node.tryGetContext('modelName') || 'anthropic.claude-v2';
    // image generate model name for bedrock / sagemaker
    const imageGenerateModelName =
      this.node.tryGetContext('imageGenerateModelName') ||
      'stability.stable-diffusion-xl-v0';

    // prompt template
    const promptTemplateFile =
      this.node.tryGetContext('promptTemplate') || 'claude.json';
    const promptTemplate = readFileSync(
      '../../prompt-templates/' + promptTemplateFile,
      'utf-8'
    );

    // Lambda
    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_TYPE: modelType,
        MODEL_REGION: modelRegion,
        MODEL_NAME: modelName,
        PROMPT_TEMPLATE: promptTemplate,
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
        MODEL_TYPE: modelType,
        MODEL_REGION: modelRegion,
        MODEL_NAME: modelName,
        PROMPT_TEMPLATE: promptTemplate,
      },
      bundling: {
        nodeModules: [
          '@aws-sdk/client-bedrock-runtime',
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
        MODEL_TYPE: modelType,
        MODEL_REGION: modelRegion,
        MODEL_NAME: modelName,
        PROMPT_TEMPLATE: promptTemplate,
      },
    });
    table.grantWriteData(predictTitleFunction);

    const generateImageFunction = new NodejsFunction(this, 'GenerateImage', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/generateImage.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_TYPE: modelType,
        MODEL_REGION: modelRegion,
        MODEL_NAME: modelName,
        PROMPT_TEMPLATE: promptTemplate,
        IMAGE_GEN_MODEL_NAME: imageGenerateModelName,
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

    if (modelType == 'sagemaker') {
      // SageMaker Policy
      const sagemakerPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeEndpoint', 'sagemaker:InvokeEndpoint'],
        resources: [
          `arn:aws:sagemaker:${modelRegion}:${
            Stack.of(this).account
          }:endpoint/${modelName}`,
        ],
      });
      predictFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    } else {
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

    const settingFunction = new NodejsFunction(this, 'Setting', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/setting.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_TYPE: modelType,
        MODEL_REGION: modelRegion,
        MODEL_NAME: modelName,
        PROMPT_TEMPLATE_FILE: promptTemplateFile,
        IMAGE_GEN_MODEL_NAME: imageGenerateModelName,
      },
    });

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

    const settingResource = api.root.addResource('setting');
    settingResource.addMethod(
      'GET',
      new LambdaIntegration(settingFunction),
      commonAuthorizerProps
    );

    this.api = api;
    this.predictStreamFunction = predictStreamFunction;
  }
}
