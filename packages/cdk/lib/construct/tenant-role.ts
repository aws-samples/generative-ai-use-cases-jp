import { Construct } from 'constructs';
import {
  Role,
  PolicyStatement,
  Effect,
  FederatedPrincipal,
  PolicyDocument,
} from 'aws-cdk-lib/aws-iam';
import { Tags } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IIdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';

export interface TenantRoleProps {
  readonly tenantId: string;
  readonly userPool: IUserPool;
  readonly identityPool: IIdentityPool;
  readonly userPoolClientId: string;
  readonly region: string;
  readonly account: string;
  readonly env: string;
}

/**
 * Creates a single tenant-specific IAM role for Phase 1 AssumeRoleWithWebIdentity authentication
 * This construct is designed to be used within tenant-specific stacks
 */
export class TenantRole extends Construct {
  readonly role: Role;
  readonly tenantId: string;

  constructor(scope: Construct, id: string, props: TenantRoleProps) {
    super(scope, id);

    this.tenantId = props.tenantId;

    // Create tenant-specific IAM role
    this.role = new Role(this, `TenantRole`, {
      roleName: `TenantRole-${props.tenantId}`,
      description: `IAM role for tenant ${props.tenantId} - Phase 1 same account access`,
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': props.identityPool.identityPoolId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      inlinePolicies: {
        TenantResourceAccess: new PolicyDocument({
          statements: [
            // S3 access for tenant-specific buckets
            new PolicyStatement({
              sid: 'S3TenantAccess',
              effect: Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
                's3:GetBucketLocation',
                's3:ListBucketMultipartUploads',
                's3:AbortMultipartUpload',
                's3:ListMultipartUploadParts',
              ],
              resources: [
                // Bucket-level permissions for clean tenant naming
                `arn:aws:s3:::*-${props.env}-tenant-${props.tenantId}-*`,
                // Object-level permissions for clean tenant naming
                `arn:aws:s3:::*-${props.env}-tenant-${props.tenantId}-*/*`,
              ],
            }),

            // DynamoDB access for tenant-specific tables
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
                `arn:aws:dynamodb:${props.region}:${props.account}:table/*${props.env}-tenant-${props.tenantId}`,
                `arn:aws:dynamodb:${props.region}:${props.account}:table/*${props.env}-tenant-${props.tenantId}/index/*`,
              ],
            }),

            // CloudWatch Logs access for debugging and monitoring
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
                `arn:aws:logs:${props.region}:${props.account}:log-group:/aws/lambda/*:*`,
              ],
            }),

            // Bedrock access for AI functionality (tenant-agnostic)
            new PolicyStatement({
              sid: 'BedrockAccess',
              effect: Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: ['*'], // Bedrock models don't have tenant-specific ARNs
            }),

            // Polly access for text-to-speech functionality (tenant-agnostic)
            new PolicyStatement({
              sid: 'PollyAccess',
              effect: Effect.ALLOW,
              actions: ['polly:SynthesizeSpeech'],
              resources: ['*'], // Polly doesn't have tenant-specific resources
            }),

          ],
        }),
      },
    });

    // Add tags to the role
    Tags.of(this.role).add('TenantId', props.tenantId);
    Tags.of(this.role).add('Purpose', 'TenantIAMRole');
    if (props.env) {
      Tags.of(this.role).add('Environment', props.env);
    }
  }

  /**
   * Get the role ARN
   */
  public getRoleArn(): string {
    return this.role.roleArn;
  }

  /**
   * Get the role name
   */
  public getRoleName(): string {
    return this.role.roleName;
  }
}
