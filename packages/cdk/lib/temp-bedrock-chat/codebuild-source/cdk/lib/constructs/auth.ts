import {
  CfnOutput,
  Duration,
  Stack,
  CustomResource,
  RemovalPolicy,
} from 'aws-cdk-lib';
import {
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolOperation,
  UserPoolIdentityProviderGoogle,
  CfnUserPoolGroup,
  UserPoolIdentityProviderOidc,
} from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Runtime, Code, SingletonFunction } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
import { Idp, TIdentityProvider } from '../utils/identity-provider';

export interface AuthProps {
  readonly origin: string;
  readonly userPoolDomainPrefixKey: string;
  readonly idp: Idp;
  readonly allowedSignUpEmailDomains: string[];
  readonly autoJoinUserGroups: string[];
  readonly selfSignUpEnabled: boolean;
  readonly tokenValidity: Duration;
}

export interface IAuth {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
}

export class Auth extends Construct {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    const userPool = new UserPool(this, 'UserPool', {
      passwordPolicy: {
        requireUppercase: true,
        requireSymbols: true,
        requireDigits: true,
        minLength: 8,
      },
      // Disable id selfSignUpEnabled is given as false or if selfSignUpEnabled is true and idp is provided
      selfSignUpEnabled: props.selfSignUpEnabled && !props.idp.isExist(),
      signInAliases: {
        username: false,
        email: true,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const clientProps = (() => {
      const defaultProps = {
        idTokenValidity: props.tokenValidity,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
      };
      if (!props.idp.isExist()) return defaultProps;
      return {
        ...defaultProps,
        oAuth: {
          callbackUrls: [props.origin],
          logoutUrls: [props.origin],
        },
        supportedIdentityProviders: [
          ...props.idp.getSupportedIndetityProviders(),
        ],
      };
    })();

    const client = userPool.addClient(`Client`, clientProps);

    const configureProvider = (
      provider: TIdentityProvider,
      userPool: UserPool,
      client: UserPoolClient
    ) => {
      const secret = secretsmanager.Secret.fromSecretNameV2(
        this,
        `Secret-${provider.secretName}`,
        provider.secretName
      );

      const clientId = secret
        .secretValueFromJson('clientId')
        .unsafeUnwrap()
        .toString();
      const clientSecret = secret.secretValueFromJson('clientSecret');

      switch (provider.service) {
        // Currently only Google and custom OIDC are supported
        case 'google': {
          const googleProvider = new UserPoolIdentityProviderGoogle(
            this,
            `GoogleProvider-${provider.secretName}`,
            {
              userPool,
              clientId,
              clientSecretValue: clientSecret,
              scopes: ['openid', 'email'],
              attributeMapping: {
                email: ProviderAttribute.GOOGLE_EMAIL,
              },
            }
          );
          client.node.addDependency(googleProvider);
          break;
        }
        case 'oidc': {
          const issuerUrl = secret
            .secretValueFromJson('issuerUrl')
            .unsafeUnwrap()
            .toString();

          const oidcProvider = new UserPoolIdentityProviderOidc(
            this,
            `OidcProvider-${provider.secretName}`,
            {
              name: provider.serviceName,
              userPool,
              clientId,
              clientSecret: clientSecret.unsafeUnwrap().toString(),
              issuerUrl,
              attributeMapping: {
                // This is an example of mapping the email attribute.
                // Replace this with the actual idp attribute key.
                email: ProviderAttribute.other('EMAIL'),
              },
              scopes: ['openid', 'email'],
            }
          );
          client.node.addDependency(oidcProvider);
          break;
        }
      }
    };

    if (props.idp.isExist()) {
      for (const provider of props.idp.getProviders()) {
        configureProvider(provider, userPool, client);
      }

      userPool.addDomain('UserPool', {
        cognitoDomain: {
          domainPrefix: props.userPoolDomainPrefixKey,
        },
      });
    }

    if (props.allowedSignUpEmailDomains.length >= 1) {
      const checkEmailDomainFunction = new PythonFunction(
        this,
        'CheckEmailDomain',
        {
          runtime: Runtime.PYTHON_3_13,
          index: 'check_email_domain.py',
          entry: path.join(__dirname, '../backend/auth/check_email_domain'),
          timeout: Duration.minutes(1),
          environment: {
            ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR: JSON.stringify(
              props.allowedSignUpEmailDomains
            ),
          },
          logRetention: logs.RetentionDays.THREE_MONTHS,
        }
      );

      userPool.addTrigger(
        UserPoolOperation.PRE_SIGN_UP,
        checkEmailDomainFunction
      );
    }

    const adminGroup = new CfnUserPoolGroup(this, 'AdminGroup', {
      groupName: 'Admin',
      userPoolId: userPool.userPoolId,
    });

    const creatingBotAllowedGroup = new CfnUserPoolGroup(
      this,
      'CreatingBotAllowedGroup',
      {
        groupName: 'CreatingBotAllowed',
        userPoolId: userPool.userPoolId,
      }
    );

    const publishAllowedGroup = new CfnUserPoolGroup(
      this,
      'PublishAllowedGroup',
      {
        groupName: 'PublishAllowed',
        userPoolId: userPool.userPoolId,
      }
    );

    if (props.autoJoinUserGroups.length >= 1) {
      /**
       * Create a Cognito trigger to add a new user to the group specified with `autoJoinUserGroups`.
       *
       * Registering a Lambda function that uses a user pool as a trigger of the user pool itself
       * results circular reference, so CloudFormation cannot do this when creating a user pool.
       * Additionally, CloudFormation does not provide the functionality to add triggers to existing user pools.
       * Therefore, use a custom resource implementing that functionality.
       */
      const addUserToGroupsFunction = new PythonFunction(
        this,
        'AddUserToGroups',
        {
          runtime: Runtime.PYTHON_3_13,
          index: 'add_user_to_groups.py',
          entry: path.join(__dirname, '../backend/auth/add_user_to_groups'),
          timeout: Duration.minutes(1),
          environment: {
            USER_POOL_ID: userPool.userPoolId,
            AUTO_JOIN_USER_GROUPS: JSON.stringify(props.autoJoinUserGroups),
          },
          logRetention: logs.RetentionDays.THREE_MONTHS,
        }
      );
      addUserToGroupsFunction.addPermission('CognitoTrigger', {
        principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
        sourceArn: userPool.userPoolArn,
        scope: userPool,
      });
      userPool.grant(
        addUserToGroupsFunction,
        'cognito-idp:AdminAddUserToGroup'
      );

      const cognitoTriggerRegistrationFunction = new SingletonFunction(
        this,
        'CognitoTriggerRegistrationFunction',
        {
          uuid: 'a84c6122-180e-48fc-afaf-f4d65da2b370',
          lambdaPurpose: 'CognitoTriggerRegistrationFunction',
          code: Code.fromInline(
            fs.readFileSync(
              path.join(
                __dirname,
                '../../custom-resources/cognito-trigger/index.py'
              ),
              'utf8'
            )
          ),
          handler: 'index.handler',

          runtime: Runtime.PYTHON_3_13,
          environment: {
            USER_POOL_ID: userPool.userPoolId,
          },

          timeout: Duration.minutes(1),
        }
      );
      userPool.grant(
        cognitoTriggerRegistrationFunction,
        'cognito-idp:UpdateUserPool',
        'cognito-idp:DescribeUserPool'
      );

      const cognitoTrigger = new CustomResource(this, 'CognitoTrigger', {
        serviceToken: cognitoTriggerRegistrationFunction.functionArn,
        resourceType: 'Custom::CognitoTrigger',
        properties: {
          Triggers: {
            PostConfirmation: addUserToGroupsFunction.functionArn,
            PostAuthentication: addUserToGroupsFunction.functionArn,
          },
        },
      });
      cognitoTrigger.node.addDependency(addUserToGroupsFunction);
    }

    this.client = client;
    this.userPool = userPool;

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: client.userPoolClientId });
    if (props.idp.isExist())
      new CfnOutput(this, 'ApprovedRedirectURI', {
        value: `https://${props.userPoolDomainPrefixKey}.auth.${
          Stack.of(userPool).region
        }.amazoncognito.com/oauth2/idpresponse`,
      });
  }
}
