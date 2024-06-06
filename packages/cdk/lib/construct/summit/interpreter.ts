import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface InterpreterProps {
  userPool: UserPool;
  api: RestApi;
}

/**
 * AWS Interpreter を実行するためのリソースを作成する
 */
export class Interpreter extends Construct {
  readonly createFunctionRole: iam.Role;
  constructor(scope: Construct, id: string, props: InterpreterProps) {
    super(scope, id);

    // Lambda
    const createFunction = new NodejsFunction(this, 'CreateLambdaFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/summit/createLambdaFunction.ts',
      timeout: Duration.minutes(15),
    });
    createFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['lambda:CreateFunction'],
      })
    );

    const createFunctionRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaExecute'),
      ],
    });

    this.createFunctionRole = createFunctionRole;

    createFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [createFunctionRole.roleArn],
        actions: ['iam:PassRole'],
      })
    );

    const updateFunction = new NodejsFunction(this, 'UpdateLambdaFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/summit/updateLambdaFunction.ts',
      timeout: Duration.minutes(15),
    });
    updateFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['lambda:UpdateFunctionCode'],
      })
    );

    const getArnFunction = new NodejsFunction(this, 'GetFunctionArn', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/summit/getLambdaArn.ts',
      timeout: Duration.minutes(15),
    });
    getArnFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['lambda:GetFunction'],
      })
    );

    const invokeFunction = new NodejsFunction(this, 'InvokeFunctionArn', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/summit/invokeLambdaFunction.ts',
      timeout: Duration.minutes(15),
    });
    invokeFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['lambda:InvokeFunction'],
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
    const ragResource = props.api.root.addResource('interpreter');

    const lambdaResource = ragResource.addResource('lambda');
    // POST: /lambda
    lambdaResource.addMethod(
      'POST',
      new LambdaIntegration(createFunction),
      commonAuthorizerProps
    );
    // PUT: /lambda
    lambdaResource.addMethod(
      'PUT',
      new LambdaIntegration(updateFunction),
      commonAuthorizerProps
    );

    const invokeResource = lambdaResource.addResource('invoke');
    // POST: /lambda/invoke
    invokeResource.addMethod(
      'POST',
      new LambdaIntegration(invokeFunction),
      commonAuthorizerProps
    );

    const arnResource = lambdaResource.addResource('arn');
    const getArnResource = arnResource.addResource('{functionName}');
    // GET: /lambda/arn/{functionName}
    getArnResource.addMethod(
      'GET',
      new LambdaIntegration(getArnFunction),
      commonAuthorizerProps
    );
  }
}
