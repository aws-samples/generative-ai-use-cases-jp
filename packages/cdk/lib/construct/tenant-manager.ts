import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import {
  Table,
  AttributeType,
  BillingMode,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { LAMBDA_RUNTIME_NODEJS } from '../../consts';

export interface TenantManagerProps {
  readonly environment: string;
  readonly enableAutoDelete?: boolean;
}

export class TenantManager extends Construct {
  public readonly tenantsTable: Table;
  public readonly registrationLambda: NodejsFunction;

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

    // Tenant Registration Lambda Function
    this.registrationLambda = new NodejsFunction(
      this,
      'TenantRegistrationFunction',
      {
        functionName: `TenantRegistration-${props.environment}`,
        entry: path.join(
          __dirname,
          '..',
          '..',
          'lambda',
          'tenantRegistrationHandler.ts'
        ),
        runtime: LAMBDA_RUNTIME_NODEJS,
        timeout: Duration.minutes(5),
        memorySize: 256,
        tracing: Tracing.ACTIVE,
        environment: {
          TENANTS_TABLE_NAME: this.tenantsTable.tableName,
        },
        bundling: {
          minify: true,
          nodeModules: ['@aws-sdk/client-dynamodb', '@aws-sdk/util-dynamodb'],
        },
      }
    );

    // Grant permissions to the Lambda function
    this.tenantsTable.grantReadWriteData(this.registrationLambda);
  }
}
