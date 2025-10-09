import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface PptxDbProps {
  /**
   * The tenant identifier
   */
  readonly tenantId: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * Removal policy for tables (true = DESTROY, false = RETAIN)
   */
  readonly removalPolicy: boolean;
}

export class PptxDb extends Construct {
  /**
   * DynamoDB table for PPTX templates
   */
  public readonly templatesTable: dynamodb.Table;

  /**
   * DynamoDB table for PPTX generations
   */
  public readonly generationsTable: dynamodb.Table;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  constructor(scope: Construct, id: string, props: PptxDbProps) {
    super(scope, id);

    this.tenantId = props.tenantId;

    // Validate tenant ID
    if (!this.tenantId || this.tenantId.trim() === '') {
      throw new Error('Tenant ID is required');
    }

    // Get environment
    const environment = props.environment;
    if (!environment || environment.trim() === '') {
      throw new Error('Environment is required');
    }

    // Sanitize tenant ID for use in resource names
    const sanitizedTenantId = this.tenantId
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();

    // Determine removal policy
    const removalPolicy = props.removalPolicy
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;

    // Create PPTX templates table
    this.templatesTable = new dynamodb.Table(this, 'PptxTemplatesTable', {
      tableName: `pptx-templates-${environment}-${sanitizedTenantId}`,
      partitionKey: {
        name: 'templateId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: removalPolicy,
      deletionProtection: !props.removalPolicy,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl', // Optional TTL for automatic cleanup
    });

    // Add GSI for querying templates by user
    this.templatesTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Add GSI for querying public templates
    this.templatesTable.addGlobalSecondaryIndex({
      indexName: 'PublicIndex',
      partitionKey: {
        name: 'isPublic',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Create PPTX generations table
    this.generationsTable = new dynamodb.Table(this, 'PptxGenerationsTable', {
      tableName: `pptx-generations-${environment}-${sanitizedTenantId}`,
      partitionKey: {
        name: 'generationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: removalPolicy,
      deletionProtection: !props.removalPolicy,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl', // Auto-cleanup after 7 days
    });

    // Add GSI for querying generations by user
    this.generationsTable.addGlobalSecondaryIndex({
      indexName: 'UserGenerationsIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Add GSI for querying generations by chat ID
    this.generationsTable.addGlobalSecondaryIndex({
      indexName: 'ChatGenerationsIndex',
      partitionKey: {
        name: 'chatId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Add tags to all tables
    const tags = {
      TenantId: this.tenantId,
      Environment: environment,
      Purpose: 'PptxGeneration',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.templatesTable).add(key, value);
      cdk.Tags.of(this.generationsTable).add(key, value);
    });

    // Output table ARNs and names
    new cdk.CfnOutput(this, 'PptxTemplatesTableArn', {
      value: this.templatesTable.tableArn,
      description: `ARN of the PPTX templates table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxTemplatesTableName', {
      value: this.templatesTable.tableName,
      description: `Name of the PPTX templates table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxGenerationsTableArn', {
      value: this.generationsTable.tableArn,
      description: `ARN of the PPTX generations table for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxGenerationsTableName', {
      value: this.generationsTable.tableName,
      description: `Name of the PPTX generations table for tenant ${this.tenantId}`,
    });
  }
}