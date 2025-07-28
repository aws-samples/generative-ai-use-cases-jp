import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface TenantIamRoleProps {
  /**
   * The identity provider ARN (e.g., OIDC provider ARN)
   */
  readonly identityProviderArn: string;

  /**
   * The audience/client ID for the identity provider
   */
  readonly audience: string;

  /**
   * The tenant identifier claim in the JWT token
   * @default 'custom:tenant_id'
   */
  readonly tenantIdClaim?: string;

  /**
   * Role name
   * @default - AWS CloudFormation generates a unique name
   */
  readonly roleName?: string;

  /**
   * Description for the role
   * @default 'Role for multi-tenant access with tenant isolation'
   */
  readonly description?: string;

  /**
   * Maximum session duration
   * @default Duration.hours(1)
   */
  readonly maxSessionDuration?: cdk.Duration;
}

export class TenantIamRole extends Construct {
  /**
   * The IAM role that can be assumed by authenticated users
   */
  public readonly role: iam.Role;

  /**
   * The tenant ID claim used in policies
   */
  public readonly tenantIdClaim: string;

  /**
   * The identity provider ARN
   */
  public readonly identityProviderArn: string;

  constructor(scope: Construct, id: string, props: TenantIamRoleProps) {
    super(scope, id);

    this.tenantIdClaim = props.tenantIdClaim || 'custom:tenant_id';
    this.identityProviderArn = props.identityProviderArn;

    // Extract the domain from the identity provider ARN
    let identityProviderDomain: string;
    let federatedPrincipal: string;

    // Check if this is a Cognito Identity Pool ARN
    if (props.identityProviderArn.includes(':identitypool/')) {
      // For Cognito Identity Pool, use cognito-identity.amazonaws.com as both principal and domain
      federatedPrincipal = 'cognito-identity.amazonaws.com';
      identityProviderDomain = 'cognito-identity.amazonaws.com';
    } else if (props.identityProviderArn.includes(':userpool/')) {
      // For Cognito User Pool (shouldn't be used directly, but handle it)
      federatedPrincipal = 'cognito-identity.amazonaws.com';
      identityProviderDomain = 'cognito-identity.amazonaws.com';
    } else if (props.identityProviderArn.includes('oidc-provider/')) {
      // For OIDC providers, use the ARN as principal and extract domain
      federatedPrincipal = props.identityProviderArn;
      const arnParts = props.identityProviderArn.split('/');
      identityProviderDomain = arnParts[arnParts.length - 1];
    } else {
      // Default to using the ARN
      federatedPrincipal = props.identityProviderArn;
      identityProviderDomain = props.identityProviderArn;
    }

    // Create the IAM role with AssumeRoleWithWebIdentity trust policy
    this.role = new iam.Role(this, 'Role', {
      roleName: props.roleName,
      assumedBy: new iam.WebIdentityPrincipal(federatedPrincipal, {
        StringEquals: {
          [`${identityProviderDomain}:aud`]: props.audience,
        },
      }),
      description:
        props.description ||
        'Role for multi-tenant access with tenant isolation',
      maxSessionDuration: props.maxSessionDuration || cdk.Duration.hours(1),
    });

    // Output the role ARN
    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'ARN of the tenant access role',
    });

    new cdk.CfnOutput(this, 'RoleName', {
      value: this.role.roleName,
      description: 'Name of the tenant access role',
    });
  }

  /**
   * Add a policy statement to the role
   */
  public addToPolicy(statement: iam.PolicyStatement): void {
    this.role.addToPolicy(statement);
  }

  /**
   * Attach a managed policy to the role
   */
  public attachManagedPolicy(managedPolicy: iam.IManagedPolicy): void {
    this.role.addManagedPolicy(managedPolicy);
  }

  /**
   * Create a policy statement for DynamoDB per-tenant table access
   * This allows access to tables with naming pattern: <baseTableName>-<tenantId>
   */
  public createDynamoDbTenantTablePolicyStatement(
    baseTableName: string,
    actions?: string[]
  ): iam.PolicyStatement {
    const defaultActions = [
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
    ];

    // Allow access to table named: baseTableName-<tenantId>
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: actions || defaultActions,
      resources: [
        `arn:aws:dynamodb:*:*:table/${baseTableName}-$\{${this.identityProviderArn}:${this.tenantIdClaim}}`,
        `arn:aws:dynamodb:*:*:table/${baseTableName}-$\{${this.identityProviderArn}:${this.tenantIdClaim}}/index/*`,
      ],
    });
  }
}
