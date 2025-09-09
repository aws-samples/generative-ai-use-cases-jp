import { Construct } from 'constructs';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  PolicyStatement,
  Effect,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

export interface TenantManagerProps {
  readonly environment: string;
  readonly enableAutoDelete?: boolean;
}

export class TenantManager extends Construct {
  public readonly tenantsTable: Table;
  public readonly kmsKey: Key;

  constructor(scope: Construct, id: string, props: TenantManagerProps) {
    super(scope, id);

    // DynamoDB Tenants table
    this.tenantsTable = new Table(this, 'TenantsTable', {
      tableName: `Tenants-${props.environment}`,
      partitionKey: {
        name: 'tenantId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      // Removal policy based on enableAutoDelete context parameter
      removalPolicy: props.enableAutoDelete
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
    });

    // KMS Key for tenant data encryption (Phase 2)
    this.kmsKey = new Key(this, 'TenantsKmsKey', {
      alias: `TenantsKey-${props.environment}`,
      description: 'KMS key for tenant cross-account role ARN encryption',
      enableKeyRotation: true,
      // Removal policy based on enableAutoDelete context parameter
      removalPolicy: props.enableAutoDelete
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
    });

    // Grant permissions to Lambda service
    this.kmsKey.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('lambda.amazonaws.com')],
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:DescribeKey',
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `dynamodb.${Stack.of(this).region}.amazonaws.com`,
          },
        },
      })
    );

  }
}
