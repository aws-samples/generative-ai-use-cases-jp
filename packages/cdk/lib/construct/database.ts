import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';

export class Database extends Construct {
  public readonly table: ddb.Table;
  public readonly statsTable: ddb.Table;
  public readonly feedbackIndexName: string;
  public readonly assistantTable: ddb.Table;
  public readonly assistantMessagesTable: ddb.Table;
  public readonly assistantIdIndexName: string;

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
      encryption: ddb.TableEncryption.AWS_MANAGED,
    });

    table.addGlobalSecondaryIndex({
      indexName: feedbackIndexName,
      partitionKey: {
        name: 'feedback',
        type: ddb.AttributeType.STRING,
      },
    });

    // Stats table for token usage statistics
    const statsTable = new ddb.Table(this, 'StatsTable', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      encryption: ddb.TableEncryption.AWS_MANAGED,
    });

    // Assistant table for storing assistant configurations
    const assistantIdIndexName = 'AssistantIdIndex';
    const assistantTable = new ddb.Table(this, 'AssistantTable', {
      partitionKey: {
        name: 'userId',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdDate',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      encryption: ddb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });

    assistantTable.addGlobalSecondaryIndex({
      indexName: assistantIdIndexName,
      partitionKey: {
        name: 'assistantId',
        type: ddb.AttributeType.STRING,
      },
      projectionType: ddb.ProjectionType.ALL,
    });

    // Assistant messages table for storing conversation history
    const assistantMessagesTable = new ddb.Table(this, 'AssistantMessagesTable', {
      partitionKey: {
        name: 'assistantId',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'messageId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      encryption: ddb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });

    this.table = table;
    this.statsTable = statsTable;
    this.feedbackIndexName = feedbackIndexName;
    this.assistantTable = assistantTable;
    this.assistantMessagesTable = assistantMessagesTable;
    this.assistantIdIndexName = assistantIdIndexName;
  }
}
