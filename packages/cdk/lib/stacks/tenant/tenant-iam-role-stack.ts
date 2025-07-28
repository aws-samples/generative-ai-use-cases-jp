import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TenantIamRole } from '../../construct/tenant-iam-role';
import { Role } from 'aws-cdk-lib/aws-iam';

export interface TenantIamRoleStackProps extends cdk.StackProps {
  /**
   * The identity provider ARN
   */
  readonly identityProviderArn?: string;

  /**
   * The audience/client ID
   */
  readonly audience?: string;

  /**
   * The tenant ID claim
   */
  readonly tenantIdClaim?: string;

  /**
   * Role name
   */
  readonly roleName?: string;
}

export class TenantIamRoleStack extends cdk.Stack {
  public readonly tenantIamRole: TenantIamRole;

  constructor(scope: Construct, id: string, props?: TenantIamRoleStackProps) {
    super(scope, id, props);

    // Create parameters if values not provided
    const identityProviderArn =
      props?.identityProviderArn ||
      new cdk.CfnParameter(this, 'IdentityProviderArn', {
        description:
          'ARN of the identity provider (e.g., Cognito User Pool ARN or OIDC provider ARN)',
        type: 'String',
      }).valueAsString;

    const audience =
      props?.audience ||
      new cdk.CfnParameter(this, 'Audience', {
        description: 'Audience/Client ID for the identity provider',
        type: 'String',
      }).valueAsString;

    // When using parameters, we need to use CfnJson to handle dynamic keys
    if (!props?.identityProviderArn || !props?.audience) {
      // Using CloudFormation parameters - use CfnJson for dynamic keys
      const conditionKey = cdk.Fn.join(':', [identityProviderArn, 'aud']);

      const trustPolicyDocument = new cdk.CfnJson(this, 'TrustPolicy', {
        value: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Federated: identityProviderArn,
              },
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: {
                StringEquals: {
                  [conditionKey]: audience,
                },
              },
            },
          ],
        },
      });

      const role = new cdk.aws_iam.CfnRole(this, 'TenantRole', {
        assumeRolePolicyDocument: trustPolicyDocument,
        roleName: props?.roleName,
        description:
          'IAM role for multi-tenant access using AssumeRoleWithWebIdentity',
        maxSessionDuration: 3600,
      });

      // Create a wrapper to mimic the TenantIamRole interface
      const roleArn = role.attrArn;
      const importedRole = cdk.aws_iam.Role.fromRoleArn(
        this,
        'ImportedRole',
        roleArn
      );

      this.tenantIamRole = {
        role: importedRole as Role,
        tenantIdClaim: props?.tenantIdClaim || 'custom:tenant_id',
        node: importedRole.node,
        addToPolicy: (statement: cdk.aws_iam.PolicyStatement) => {
          new cdk.aws_iam.Policy(this, `Policy-${Date.now()}`, {
            statements: [statement],
            roles: [importedRole],
          });
        },
        attachManagedPolicy: (managedPolicy: cdk.aws_iam.IManagedPolicy) => {
          (importedRole as cdk.aws_iam.Role).addManagedPolicy(managedPolicy);
        },
        createDynamoDbTenantTablePolicyStatement: (baseTableName: string) => {
          const tenantIdClaim = props?.tenantIdClaim || 'custom:tenant_id';
          return new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            actions: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:DescribeTable',
              'dynamodb:DescribeTimeToLive',
            ],
            resources: [
              cdk.Fn.sub(
                'arn:aws:dynamodb:*:*:table/${TableBase}-${TenantId}',
                {
                  TableBase: baseTableName,
                  TenantId: cdk.Fn.sub('${jwt:' + tenantIdClaim + '}', {}),
                }
              ),
              cdk.Fn.sub(
                'arn:aws:dynamodb:*:*:table/${TableBase}-${TenantId}/index/*',
                {
                  TableBase: baseTableName,
                  TenantId: cdk.Fn.sub('${jwt:' + tenantIdClaim + '}', {}),
                }
              ),
            ],
          });
        },
        identityProviderArn: identityProviderArn,
      };

      // Outputs
      new cdk.CfnOutput(this, 'RoleArn', {
        value: roleArn,
        description: 'ARN of the tenant access role',
      });

      new cdk.CfnOutput(this, 'RoleName', {
        value: role.roleName || role.ref,
        description: 'Name of the tenant access role',
      });
    } else {
      // Using direct values - use the construct
      this.tenantIamRole = new TenantIamRole(this, 'TenantIamRole', {
        identityProviderArn,
        audience,
        tenantIdClaim: props?.tenantIdClaim,
        roleName: props?.roleName,
        description:
          'IAM role for multi-tenant access using AssumeRoleWithWebIdentity',
      });
    }

    // Example: Add policies for tenant-specific resources
    // CloudWatch Logs policy
    this.tenantIamRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/tenant/*`,
        ],
      })
    );

    // DynamoDB policy for per-tenant tables
    // Example: Allow access to tables like 'ChatHistory-<tenantId>', 'UserData-<tenantId>', etc.
    const dynamoDbPolicy =
      this.tenantIamRole.createDynamoDbTenantTablePolicyStatement(
        'ChatHistory'
      );
    this.tenantIamRole.addToPolicy(dynamoDbPolicy);

    // Stack description
    this.templateOptions.description =
      'Creates an IAM role that can be assumed using AssumeRoleWithWebIdentity for multi-tenant access';
  }
}
