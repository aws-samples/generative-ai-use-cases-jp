import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';

export class Database extends Construct {
  public readonly table: ddb.Table;
  public readonly feedbackIndexName: string;
  public readonly useCaseBuilderTable: ddb.Table;
  public readonly useCaseIdIndexName: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const feedbackIndexName = 'FeedbackIndex';
    const table = new ddb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdDate',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      indexName: feedbackIndexName,
      partitionKey: {
        name: 'feedback',
        type: ddb.AttributeType.STRING,
      },
    });

    const useCaseIdIndexName = 'UseCaseIdIndexName';
    const useCaseBuilderTable = new ddb.Table(this, 'UseCaseBuilderTable', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'useCaseId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });

    useCaseBuilderTable.addGlobalSecondaryIndex({
      indexName: useCaseIdIndexName,
      partitionKey: {
        name: 'useCaseId',
        type: ddb.AttributeType.STRING,
      },
      projectionType: ddb.ProjectionType.ALL,
    });

    this.table = table;
    this.feedbackIndexName = feedbackIndexName;
    this.useCaseBuilderTable = useCaseBuilderTable;
    this.useCaseIdIndexName = useCaseIdIndexName;
  }
}
