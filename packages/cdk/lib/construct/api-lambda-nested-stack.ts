import { Duration, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../consts';

export interface ApiLambdaNestedStackProps extends NestedStackProps {
  readonly table: Table;
  readonly statsTable: Table;
  readonly fileBucket: Bucket;
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];
}

export class ApiLambdaNestedStack extends NestedStack {
  readonly createChatFunction: NodejsFunction;
  readonly deleteChatFunction: NodejsFunction;
  readonly listChatsFunction: NodejsFunction;
  readonly findChatbyIdFunction: NodejsFunction;
  readonly listMessagesFunction: NodejsFunction;
  readonly createMessagesFunction: NodejsFunction;
  readonly updateChatTitleFunction: NodejsFunction;
  readonly updateFeedbackFunction: NodejsFunction;

  readonly createShareIdFunction: NodejsFunction;
  readonly getSharedChatFunction: NodejsFunction;
  readonly findShareIdFunction: NodejsFunction;
  readonly deleteShareIdFunction: NodejsFunction;

  readonly listSystemContextsFunction: NodejsFunction;
  readonly createSystemContextFunction: NodejsFunction;
  readonly updateSystemContextTitleFunction: NodejsFunction;
  readonly deleteSystemContextFunction: NodejsFunction;

  readonly listMinutesCustomPromptsFunction: NodejsFunction;
  readonly createMinutesCustomPromptFunction: NodejsFunction;
  readonly updateMinutesCustomPromptFunction: NodejsFunction;
  readonly deleteMinutesCustomPromptFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiLambdaNestedStackProps) {
    super(scope, id, props);

    const { table, statsTable, fileBucket, vpc, securityGroups } = props;

    // Chat/Message functions
    this.createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantWriteData(this.createChatFunction);

    this.deleteChatFunction = new NodejsFunction(this, 'DeleteChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.deleteChatFunction);

    this.createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
        STATS_TABLE_NAME: statsTable.tableName,
        BUCKET_NAME: fileBucket.bucketName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.createMessagesFunction);
    statsTable.grantReadWriteData(this.createMessagesFunction);

    this.updateChatTitleFunction = new NodejsFunction(this, 'UpdateChatTitle', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/updateTitle.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.updateChatTitleFunction);

    this.listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadData(this.listChatsFunction);

    this.findChatbyIdFunction = new NodejsFunction(this, 'FindChatbyId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findChatById.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadData(this.findChatbyIdFunction);

    this.listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadData(this.listMessagesFunction);

    this.updateFeedbackFunction = new NodejsFunction(this, 'UpdateFeedback', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/updateFeedback.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.updateFeedbackFunction);

    // Share functions
    this.createShareIdFunction = new NodejsFunction(this, 'CreateShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.createShareIdFunction);

    this.getSharedChatFunction = new NodejsFunction(this, 'GetSharedChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getSharedChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadData(this.getSharedChatFunction);

    this.findShareIdFunction = new NodejsFunction(this, 'FindShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadData(this.findShareIdFunction);

    this.deleteShareIdFunction = new NodejsFunction(this, 'DeleteShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteShareId.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc,
      securityGroups,
    });
    table.grantReadWriteData(this.deleteShareIdFunction);

    // SystemContext functions
    this.listSystemContextsFunction = new NodejsFunction(
      this,
      'ListSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/listSystemContexts.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadData(this.listSystemContextsFunction);

    this.createSystemContextFunction = new NodejsFunction(
      this,
      'CreateSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/createSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantWriteData(this.createSystemContextFunction);

    this.updateSystemContextTitleFunction = new NodejsFunction(
      this,
      'UpdateSystemContextTitle',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateSystemContextTitle.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadWriteData(this.updateSystemContextTitleFunction);

    this.deleteSystemContextFunction = new NodejsFunction(
      this,
      'DeleteSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/deleteSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadWriteData(this.deleteSystemContextFunction);

    // MinutesCustomPrompt functions
    this.listMinutesCustomPromptsFunction = new NodejsFunction(
      this,
      'ListMinutesCustomPrompts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/listMinutesCustomPrompts.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadData(this.listMinutesCustomPromptsFunction);

    this.createMinutesCustomPromptFunction = new NodejsFunction(
      this,
      'CreateMinutesCustomPrompt',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/createMinutesCustomPrompt.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantWriteData(this.createMinutesCustomPromptFunction);

    this.updateMinutesCustomPromptFunction = new NodejsFunction(
      this,
      'UpdateMinutesCustomPrompt',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateMinutesCustomPrompt.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadWriteData(this.updateMinutesCustomPromptFunction);

    this.deleteMinutesCustomPromptFunction = new NodejsFunction(
      this,
      'DeleteMinutesCustomPrompt',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/deleteMinutesCustomPrompt.ts',
        timeout: Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
        },
        vpc,
        securityGroups,
      }
    );
    table.grantReadWriteData(this.deleteMinutesCustomPromptFunction);
  }
}
