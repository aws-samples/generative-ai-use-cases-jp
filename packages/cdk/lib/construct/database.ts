import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';

export class Database extends Construct {
  public readonly table: ddb.Table;
  public readonly statsTable: ddb.Table;
  public readonly feedbackIndexName: string;

  constructor(scope: Construct, id: string, dataRetentionDays?: number) {
    super(scope, id);

    const feedbackIndexName = 'FeedbackIndex';
    const tableProps: ddb.TableProps = {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdDate',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      // Add TTL configuration if dataRetentionDays is specified
      // Note: Positive validation is handled by zod schema
      ...(dataRetentionDays !== undefined && { timeToLiveAttribute: 'ttl' }),
    };

    const table = new ddb.Table(this, 'Table', tableProps);

    table.addGlobalSecondaryIndex({
      indexName: feedbackIndexName,
      partitionKey: {
        name: 'feedback',
        type: ddb.AttributeType.STRING,
      },
    });

    // Stats table for token usage statistics
    // Note: Statistics data is preserved for long-term analysis and is not subject to TTL
    const statsTableProps: ddb.TableProps = {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    };

    const statsTable = new ddb.Table(this, 'StatsTable', statsTableProps);

    this.table = table;
    this.statsTable = statsTable;
    this.feedbackIndexName = feedbackIndexName;
  }
}
