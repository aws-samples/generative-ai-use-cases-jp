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
  }
}
