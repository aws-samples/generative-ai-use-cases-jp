import { Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

export interface BackendApiProps {
  userPool: UserPool;
  table: Table;
}

export class Api extends Construct {
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const { userPool } = props;

    // OpenAI Secret
    const secret = Secret.fromSecretCompleteArn(
      this,
      'Secret',
      this.node.tryGetContext('openAiApiKeySecretArn')
    );

    // Lambda
    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        SECRET_ARN: secret.secretArn,
        TABLE_NAME: props.table.tableName,
      },
    });
    secret.grantRead(predictFunction);

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantWriteData(createChatFunction);

    const createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantWriteData(createMessagesFunction);

    const listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantReadData(listChatsFunction);

    const listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantReadData(listMessagesFunction);

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

    const predictResource = api.root.addResource('predict');

    // POST: /predict
    predictResource.addMethod(
      'POST',
      new LambdaIntegration(predictFunction),
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

    this.api = api;
  }
}
