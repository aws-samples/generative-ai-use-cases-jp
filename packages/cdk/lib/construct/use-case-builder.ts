import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';

export interface UseCaseBuilderProps {
  // Props removed - table is always created
}

export class UseCaseBuilder extends Construct {
  public readonly useCaseBuilderTable: ddb.Table;
  public readonly useCaseIdIndexName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Always create table for backward compatibility and AgentBuilder dependency
    this.useCaseIdIndexName = 'UseCaseIdIndexName';
    this.useCaseBuilderTable = new ddb.Table(this, 'UseCaseBuilderTable', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });

    this.useCaseBuilderTable.addGlobalSecondaryIndex({
      indexName: this.useCaseIdIndexName,
      partitionKey: {
        name: 'useCaseId',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dataType',
        type: ddb.AttributeType.STRING,
      },
      projectionType: ddb.ProjectionType.ALL,
    });
  }
}
