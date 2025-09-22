import { TokenUsageStats } from 'generative-ai-use-cases';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantDynamoDBDocument, getStatsTableName } from './common';

export const aggregateTokenUsage = async (
  startDate: string,
  endDate: string,
  event: APIGatewayProxyEvent,
  userIds?: string[]
): Promise<TokenUsageStats[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const statsTableName = getStatsTableName(event);

  const userId = userIds?.[0];
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const statsMap = new Map<string, TokenUsageStats>();

    // Create keys for BatchGetItem
    const keys = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      statsMap.set(dateStr, {
        date: dateStr,
        userId,
        executions: { overall: 0 },
        inputTokens: { overall: 0 },
        outputTokens: { overall: 0 },
        cacheReadInputTokens: { overall: 0 },
        cacheWriteInputTokens: { overall: 0 },
      });

      keys.push({
        id: `stats#${dateStr}`,
        userId: userId,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // BatchGetItem supports up to 100 items per request
    const chunkSize = 100;
    const keyChunks = [];
    for (let i = 0; i < keys.length; i += chunkSize) {
      keyChunks.push(keys.slice(i, i + chunkSize));
    }

    // Execute BatchGetItem for each chunk
    const batchPromises = keyChunks.map((chunk) =>
      dynamoDbDocument.send(
        new BatchGetCommand({
          RequestItems: {
            [statsTableName]: {
              Keys: chunk,
            },
          },
        })
      )
    );

    const batchResults = await Promise.all(batchPromises);

    // Update the map with the retrieved data
    batchResults.forEach((result) => {
      result.Responses?.[statsTableName]?.forEach((item) => {
        const stats = item as TokenUsageStats;
        if (stats.date) {
          statsMap.set(stats.date, stats);
        }
      });
    });

    // Convert to array and sort
    return Array.from(statsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  } catch (error) {
    console.error('Error aggregating token usage:', error);
    throw error;
  }
};
