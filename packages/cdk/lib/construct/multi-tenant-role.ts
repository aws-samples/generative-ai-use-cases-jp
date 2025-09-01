import { Construct } from 'constructs';
import {
  Role,
  PolicyStatement,
  Effect,
} from 'aws-cdk-lib/aws-iam';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';

export interface MultiTenantRoleProps {
  readonly userPool: UserPool;
  readonly userPoolClient: UserPoolClient;
  readonly identityPool: IdentityPool;
  readonly region: string;
  readonly account: string;
  readonly env?: string;
}

export class MultiTenantRole extends Construct {
  readonly role: Role;

  constructor(scope: Construct, id: string, props: MultiTenantRoleProps) {
    super(scope, id);

    // Use the existing Identity Pool authenticated role instead of creating a new role
    // This ensures that Cognito Identity Pool can properly apply principal tags
    // Cast IRole to Role since we know it's a concrete Role instance
    this.role = props.identityPool.authenticatedRole as Role;

    // Note: Trust relationship is now properly configured in the Auth construct
    // The Identity Pool's authenticated role trusts cognito-identity.amazonaws.com
    // and principal tags are mapped from JWT claims via CfnIdentityPoolPrincipalTag

    // Add S3 access policy for tenant-specific buckets using PrincipalTag
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'S3TenantAccess',
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          // Bucket-level permissions using simplified naming
          `arn:aws:s3:::*-${props.env}-tenant-\${aws:PrincipalTag/TenantID}-*`,
          // Object-level permissions using simplified naming
          `arn:aws:s3:::*-${props.env}-tenant-\${aws:PrincipalTag/TenantID}-*/*`,
        ],
      })
    );

    // Add DynamoDB access policy for tenant-specific tables using PrincipalTag
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'DynamoDBTenantAccess',
        effect: Effect.ALLOW,
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
          // Allow access to tables with tenant-specific naming pattern
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-\${aws:PrincipalTag/TenantID}`,
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-\${aws:PrincipalTag/TenantID}/index/*`,
        ],
      })
    );

    // Add condition to deny access to tenant resources without proper TenantID tag
    // Only applies to tenant-specific resources (not all resources)
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'DenyTenantResourceAccessWithoutTenantTag',
        effect: Effect.DENY,
        actions: ['dynamodb:*', 's3:*'],
        resources: [
          // Only deny access to tenant-specific resources, not all resources
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-*`,
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-*/index/*`,
          `arn:aws:s3:::*-tenant-*`,
          `arn:aws:s3:::*-tenant-*/*`,
        ],
        conditions: {
          Null: {
            'aws:PrincipalTag/TenantID': 'true',
          },
        },
      })
    );

    // Add CloudWatch Logs access for debugging
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'CloudWatchLogsAccess',
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${props.region}:${props.account}:log-group:/aws/lambda/*`,
        ],
      })
    );

    // IMPORTANT: Do not modify the trust policy here - it's configured in the Auth construct
    // The Identity Pool's authenticated role must trust cognito-identity.amazonaws.com
    // Principal tags are automatically applied by the Identity Pool based on CfnIdentityPoolPrincipalTag configuration
  }
}
