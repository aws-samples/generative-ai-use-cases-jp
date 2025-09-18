import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration, Stack } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { STATS_TABLE_PREFIX } from './const';
import { GenericApiProps } from './props';

export type ChatsApiProps = GenericApiProps;

class ChatApi extends Construct {
  constructor(scope: Construct, id: string, props: ChatsApiProps) {
    super(scope, id);

    const {
      api,
      commonAuthorizerProps,
      table,
      fileBucket,
      statsTable,
      tenantManager,
    } = props;

    const chatsResource = api.root.addResource('chats');

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantWriteData(createChatFunction);

    const deleteChatFunction = new NodejsFunction(this, 'DeleteChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadWriteData(deleteChatFunction);

    const createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: statsTable.tableName,
        BUCKET_NAME: fileBucket.bucketName,
        CHAT_BUCKET_BASE: 'chat',
        DOCS_BUCKET_BASE: 'docs',
        CDK_ACCOUNT_ID: Stack.of(this).account!,
      }),
    });
    table.grantReadWriteData(createMessagesFunction);
    statsTable.grantReadWriteData(createMessagesFunction);

    const updateChatTitleFunction = new NodejsFunction(
      this,
      'UpdateChatTitle',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateTitle.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(this, props),
      }
    );
    table.grantReadWriteData(updateChatTitleFunction);

    const listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: statsTable.tableName,
      }),
    });
    table.grantReadData(listChatsFunction);

    const findChatbyIdFunction = new NodejsFunction(this, 'FindChatbyId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findChatById.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadData(findChatbyIdFunction);

    const listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadData(listMessagesFunction);

    const updateFeedbackFunction = new NodejsFunction(this, 'UpdateFeedback', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/updateFeedback.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props),
    });
    table.grantReadWriteData(updateFeedbackFunction);

    // POST: /chats
    chatsResource.addMethod(
      'POST',
      new LambdaIntegration(createChatFunction),
      commonAuthorizerProps
    );

    // GET: /chats
    chatsResource.addMethod(
      'GET',
      new LambdaIntegration(listChatsFunction),
      commonAuthorizerProps
    );

    const chatResource = chatsResource.addResource('{chatId}');

    // GET: /chats/{chatId}
    chatResource.addMethod(
      'GET',
      new LambdaIntegration(findChatbyIdFunction),
      commonAuthorizerProps
    );

    // DELETE: /chats/{chatId}
    chatResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteChatFunction),
      commonAuthorizerProps
    );

    const titleResource = chatResource.addResource('title');

    // PUT: /chats/{chatId}/title
    titleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateChatTitleFunction),
      commonAuthorizerProps
    );

    const messagesResource = chatResource.addResource('messages');

    // GET: /chats/{chatId}/messages
    messagesResource.addMethod(
      'GET',
      new LambdaIntegration(listMessagesFunction),
      commonAuthorizerProps
    );

    // POST: /chats/{chatId}/messages
    messagesResource.addMethod(
      'POST',
      new LambdaIntegration(createMessagesFunction),
      commonAuthorizerProps
    );

    const feedbacksResource = chatResource.addResource('feedbacks');

    // POST: /chats/{chatId}/feedbacks
    feedbacksResource.addMethod(
      'POST',
      new LambdaIntegration(updateFeedbackFunction),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(createChatFunction);
      tenantManager.tenantsTable.grantReadData(deleteChatFunction);
      tenantManager.tenantsTable.grantReadData(createMessagesFunction);
      tenantManager.tenantsTable.grantReadData(updateChatTitleFunction);
      tenantManager.tenantsTable.grantReadData(listChatsFunction);
      tenantManager.tenantsTable.grantReadData(findChatbyIdFunction);
      tenantManager.tenantsTable.grantReadData(listMessagesFunction);
      tenantManager.tenantsTable.grantReadData(updateFeedbackFunction);
    }
  }
}

export default ChatApi;
