import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPool, IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IdentityPool, IIdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { TenantRole } from '../../construct/tenant-role';

export interface TenantIAMStackProps extends cdk.StackProps {
  /**
   * The tenant identifier
   */
  readonly tenantId?: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * Description for the stack
   * @default 'IAM role for tenant {tenantId}'
   */
  readonly description?: string;
}

/**
 * Stack for creating tenant-specific IAM roles
 * This stack creates the IAM role needed for Phase 1 AssumeRoleWithWebIdentity authentication
 */
export class TenantIAMStack extends cdk.Stack {
  /**
   * The tenant role construct
   */
  private readonly tenantRole: TenantRole;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  constructor(scope: Construct, id: string, props?: TenantIAMStackProps) {
    super(scope, id, props);

    // Get tenant ID from props (required)
    this.tenantId = props?.tenantId || (() => {
      throw new Error('tenantId must be provided in stack props');
    })();

    // Get environment (required parameter)
    const environment = props?.environment!;


    // For tenant stacks, use CDK context variables to import from main stack
    // Since main stack and tenant stacks are separate deployments
    const userPoolId = this.node.tryGetContext('userPoolId');
    const identityPoolId = this.node.tryGetContext('identityPoolId');
    const userPoolClientId = this.node.tryGetContext('userPoolClientId');

    if (!userPoolId) {
      throw new Error(
        'userPoolId must be provided via context (--context userPoolId=<value> or in cdk.tenant.json)'
      );
    }

    if (!identityPoolId) {
      throw new Error(
        'identityPoolId must be provided via context (--context identityPoolId=<value> or in cdk.tenant.json)'
      );
    }

    if (!userPoolClientId) {
      throw new Error(
        'userPoolClientId must be provided via context (--context userPoolClientId=<value> or in cdk.tenant.json)'
      );
    }

    // Import existing pools using the context values from main stack
    const userPool = UserPool.fromUserPoolId(this, 'ImportedUserPool', userPoolId);
    const identityPool = IdentityPool.fromIdentityPoolId(this, 'ImportedIdentityPool', identityPoolId);

    // Create the tenant role construct
    this.tenantRole = new TenantRole(this, 'TenantRole', {
      tenantId: this.tenantId,
      userPool: userPool,
      identityPool: identityPool,
      userPoolClientId: userPoolClientId,
      region: this.region,
      account: this.account,
      env: environment,
    });

    // Add stack-level outputs with export names
    new cdk.CfnOutput(this, 'StackTenantRoleArn', {
      value: this.tenantRole.role.roleArn,
      description: `ARN of the IAM role for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-TenantRoleArn`,
    });

    new cdk.CfnOutput(this, 'StackTenantRoleName', {
      value: this.tenantRole.role.roleName,
      description: `Name of the IAM role for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-TenantRoleName`,
    });

    new cdk.CfnOutput(this, 'StackTenantId', {
      value: this.tenantId,
      description: `Tenant ID for this IAM role`,
      exportName: `${this.stackName}-TenantId`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', this.tenantId.toString());
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Purpose', 'TenantIAMRole');

    // Set stack description
    this.templateOptions.description =
      props?.description ||
      `Creates tenant-specific IAM role for multi-tenant application (tenant: ${this.tenantId})`;
  }

  /**
   * Get the tenant role construct
   */
  public getTenantRole(): TenantRole {
    return this.tenantRole;
  }

  /**
   * Get the IAM role
   */
  public getRole() {
    return this.tenantRole.role;
  }

  /**
   * Get the role ARN
   */
  public getRoleArn(): string {
    return this.tenantRole.getRoleArn();
  }

  /**
   * Get the role name
   */
  public getRoleName(): string {
    return this.tenantRole.getRoleName();
  }
}
