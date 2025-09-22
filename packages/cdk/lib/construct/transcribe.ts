import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { allowS3AccessWithSourceIpCondition } from '../utils/s3-access-policy';
import { LAMBDA_RUNTIME_NODEJS, DEFAULT_TENANT_ID } from '../../consts';
import { TenantManager } from './tenant-manager';

export interface TranscribeProps {
  readonly userPool: UserPool;
  readonly idPool: IdentityPool;
  readonly api: RestApi;
  readonly allowedIpV4AddressRanges?: string[] | null;
  readonly allowedIpV6AddressRanges?: string[] | null;
  readonly tenantManager?: TenantManager;
  readonly environment: string;
}

export class Transcribe extends Construct {
  constructor(scope: Construct, id: string, props: TranscribeProps) {
    super(scope, id);

    // Common environment variables for tenant-aware functions
    const commonEnvVars = {
      DEFAULT_TENANT_ID: DEFAULT_TENANT_ID,
      IDENTITY_POOL_ID: props.idPool.identityPoolId,
      USER_POOL_ID: props.userPool.userPoolId,
      AWS_ACCOUNT_ID:
        this.node.tryGetContext('aws:cdk:lookup:account-id') ||
        process.env.CDK_DEFAULT_ACCOUNT!,
      ENVIRONMENT: props.environment!,
      ...(props.tenantManager
        ? {
            TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
          }
        : {}),
    };

    const audioBucket = new Bucket(this, 'AudioBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    audioBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    const transcriptBucket = new Bucket(this, 'TranscriptBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getFileUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      environment: {
        ...commonEnvVars,
        BUCKET_NAME: audioBucket.bucketName,
      },
    });
    if (getSignedUrlFunction.role) {
      allowS3AccessWithSourceIpCondition(
        audioBucket.bucketName,
        getSignedUrlFunction.role,
        'write',
        {
          ipv4: props.allowedIpV4AddressRanges,
          ipv6: props.allowedIpV6AddressRanges,
        }
      );
    }

    // Grant DynamoDB read permissions if tenant manager is configured
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(getSignedUrlFunction);
    }

    // Common policies for transcription functions
    const commonPolicies = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['transcribe:*'],
        resources: ['*'],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sts:AssumeRoleWithWebIdentity',
          'cognito-identity:GetId',
          'cognito-identity:GetOpenIdToken',
        ],
        resources: ['*'],
      }),
      ...(props.tenantManager
        ? [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['dynamodb:GetItem'],
              resources: [props.tenantManager.tenantsTable.tableArn],
            }),
          ]
        : []),
    ];

    const startTranscriptionFunction = new NodejsFunction(
      this,
      'StartTranscription',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/startTranscription.ts',
        timeout: Duration.minutes(15),
        environment: {
          ...commonEnvVars,
          TRANSCRIPT_BUCKET_NAME: transcriptBucket.bucketName,
        },
        initialPolicy: commonPolicies,
      }
    );
    audioBucket.grantRead(startTranscriptionFunction);
    transcriptBucket.grantWrite(startTranscriptionFunction);
    // Grant DynamoDB read permissions if tenant manager is configured
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(
        startTranscriptionFunction
      );
    }

    const getTranscriptionFunction = new NodejsFunction(
      this,
      'GetTranscription',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/getTranscription.ts',
        timeout: Duration.minutes(15),
        environment: commonEnvVars,
        initialPolicy: commonPolicies,
      }
    );
    transcriptBucket.grantRead(getTranscriptionFunction);
    // Grant DynamoDB read permissions if tenant manager is configured
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(getTranscriptionFunction);
    }

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };
    const transcribeResource = props.api.root.addResource('transcribe');

    // POST: /transcribe/start
    transcribeResource
      .addResource('start')
      .addMethod(
        'POST',
        new LambdaIntegration(startTranscriptionFunction),
        commonAuthorizerProps
      );

    // POST: /transcribe/url
    transcribeResource
      .addResource('url')
      .addMethod(
        'POST',
        new LambdaIntegration(getSignedUrlFunction),
        commonAuthorizerProps
      );

    // GET: /transcribe/result/{jobName}
    transcribeResource
      .addResource('result')
      .addResource('{jobName}')
      .addMethod(
        'GET',
        new LambdaIntegration(getTranscriptionFunction),
        commonAuthorizerProps
      );

    // add Policy for Amplify User
    // grant access policy transcribe stream and translate
    props.idPool.authenticatedRole.attachInlinePolicy(
      new Policy(this, 'GrantAccessTranscribeStream', {
        statements: [
          new PolicyStatement({
            actions: ['transcribe:StartStreamTranscriptionWebSocket'],
            resources: ['*'],
          }),
        ],
      })
    );
  }
}
