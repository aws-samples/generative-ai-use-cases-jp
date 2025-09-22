import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { IFunction, Runtime, SnapStartConf } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IAuth } from './auth';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { CfnRouteResponse } from 'aws-cdk-lib/aws-apigatewayv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { excludeDockerImage } from '../constants/docker';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Database } from './database';

export interface WebSocketProps {
  readonly database: Database;
  readonly auth: IAuth;
  readonly bedrockRegion: string;
  readonly documentBucket: s3.IBucket;
  readonly websocketSessionTable: ITable;
  readonly largeMessageBucket: s3.IBucket;
  readonly accessLogBucket?: s3.Bucket;
  readonly enableBedrockCrossRegionInference: boolean;
  readonly enableLambdaSnapStart: boolean;
}

export class WebSocket extends Construct {
  readonly webSocketApi: apigwv2.IWebSocketApi;
  readonly handler: IFunction;
  private readonly defaultStageName = 'dev';

  constructor(scope: Construct, id: string, props: WebSocketProps) {
    super(scope, id);

    const { database } = props;
    const { tableAccessRole } = database;

    // Bucket for SNS large payload support
    // See: https://docs.aws.amazon.com/sns/latest/dg/extended-client-library-python.html
    const largePayloadSupportBucket = new s3.Bucket(
      this,
      'LargePayloadSupportBucket',
      {
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
        autoDeleteObjects: true,
        serverAccessLogsBucket: props.accessLogBucket,
        serverAccessLogsPrefix: 'LargePayloadSupportBucket',
      }
    );

    const handlerRole = new iam.Role(this, 'HandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    handlerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    handlerRole.addToPolicy(
      // Assume the table access role for row-level access control.
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [tableAccessRole.roleArn],
      })
    );
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:*'],
        resources: ['*'],
      })
    );
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:AdminListGroupsForUser'],
        resources: [props.auth.userPool.userPoolArn],
      })
    );

    // get api key from secrets manager
    handlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${Stack.of(this).region}:${
            Stack.of(this).account
          }:secret:firecrawl/*/*`,
          `arn:aws:secretsmanager:${Stack.of(this).region}:${
            Stack.of(this).account
          }:secret:firecrawl/*/*`,
        ],
      })
    );

    largePayloadSupportBucket.grantRead(handlerRole);
    props.websocketSessionTable.grantReadWriteData(handlerRole);
    props.largeMessageBucket.grantReadWrite(handlerRole);
    props.documentBucket.grantRead(handlerRole);

    const handler = new PythonFunction(this, 'HandlerV2', {
      entry: path.join(__dirname, '../backend'),
      index: 'app/websocket.py',
      bundling: {
        assetExcludes: [...excludeDockerImage],
        buildArgs: { POETRY_VERSION: '1.8.3' },
      },
      runtime: Runtime.PYTHON_3_13,
      memorySize: 512,
      timeout: Duration.minutes(15),
      environment: {
        ACCOUNT: Stack.of(this).account,
        REGION: Stack.of(this).region,
        USER_POOL_ID: props.auth.userPool.userPoolId,
        CLIENT_ID: props.auth.client.userPoolClientId,
        BEDROCK_REGION: props.bedrockRegion,
        CONVERSATION_TABLE_NAME: database.conversationTable.tableName,
        BOT_TABLE_NAME: database.botTable.tableName,
        TABLE_ACCESS_ROLE_ARN: tableAccessRole.roleArn,
        LARGE_MESSAGE_BUCKET: props.largeMessageBucket.bucketName,
        LARGE_PAYLOAD_SUPPORT_BUCKET: largePayloadSupportBucket.bucketName,
        WEBSOCKET_SESSION_TABLE_NAME: props.websocketSessionTable.tableName,
        ENABLE_BEDROCK_CROSS_REGION_INFERENCE:
          props.enableBedrockCrossRegionInference.toString(),
      },
      role: handlerRole,
      snapStart: props.enableLambdaSnapStart
        ? SnapStartConf.ON_PUBLISHED_VERSIONS
        : undefined,
      logRetention: logs.RetentionDays.THREE_MONTHS,
    });

    const webSocketApi = new apigwv2.WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'ConnectIntegration',
          handler.currentVersion
        ),
      },
    });
    const route = webSocketApi.addRoute('$default', {
      integration: new WebSocketLambdaIntegration(
        'DefaultIntegration',
        handler.currentVersion
      ),
    });
    new apigwv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: this.defaultStageName,
      autoDeploy: true,
    });
    webSocketApi.grantManageConnections(handler);

    new CfnRouteResponse(this, 'RouteResponse', {
      apiId: webSocketApi.apiId,
      routeId: route.routeId,
      routeResponseKey: '$default',
    });

    this.webSocketApi = webSocketApi;
    this.handler = handler;

    new CfnOutput(this, 'WebSocketEndpoint', {
      value: this.apiEndpoint,
    });
  }

  get apiEndpoint() {
    return `${this.webSocketApi.apiEndpoint}/${this.defaultStageName}`;
  }
}
