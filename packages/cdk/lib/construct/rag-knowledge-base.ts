import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface RagKnowledgeBaseProps {
  knowledgeBaseId: string;
  dataSourceBucketName: string;
  userPool: UserPool;
  api: RestApi;
}

export class RagKnowledgeBase extends Construct {
  public readonly dataSourceBucketName: string;

  constructor(scope: Construct, id: string, props: RagKnowledgeBaseProps) {
    super(scope, id);

    const modelRegion: string = this.node.tryGetContext('modelRegion')!;

    const retrieveFunction = new NodejsFunction(this, 'Retrieve', {
      runtime: Runtime.NODEJS_20_X,
      entry: './lambda/retrieveKnowledgeBase.ts',
      timeout: cdk.Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
        DATA_SOURCE_BUCKET_NAME: props.dataSourceBucketName,
        MODEL_REGION: modelRegion,
      },
    });

    retrieveFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:bedrock:${modelRegion}:${cdk.Stack.of(this).account}:knowledge-base/${props.knowledgeBaseId}`,
        ],
        actions: ['bedrock:Retrieve'],
      })
    );

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };
    const ragResource = props.api.root.addResource('rag-knowledge-base');

    // POST: /rag-knowledge-base/retrieve
    const retrieveResource = ragResource.addResource('retrieve');
    retrieveResource.addMethod(
      'POST',
      new LambdaIntegration(retrieveFunction),
      commonAuthorizerProps
    );

    // 新しいLambda関数の追加 s3の中身で区切ってknowledgebase検索できるようにプレフィックス一覧を取得する関数
    const listPrefixesFunction = new NodejsFunction(this, 'ListPrefixes', {
      runtime: Runtime.NODEJS_20_X,
      entry: './lambda/listKnowledgeBasePrefixes.ts',
      timeout: cdk.Duration.minutes(1),
      environment: {
        DATA_SOURCE_BUCKET_NAME: props.dataSourceBucketName,
        MODEL_REGION: modelRegion,
      },
    });

    // S3アクセス権限の追加
    listPrefixesFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
        ],
        actions: [
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:ListBucketVersions',
          's3:GetObject',
        ],
      })
    );

    // 新しいAPIエンドポイントの追加
    const prefixesResource = ragResource.addResource('prefixes');
    prefixesResource.addMethod(
      'GET',
      new LambdaIntegration(listPrefixesFunction),
      commonAuthorizerProps
    );
  }
}
