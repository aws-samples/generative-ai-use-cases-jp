import { Construct } from 'constructs';
import {
  Role,
  WebIdentityPrincipal,
  PolicyStatement,
  Effect,
  FederatedPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Stack, CfnJson } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';

export interface MultiTenantRoleProps {
  readonly userPool: UserPool;
  readonly userPoolClient: UserPoolClient;
  readonly region: string;
  readonly account: string;
}

export class MultiTenantRole extends Construct {
  readonly role: Role;

  constructor(scope: Construct, id: string, props: MultiTenantRoleProps) {
    super(scope, id);

    // Get the OIDC provider ARN from the user pool
    const oidcProviderArn = Stack.of(this).formatArn({
      service: 'iam',
      region: '',
      account: props.account,
      resource: 'oidc-provider',
      resourceName: `cognito-idp.${props.region}.amazonaws.com/${props.userPool.userPoolId}`,
    });

    // Create CfnJson to handle dynamic condition keys
    const trustConditions = new CfnJson(this, 'TrustConditions', {
      value: {
        [`cognito-idp.${props.region}.amazonaws.com/${props.userPool.userPoolId}:aud`]:
          props.userPoolClient.userPoolClientId,
        [`cognito-idp.${props.region}.amazonaws.com/${props.userPool.userPoolId}:amr`]:
          'authenticated',
      },
    });

    // Create the single role for multi-tenant access
    this.role = new Role(this, 'MultiTenantAccessRole', {
      roleName: `${Stack.of(this).stackName}-MultiTenantAccessRole`,
      assumedBy: new FederatedPrincipal(
        oidcProviderArn,
        {
          StringEquals: trustConditions,
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description:
        'Single role for multi-tenant resource access with dynamic tenant ID',
    });

    // Grant the ability to tag sessions
    this.role.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new WebIdentityPrincipal(oidcProviderArn)],
        actions: ['sts:TagSession'],
      })
    );

    // Add S3 access policy for tenant-specific buckets
    // Assumes bucket naming pattern: <prefix>-tenant-<tenant-id>
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          // Bucket-level permissions
          `arn:aws:s3:::*-tenant-$\{aws:PrincipalTag/TenantID}`,
          // Object-level permissions
          `arn:aws:s3:::*-tenant-$\{aws:PrincipalTag/TenantID}/*`,
        ],
      })
    );

    // Add DynamoDB access policy for tenant-specific tables
    // Assumes table naming pattern: <prefix>-tenant-<tenant-id>
    this.role.addToPolicy(
      new PolicyStatement({
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
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-$\{aws:PrincipalTag/TenantID}`,
          `arn:aws:dynamodb:${props.region}:${props.account}:table/*-tenant-$\{aws:PrincipalTag/TenantID}/*`,
        ],
      })
    );
  }
}
