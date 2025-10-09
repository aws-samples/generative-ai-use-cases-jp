import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PptxDb } from '../../construct/pptx-db';

export interface TenantPptxStackProps extends cdk.StackProps {
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

/**
 * Stack for creating tenant-specific PPTX resources
 * This stack creates DynamoDB tables for PPTX template and generation management
 * per tenant, ensuring complete data isolation between tenants.
 */
export class TenantPptxStack extends cdk.Stack {
  /**
   * The PPTX database construct
   */
  public readonly pptxDb: PptxDb;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  constructor(scope: Construct, id: string, props: TenantPptxStackProps) {
    super(scope, id, props);

    this.tenantId = props.tenantId;

    // Create per-tenant PPTX database
    this.pptxDb = new PptxDb(this, 'PptxDb', {
      tenantId: props.tenantId,
      environment: props.environment,
      removalPolicy: props.removalPolicy,
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'PptxTemplatesTableName', {
      value: this.pptxDb.templatesTable.tableName,
      description: `Name of the PPTX templates table for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-PptxTemplatesTableName`,
    });

    new cdk.CfnOutput(this, 'PptxTemplatesTableArn', {
      value: this.pptxDb.templatesTable.tableArn,
      description: `ARN of the PPTX templates table for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-PptxTemplatesTableArn`,
    });

    new cdk.CfnOutput(this, 'PptxGenerationsTableName', {
      value: this.pptxDb.generationsTable.tableName,
      description: `Name of the PPTX generations table for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-PptxGenerationsTableName`,
    });

    new cdk.CfnOutput(this, 'PptxGenerationsTableArn', {
      value: this.pptxDb.generationsTable.tableArn,
      description: `ARN of the PPTX generations table for tenant ${this.tenantId}`,
      exportName: `${this.stackName}-PptxGenerationsTableArn`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', this.tenantId);
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Purpose', 'TenantPptxDatabase');

    // Set stack description
    this.templateOptions.description = `PPTX database resources for tenant ${this.tenantId}`;
  }
}
