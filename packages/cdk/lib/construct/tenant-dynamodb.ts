import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface TenantDynamoDBProps {
  /**
   * The tenant identifier
   */
  readonly tenantId: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * Base name for the chat history table
   * @default 'ChatHistory'
   */
  readonly chatHistoryTableBaseName?: string;

  /**
   * Base name for the token usage stats table
   * @default 'TokenUsageStats'
   */
  readonly tokenUsageStatsTableBaseName?: string;

  /**
   * Base name for the use case builder table
   * @default 'UseCaseBuilder'
   */
  readonly useCaseBuilderTableBaseName?: string;

  /**
   * Billing mode for the tables
   * @default BillingMode.PAY_PER_REQUEST
   */
  readonly billingMode?: dynamodb.BillingMode;

  /**
   * Removal policy for tables
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

export class TenantDynamoDB extends Construct {
  /**
   * The chat history table for the tenant
   */
  public readonly chatHistoryTable: dynamodb.Table;

  /**
   * The token usage statistics table for the tenant
   */
  public readonly tokenUsageStatsTable: dynamodb.Table;

  /**
   * The use case builder table for the tenant
   */
  public readonly useCaseBuilderTable: dynamodb.Table;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  /**
   * Chat history table name
   */
  public readonly chatHistoryTableName: string;

  /**
   * Token usage stats table name
   */
  public readonly tokenUsageStatsTableName: string;

  /**
   * Use case builder table name
   */
  public readonly useCaseBuilderTableName: string;

  constructor(scope: Construct, id: string, props: TenantDynamoDBProps) {
    super(scope, id);

    this.tenantId = props.tenantId;

    // Validate tenant ID
    if (!this.tenantId || this.tenantId.trim() === '') {
      throw new Error('Tenant ID is required');
    }

    // Get environment, default to 'dev'
    const environment = props.environment || 'dev';

    // Sanitize tenant ID for use in resource names
    const sanitizedTenantId = this.tenantId.replace(/[^a-zA-Z0-9-]/g, '-');

    // Set table names with environment prefix
    const chatHistoryBaseName = props.chatHistoryTableBaseName || 'ChatHistory';
    const tokenUsageStatsBaseName =
      props.tokenUsageStatsTableBaseName || 'TokenUsageStats';
    const useCaseBuilderBaseName =
      props.useCaseBuilderTableBaseName || 'UseCaseBuilder';

    this.chatHistoryTableName = `${chatHistoryBaseName}-${environment}-tenant-${sanitizedTenantId}`;
    this.tokenUsageStatsTableName = `${tokenUsageStatsBaseName}-${environment}-tenant-${sanitizedTenantId}`;
    this.useCaseBuilderTableName = `${useCaseBuilderBaseName}-${environment}-tenant-${sanitizedTenantId}`;

    // Determine removal policy based on environment
    const removalPolicy =
      props.removalPolicy ||
      (environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN);

    // Chat History Table
    this.chatHistoryTable = new dynamodb.Table(this, 'ChatHistoryTable', {
      tableName: this.chatHistoryTableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdDate',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: props.billingMode || dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: removalPolicy,
    });

    // Add tags to Chat History table
    cdk.Tags.of(this.chatHistoryTable).add('TenantId', this.tenantId);
    cdk.Tags.of(this.chatHistoryTable).add('Environment', environment);

    // Add feedback index
    this.chatHistoryTable.addGlobalSecondaryIndex({
      indexName: 'FeedbackIndex',
      partitionKey: {
        name: 'feedback',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Token Usage Stats Table
    this.tokenUsageStatsTable = new dynamodb.Table(
      this,
      'TokenUsageStatsTable',
      {
        tableName: this.tokenUsageStatsTableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'userId',
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: props.billingMode || dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: removalPolicy,
      }
    );

    // Add tags to Token Usage Stats table
    cdk.Tags.of(this.tokenUsageStatsTable).add('TenantId', this.tenantId);
    cdk.Tags.of(this.tokenUsageStatsTable).add('Environment', environment);

    // Add month index for usage stats
    this.tokenUsageStatsTable.addGlobalSecondaryIndex({
      indexName: 'MonthIndex',
      partitionKey: {
        name: 'month',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Use Case Builder Table
    this.useCaseBuilderTable = new dynamodb.Table(this, 'UseCaseBuilderTable', {
      tableName: this.useCaseBuilderTableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: props.billingMode || dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: removalPolicy,
    });

    // Add tags to Use Case Builder table
    cdk.Tags.of(this.useCaseBuilderTable).add('TenantId', this.tenantId);
    cdk.Tags.of(this.useCaseBuilderTable).add('Environment', environment);

    // Add use case ID index for use case builder
    this.useCaseBuilderTable.addGlobalSecondaryIndex({
      indexName: 'UseCaseIdIndexName',
      partitionKey: {
        name: 'useCaseId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output table ARNs
    new cdk.CfnOutput(this, 'ChatHistoryTableArn', {
      value: this.chatHistoryTable.tableArn,
      description: `ARN of the chat history table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'TokenUsageStatsTableArn', {
      value: this.tokenUsageStatsTable.tableArn,
      description: `ARN of the token usage stats table for tenant ${this.tenantId}`,
    });

    // Output table names
    new cdk.CfnOutput(this, 'ChatHistoryTableName', {
      value: this.chatHistoryTable.tableName,
      description: `Name of the chat history table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'TokenUsageStatsTableName', {
      value: this.tokenUsageStatsTable.tableName,
      description: `Name of the token usage stats table for tenant ${this.tenantId}`,
    });

    // Output use case builder table ARN and name
    new cdk.CfnOutput(this, 'UseCaseBuilderTableArn', {
      value: this.useCaseBuilderTable.tableArn,
      description: `ARN of the use case builder table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'UseCaseBuilderTableName', {
      value: this.useCaseBuilderTable.tableName,
      description: `Name of the use case builder table for tenant ${this.tenantId}`,
    });
  }

  /**
   * Generate tenant-specific table name
   * This helper method can be used to generate table names consistently
   */
  public static generateTableName(
    baseTableName: string,
    tenantId: string,
    environment: string = 'dev'
  ): string {
    const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, '-');
    return `${baseTableName}-${environment}-tenant-${sanitizedTenantId}`;
  }

  /**
   * Create a tenant-specific table with common settings
   * This can be used to create additional tables with the same pattern
   */
  public createTenantTable(
    id: string,
    baseTableName: string,
    partitionKey: dynamodb.Attribute,
    sortKey?: dynamodb.Attribute,
    globalSecondaryIndexes?: dynamodb.GlobalSecondaryIndexProps[],
    environment: string = 'dev'
  ): dynamodb.Table {
    const tableName = TenantDynamoDB.generateTableName(
      baseTableName,
      this.tenantId,
      environment
    );

    // Determine removal policy based on environment
    const removalPolicy =
      environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN;

    const table = new dynamodb.Table(this, id, {
      tableName,
      partitionKey,
      sortKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: removalPolicy,
    });

    // Add tags
    cdk.Tags.of(table).add('TenantId', this.tenantId);
    cdk.Tags.of(table).add('Environment', environment);

    if (globalSecondaryIndexes) {
      globalSecondaryIndexes.forEach((gsi) => {
        table.addGlobalSecondaryIndex(gsi);
      });
    }

    return table;
  }
}
