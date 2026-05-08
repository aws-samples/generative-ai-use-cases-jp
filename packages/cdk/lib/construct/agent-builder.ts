import {
  RestApi,
  LambdaIntegration,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { LAMBDA_RUNTIME_NODEJS } from '../../consts';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface AgentBuilderProps {
  readonly userPool: UserPool;
  readonly api: RestApi;
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];
  readonly agentBuilderRuntimeArn: string;
  readonly useCaseBuilderTable: ddb.Table;
  readonly useCaseIdIndexName: string;
  readonly cognitoUserPoolProxyEndpoint?: string;
}

export class AgentBuilder extends Construct {
  constructor(scope: Construct, id: string, props: AgentBuilderProps) {
    super(scope, id);

    const { userPool, api, useCaseBuilderTable, useCaseIdIndexName } = props;

    const commonProperty: NodejsFunctionProps = {
      runtime: LAMBDA_RUNTIME_NODEJS,
      timeout: Duration.minutes(15),
      environment: {
        USECASE_TABLE_NAME: useCaseBuilderTable.tableName,
        USECASE_ID_INDEX_NAME: useCaseIdIndexName,
      },
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    };

    // Agent Builder Lambda Function
    const agentBuilderFunction = new NodejsFunction(this, 'AgentBuilder', {
      ...commonProperty,
      memorySize: 1024,
      entry: './lambda/agentBuilder.ts',
      environment: {
        ...commonProperty.environment,
        MODEL_REGION: process.env.MODEL_REGION || 'us-east-1',
        USER_POOL_ID: userPool.userPoolId,
        ...(props.cognitoUserPoolProxyEndpoint && {
          COGNITO_IDP_ENDPOINT: props.cognitoUserPoolProxyEndpoint,
        }),
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    useCaseBuilderTable.grantReadWriteData(agentBuilderFunction);

    // Grant Bedrock permissions for agent testing
    const bedrockPolicyForAgent = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['bedrock:*', 'logs:*'],
    });
    agentBuilderFunction.role?.addToPrincipalPolicy(bedrockPolicyForAgent);

    // Grant Cognito permissions for getting user information
    const cognitoPolicyForAgent = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [userPool.userPoolArn],
      actions: ['cognito-idp:AdminGetUser'],
    });
    agentBuilderFunction.role?.addToPrincipalPolicy(cognitoPolicyForAgent);

    // API Gateway setup
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    // Agent Builder API endpoints - all routes handled by proxy+ integration
    const agentsResource = api.root.addResource('agents');

    // Handle root /agents requests
    agentsResource.addMethod(
      'ANY',
      new LambdaIntegration(agentBuilderFunction),
      commonAuthorizerProps
    );

    // All agent sub-routes handled by proxy+ integration
    agentsResource
      .addResource('{proxy+}')
      .addMethod(
        'ANY',
        new LambdaIntegration(agentBuilderFunction),
        commonAuthorizerProps
      );
  }
}
