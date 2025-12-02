import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { GenericApiProps } from './props';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export type UserApiProps = GenericApiProps;

class UserApi extends Construct {
  constructor(scope: Construct, id: string, props: UserApiProps) {
    super(scope, id);

    const { api, userPool, commonAuthorizerProps, userPoolClient } = props;

    // Lambda function for deleting own account
    const deleteOwnAccountFunction = new NodejsFunction(
      this,
      'DeleteOwnAccount',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/deleteOwnAccount.ts',
        timeout: Duration.minutes(2),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        }),
      }
    );

    // Grant Cognito delete permission
    deleteOwnAccountFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:AdminDeleteUser'],
        resources: [userPool.userPoolArn],
      })
    );

    // API routes
    const userResource = api.root.addResource('user');
    const accountResource = userResource.addResource('account');

    // DELETE /user/account - Delete own account
    accountResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteOwnAccountFunction),
      commonAuthorizerProps
    );
  }
}

export default UserApi;
