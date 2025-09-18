import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { GenericApiProps } from './props';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export type AdminApiProps = GenericApiProps;

class AdminApi extends Construct {
  constructor(scope: Construct, id: string, props: AdminApiProps) {
    super(scope, id);

    const {
      api,
      userPool,
      commonAuthorizerProps,
      userPoolClient,
      selfSignUpTenantMap,
    } = props;

    // Lambda functions for admin operations
    const listTenantUsersFunction = new NodejsFunction(
      this,
      'ListTenantUsers',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/listTenantUsers.ts',
        timeout: Duration.minutes(5),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        }),
      }
    );

    const inviteTenantUsersFunction = new NodejsFunction(
      this,
      'InviteTenantUsers',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/inviteTenantUsers.ts',
        timeout: Duration.minutes(5),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        }),
      }
    );

    const updateUserRoleFunction = new NodejsFunction(this, 'UpdateUserRole', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/updateUserRole.ts',
      timeout: Duration.minutes(5),
      bundling: {
        nodeModules: ['aws-jwt-verify'],
      },
      environment: getBaseEnvironment(this, props, {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      }),
    });

    const removeTenantUserFunction = new NodejsFunction(
      this,
      'RemoveTenantUser',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/removeTenantUser.ts',
        timeout: Duration.minutes(5),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        }),
      }
    );

    const checkAdminStatusFunction = new NodejsFunction(
      this,
      'CheckAdminStatus',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/checkAdminStatus.ts',
        timeout: Duration.minutes(2),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        }),
      }
    );

    const validateInvitationDomainsFunction = new NodejsFunction(
      this,
      'ValidateInvitationDomains',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/validateInvitationDomains.ts',
        timeout: Duration.minutes(2),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, props, {
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
          SELF_SIGNUP_TENANT_MAP: JSON.stringify(selfSignUpTenantMap || []),
        }),
      }
    );

    // Grant Cognito permissions to admin functions
    const adminFunctions = [
      listTenantUsersFunction,
      inviteTenantUsersFunction,
      updateUserRoleFunction,
      removeTenantUserFunction,
      checkAdminStatusFunction,
      validateInvitationDomainsFunction,
    ];

    adminFunctions.forEach((func) => {
      func.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cognito-idp:ListUsers',
            'cognito-idp:AdminGetUser',
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminUpdateUserAttributes',
            'cognito-idp:AdminDeleteUser',
            'cognito-idp:AdminDisableUser',
            'cognito-idp:AdminEnableUser',
          ],
          resources: [userPool.userPoolArn],
        })
      );
    });

    const adminResource = api.root.addResource('admin');

    // Admin API routes
    const usersResource = adminResource.addResource('users');
    const statusResource = adminResource.addResource('status');

    // GET /admin/users - List tenant users
    usersResource.addMethod(
      'GET',
      new LambdaIntegration(listTenantUsersFunction),
      commonAuthorizerProps
    );

    // POST /admin/users/invite - Invite users
    const inviteResource = usersResource.addResource('invite');
    inviteResource.addMethod(
      'POST',
      new LambdaIntegration(inviteTenantUsersFunction),
      commonAuthorizerProps
    );

    // POST /admin/users/invite/validate-domains - Validate domains before invitation
    const validateDomainsResource =
      inviteResource.addResource('validate-domains');
    validateDomainsResource.addMethod(
      'POST',
      new LambdaIntegration(validateInvitationDomainsFunction),
      commonAuthorizerProps
    );

    // PUT /admin/users/{userId}/role - Update user role
    const userIdResource = usersResource.addResource('{userId}');
    const roleResource = userIdResource.addResource('role');
    roleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateUserRoleFunction),
      commonAuthorizerProps
    );

    // DELETE /admin/users/{userId} - Remove user
    userIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(removeTenantUserFunction),
      commonAuthorizerProps
    );

    // GET /admin/status - Check admin status
    statusResource.addMethod(
      'GET',
      new LambdaIntegration(checkAdminStatusFunction),
      commonAuthorizerProps
    );
  }
}

export default AdminApi;
