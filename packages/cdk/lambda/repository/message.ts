import {
  RecordedMessage,
  ToBeRecordedMessage,
  UpdateFeedbackRequest,
} from 'generative-ai-use-cases';
import {
  BatchWriteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  getTenantDynamoDBDocument,
  getTableName,
  getStatsTableName,
} from './common';

// Update token usage helper function
async function updateTokenUsage(
  message: RecordedMessage,
  event: APIGatewayProxyEvent,
  dynamoDbDocument: DynamoDBDocumentClient
): Promise<void> {
  if (!message.metadata?.usage) {
    return;
  }

  const timestamp = message.createdDate.split('#')[0];
  const date = new Date(parseInt(timestamp));
  const dateStr = date.toISOString().slice(0, 10);
  const userId = message.userId.replace('user#', '');
  const modelId = message.llmType || 'unknown';
  const usecase = message.usecase || 'unknown';
  const usage = message.metadata?.usage || {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheWriteInputTokens: 0,
  };
  const statsTableName = getStatsTableName(event);

  try {
    await dynamoDbDocument.send(
      new UpdateCommand({
        TableName: statsTableName,
        Key: {
          id: `stats#${dateStr}`,
          userId: userId,
        },
        UpdateExpression: `
          SET
            #date = :date,
            executions.#overall = if_not_exists(executions.#overall, :zero) + :one,
            executions.#modelKey = if_not_exists(executions.#modelKey, :zero) + :one,
            executions.#usecaseKey = if_not_exists(executions.#usecaseKey, :zero) + :one,
            inputTokens.#overall = if_not_exists(inputTokens.#overall, :zero) + :inputTokens,
            inputTokens.#modelKey = if_not_exists(inputTokens.#modelKey, :zero) + :inputTokens,
            inputTokens.#usecaseKey = if_not_exists(inputTokens.#usecaseKey, :zero) + :inputTokens,
            outputTokens.#overall = if_not_exists(outputTokens.#overall, :zero) + :outputTokens,
            outputTokens.#modelKey = if_not_exists(outputTokens.#modelKey, :zero) + :outputTokens,
            outputTokens.#usecaseKey = if_not_exists(outputTokens.#usecaseKey, :zero) + :outputTokens,
            cacheReadInputTokens.#overall = if_not_exists(cacheReadInputTokens.#overall, :zero) + :cacheReadInputTokens,
            cacheReadInputTokens.#modelKey = if_not_exists(cacheReadInputTokens.#modelKey, :zero) + :cacheReadInputTokens,
            cacheReadInputTokens.#usecaseKey = if_not_exists(cacheReadInputTokens.#usecaseKey, :zero) + :cacheReadInputTokens,
            cacheWriteInputTokens.#overall = if_not_exists(cacheWriteInputTokens.#overall, :zero) + :cacheWriteInputTokens,
            cacheWriteInputTokens.#modelKey = if_not_exists(cacheWriteInputTokens.#modelKey, :zero) + :cacheWriteInputTokens,
            cacheWriteInputTokens.#usecaseKey = if_not_exists(cacheWriteInputTokens.#usecaseKey, :zero) + :cacheWriteInputTokens
        `,
        ExpressionAttributeNames: {
          '#date': 'date',
          '#overall': 'overall',
          '#modelKey': `model#${modelId}`,
          '#usecaseKey': `usecase#${usecase}`,
        },
        ExpressionAttributeValues: {
          ':date': dateStr,
          ':zero': 0,
          ':one': 1,
          ':inputTokens': usage.inputTokens || 0,
          ':outputTokens': usage.outputTokens || 0,
          ':cacheReadInputTokens': usage.cacheReadInputTokens || 0,
          ':cacheWriteInputTokens': usage.cacheWriteInputTokens || 0,
        },
      })
    );
  } catch (updateError) {
    console.log(
      'Record does not exist, creating initial structure:',
      updateError
    );
    try {
      await dynamoDbDocument.send(
        new UpdateCommand({
          TableName: statsTableName,
          Key: {
            id: `stats#${dateStr}`,
            userId: userId,
          },
          UpdateExpression: `
            SET
              #date = :date,
              executions = :executionsObj,
              inputTokens = :inputTokensObj,
              outputTokens = :outputTokensObj,
              cacheReadInputTokens = :cacheReadInputTokensObj,
              cacheWriteInputTokens = :cacheWriteInputTokensObj
          `,
          ExpressionAttributeNames: {
            '#date': 'date',
          },
          ExpressionAttributeValues: {
            ':date': dateStr,
            ':executionsObj': {
              overall: 1,
              [`model#${modelId}`]: 1,
              [`usecase#${usecase}`]: 1,
            },
            ':inputTokensObj': {
              overall: usage.inputTokens || 0,
              [`model#${modelId}`]: usage.inputTokens || 0,
              [`usecase#${usecase}`]: usage.inputTokens || 0,
            },
            ':outputTokensObj': {
              overall: usage.outputTokens || 0,
              [`model#${modelId}`]: usage.outputTokens || 0,
              [`usecase#${usecase}`]: usage.outputTokens || 0,
            },
            ':cacheReadInputTokensObj': {
              overall: usage.cacheReadInputTokens || 0,
              [`model#${modelId}`]: usage.cacheReadInputTokens || 0,
              [`usecase#${usecase}`]: usage.cacheReadInputTokens || 0,
            },
            ':cacheWriteInputTokensObj': {
              overall: usage.cacheWriteInputTokens || 0,
              [`model#${modelId}`]: usage.cacheWriteInputTokens || 0,
              [`usecase#${usecase}`]: usage.cacheWriteInputTokens || 0,
            },
          },
        })
      );
    } catch (putError) {
      console.error('Error creating token usage:', putError);
    }
  }
}

export const listMessages = async (
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<RecordedMessage[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const chatId = `chat#${_chatId}`;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': chatId,
      },
    })
  );

  return res.Items as RecordedMessage[];
};

export const batchCreateMessages = async (
  messages: ToBeRecordedMessage[],
  _userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<RecordedMessage[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userId = `user#${_userId}`;
  const chatId = `chat#${_chatId}`;
  const createdDate = Date.now();
  const feedback = 'none';

  const items: RecordedMessage[] = messages.map(
    (m: ToBeRecordedMessage, i: number) => {
      return {
        id: chatId,
        createdDate: m.createdDate ?? `${createdDate + i}#0`,
        messageId: m.messageId,
        role: m.role,
        content: m.content,
        trace: m.trace,
        extraData: m.extraData,
        userId,
        feedback,
        usecase: m.usecase,
        llmType: m.llmType ?? '',
        metadata: m.metadata,
      };
    }
  );

  await dynamoDbDocument.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: items.map((m) => {
          return {
            PutRequest: {
              Item: m,
            },
          };
        }),
      },
    })
  );

  // Update token usage in parallel
  await Promise.all(
    items.map((item) => updateTokenUsage(item, event, dynamoDbDocument))
  );

  return items;
};

export const updateFeedback = async (
  _chatId: string,
  feedbackData: UpdateFeedbackRequest,
  event: APIGatewayProxyEvent
): Promise<RecordedMessage> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const chatId = `chat#${_chatId}`;
  const { createdDate, feedback, reasons, detailedFeedback } = feedbackData;

  let updateExpression = 'set feedback = :feedback';
  const expressionAttributeValues: {
    ':feedback': string;
    ':reasons'?: string[];
    ':detailedFeedback'?: string;
  } = {
    ':feedback': feedback,
  };

  if (reasons && reasons.length > 0) {
    updateExpression += ', reasons = :reasons';
    expressionAttributeValues[':reasons'] = reasons;
  }

  if (detailedFeedback) {
    updateExpression += ', detailedFeedback = :detailedFeedback';
    expressionAttributeValues[':detailedFeedback'] = detailedFeedback;
  }

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: chatId,
        createdDate,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return res.Attributes as RecordedMessage;
};

// Helper function for deleting messages when a chat is deleted
export const deleteMessagesForChat = async (
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const messageItems = await listMessages(_chatId, event);
  if (messageItems.length > 0) {
    await dynamoDbDocument.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: messageItems.map((m) => {
            return {
              DeleteRequest: {
                Key: {
                  id: m.id,
                  createdDate: m.createdDate,
                },
              },
            };
          }),
        },
      })
    );
  }
};

