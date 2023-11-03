import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Duration, Token } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface RagProps {
  userPool: UserPool;
  api: RestApi;
}

/**
 * RAG を実行するためのリソースを作成する
 */
export class Rag extends Construct {
  constructor(scope: Construct, id: string, props: RagProps) {
    super(scope, id);

    // Kendra のリソースを作成
    // Index 用の IAM Role を作成
    const indexRole = new iam.Role(this, 'KendraIndexRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    indexRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['s3:GetObject'],
      })
    );

    indexRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    const index = new kendra.CfnIndex(this, 'KendraIndex', {
      name: 'generative-ai-use-cases-index',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,

      // トークンベースのアクセス制御を実施
      // 参考: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-index.html#cfn-kendra-index-usercontextpolicy
      userContextPolicy: 'USER_TOKEN',

      // 認可に利用する Cognito の情報を設定
      userTokenConfigurations: [
        {
          jwtTokenTypeConfiguration: {
            keyLocation: 'URL',
            userNameAttributeField: 'cognito:username',
            groupAttributeField: 'cognito:groups',
            url: `${props.userPool.userPoolProviderUrl}/.well-known/jwks.json`,
          },
        },
      ],
    });

    // WebCrawler を作成
    const webCrawlerRole = new iam.Role(this, 'KendraWebCrawlerRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });
    webCrawlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    new kendra.CfnDataSource(this, 'WebCrawler', {
      indexId: index.attrId,
      name: 'WebCrawler',
      type: 'WEBCRAWLER',
      roleArn: webCrawlerRole.roleArn,
      languageCode: 'ko',
      dataSourceConfiguration: {
        webCrawlerConfiguration: {
          urls: {
            seedUrlConfiguration: {
              webCrawlerMode: 'HOST_ONLY',
              // デモ用に AWS の GenAI 関連のページを取り込む
              seedUrls: [
                'https://aws.amazon.com/jp/what-is/generative-ai/',
                'https://aws.amazon.com/jp/generative-ai/',
                'https://aws.amazon.com/jp/generative-ai/use-cases/',
                'https://aws.amazon.com/jp/bedrock/',
                'https://aws.amazon.com/jp/bedrock/features/',
                'https://aws.amazon.com/jp/bedrock/testimonials/',
              ],
            },
          },
          crawlDepth: 1,
          urlInclusionPatterns: ['https://aws.amazon.com/jp/.*'],
        },
      },
    });

    // RAG 関連の API を追加する
    // Lambda
    const queryFunction = new NodejsFunction(this, 'Query', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/queryKendra.ts',
      timeout: Duration.minutes(15),
      bundling: {
        // 新しい Kendra の機能を使うため、AWS SDK を明示的にバンドルする
        externalModules: [],
      },
      environment: {
        INDEX_ID: index.ref,
      },
    });
    queryFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:Query'],
      })
    );

    const retrieveFunction = new NodejsFunction(this, 'Retrieve', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/retrieveKendra.ts',
      timeout: Duration.minutes(15),
      bundling: {
        // 新しい Kendra の機能を使うため、AWS SDK を明示的にバンドルする
        externalModules: [],
      },
      environment: {
        INDEX_ID: index.ref,
      },
    });
    retrieveFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:Retrieve'],
      })
    );

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };
    const ragResource = props.api.root.addResource('rag');

    const queryResource = ragResource.addResource('query');
    // POST: /query
    queryResource.addMethod(
      'POST',
      new LambdaIntegration(queryFunction),
      commonAuthorizerProps
    );

    const retrieveResource = ragResource.addResource('retrieve');
    // POST: /retrieve
    retrieveResource.addMethod(
      'POST',
      new LambdaIntegration(retrieveFunction),
      commonAuthorizerProps
    );
  }
}
