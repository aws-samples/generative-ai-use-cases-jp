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
    props.table.grantReadWriteData(predictFunction);

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantWriteData(createChatFunction);

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

    const chatResource = api.root.addResource('chat');

    chatResource.addMethod(
      'POST',
      new LambdaIntegration(createChatFunction),
      commonAuthorizerProps
    );

    this.api = api;
  }
}
