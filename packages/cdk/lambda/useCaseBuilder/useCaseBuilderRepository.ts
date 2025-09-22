import {
  IsFavorite,
  IsShared,
  UseCaseCommon,
  UseCaseInTable,
  UseCaseAsOutput,
  UseCaseContent,
  ListUseCasesResponse,
  ListFavoriteUseCasesResponse,
  ListRecentlyUsedUseCasesResponse,
} from 'generative-ai-use-cases';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantId } from '../utils/tenantUtils';
import { createTenantDynamoDBClient } from '../utils/tenantDynamoDBClient';

const USECASE_TABLE_PREFIX: string = process.env.USECASE_TABLE_NAME!;
const ENVIRONMENT: string = process.env.ENVIRONMENT!;
const DEFAULT_USECASE_TABLE_NAME: string =
  process.env.DEFAULT_USECASE_TABLE_NAME!;
const DEFAULT_TENANT_ID: string = process.env.DEFAULT_TENANT_ID!;
const USECASE_ID_INDEX_NAME: string = process.env.USECASE_ID_INDEX_NAME!;

/**
 * Get or create a tenant-specific DynamoDB document client
 * Falls back to default client if tenant-specific access fails
 */
async function getTenantDynamoDBDocument(
  event: APIGatewayProxyEvent
): Promise<DynamoDBDocumentClient> {
  const tenantId = getTenantId(event);

  // For default tenant, use standard DynamoDB client
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    // Create standard DynamoDB client without AssumeRole
    return DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  try {
    // Try to create client with tenant credentials
    // Each request gets fresh credentials to ensure proper user isolation
    const dynamoDb = await createTenantDynamoDBClient(event);
    return DynamoDBDocumentClient.from(dynamoDb);
  } catch (error) {
    console.error(
      'Failed to assume role for tenant access, falling back to default:',
      error
    );
    // Fall back to standard DynamoDB client
    return DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }
}

/**
 * Get tenant-specific table name
 * Note: Tenant ID extraction is only for constructing the correct table name.
 * Security/isolation is enforced by IAM policies using session tags from the JWT.
 */
function getTableName(event: APIGatewayProxyEvent): string {
  const tenantId = getTenantId(event);

  // For default/fallback users, use the actual CDK-generated table name
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    return DEFAULT_USECASE_TABLE_NAME;
  }

  // For tenant users, construct tenant-specific table name directly
  return `${USECASE_TABLE_PREFIX}-${ENVIRONMENT}-tenant-${tenantId}`;
}

// Max number of recently used use cases
// Actually, it becomes RECENTLY_USED_SAVE_LIMIT + 1 in some cases
// See the updateRecentlyUsedUseCase function for details
const RECENTLY_USED_SAVE_LIMIT = 100;

const getUserIdFromKey = (key: string): string => {
  return key.split('#').slice(1).join('#');
};

// Create a query command to get use case by useCaseId
const createFindUseCaseByUseCaseIdCommand = (
  useCaseId: string,
  tableName: string
) =>
  new QueryCommand({
    TableName: tableName,
    IndexName: USECASE_ID_INDEX_NAME,
    KeyConditionExpression:
      '#useCaseId = :useCaseId and begins_with(#dataType, :dataTypePrefix)',
    ExpressionAttributeNames: {
      '#useCaseId': 'useCaseId',
      '#dataType': 'dataType',
    },
    ExpressionAttributeValues: {
      ':useCaseId': useCaseId,
      ':dataTypePrefix': 'useCase',
    },
  });

// Get use case by useCaseId
const innerFindUseCaseByUseCaseId = async (
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<UseCaseInTable | null> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const command = createFindUseCaseByUseCaseIdCommand(useCaseId, tableName);
  const useCaseInTable = await dynamoDbDocument.send(command);
  return (useCaseInTable.Items?.[0] as UseCaseInTable) || null;
};

// Get use case list by userId
const innerFindUseCasesByUserId = async (
  userId: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string
): Promise<{ useCases: UseCaseInTable[]; lastEvaluatedKey?: string }> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;
  const useCasesInTable = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression:
        '#id = :id and begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': `useCase#${userId}`,
        ':dataTypePrefix': 'useCase',
      },
      ScanIndexForward: false,
      Limit: 30, // Number of my use cases per page
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return {
    useCases: (useCasesInTable.Items || []) as UseCaseInTable[],
    lastEvaluatedKey: useCasesInTable.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(useCasesInTable.LastEvaluatedKey)).toString(
          'base64'
        )
      : undefined,
  };
};

// Get use case list from useCaseId array
const innerFindUseCasesByUseCaseIds = async (
  useCaseIds: string[],
  event: APIGatewayProxyEvent
): Promise<UseCaseInTable[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  // Run multiple queries in parallel
  const useCasesInTable: QueryCommandOutput[] = await Promise.all(
    useCaseIds.map((useCaseId) =>
      dynamoDbDocument.send(
        createFindUseCaseByUseCaseIdCommand(useCaseId, tableName)
      )
    )
  );
  return useCasesInTable.flatMap(
    (useCaseInTable) =>
      (useCaseInTable.Items?.slice(0, 1) || []) as UseCaseInTable[]
  );
};

// Get list of specific data type (favorite, recently used) by userId (all)
const innerFindCommonsByUserIdAndDataType = async (
  userId: string,
  dataTypePrefix: string,
  event: APIGatewayProxyEvent
): Promise<UseCaseCommon[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression:
        '#id = :id and begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': `useCase#${userId}`,
        ':dataTypePrefix': dataTypePrefix,
      },
      ScanIndexForward: false,
    })
  );

  return (commons.Items || []) as UseCaseCommon[];
};

// Get list of specific data type (favorite, recently used) by userId (pagination supported)
const innerFindCommonsByUserIdAndDataTypePagniation = async (
  userId: string,
  dataTypePrefix: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string
): Promise<{ commons: UseCaseCommon[]; lastEvaluatedKey?: string }> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression:
        '#id = :id and begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': `useCase#${userId}`,
        ':dataTypePrefix': dataTypePrefix,
      },
      ScanIndexForward: false,
      Limit: 20, // Number of favorites/recently used per page
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return {
    commons: (commons.Items || []) as UseCaseCommon[],
    lastEvaluatedKey: commons.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(commons.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

// Get all data (body, favorite, recently used) related to useCaseId
const innerFindCommonsByUseCaseId = async (
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<UseCaseCommon[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: USECASE_ID_INDEX_NAME,
      KeyConditionExpression: '#useCaseId = :useCaseId',
      ExpressionAttributeNames: {
        '#useCaseId': 'useCaseId',
      },
      ExpressionAttributeValues: {
        ':useCaseId': useCaseId,
      },
    })
  );

  return (commons.Items || []) as UseCaseCommon[];
};

export const createUseCase = async (
  userId: string,
  content: UseCaseContent,
  event: APIGatewayProxyEvent
): Promise<UseCaseAsOutput> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const id = `useCase#${userId}`;
  const useCaseId = crypto.randomUUID();
  const dataType = `useCase#${Date.now()}`;

  const item: UseCaseInTable = {
    id,
    dataType,
    useCaseId,
    title: content.title,
    description: content.description,
    promptTemplate: content.promptTemplate,
    inputExamples: content.inputExamples,
    fixedModelId: content.fixedModelId,
    fileUpload: content.fileUpload,
    isShared: false,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return {
    ...item,
    isFavorite: false,
    isMyUseCase: true,
  };
};

export const getUseCase = async (
  userId: string,
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<UseCaseAsOutput | null> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId, event);

  if (!useCaseInTable) {
    return null;
  }

  const isMyUseCase = getUserIdFromKey(useCaseInTable.id) === userId;
  const isShared = useCaseInTable.isShared;

  // If it is not my use case and not shared, do not get it
  if (!isMyUseCase && !isShared) {
    return null;
  }

  const favorites = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite',
    event
  );
  const favoritesUseCaseIds = favorites.map((f) => f.useCaseId);

  const useCaseAsOutput: UseCaseAsOutput = {
    ...useCaseInTable,
    isFavorite: favoritesUseCaseIds.includes(useCaseId),
    isMyUseCase,
  };

  return useCaseAsOutput;
};

export const listUseCases = async (
  userId: string,
  event: APIGatewayProxyEvent,
  exclusiveStartKey?: string
): Promise<ListUseCasesResponse> => {
  const { useCases: useCasesInTable, lastEvaluatedKey } =
    await innerFindUseCasesByUserId(userId, event, exclusiveStartKey);

  const favorites = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite',
    event
  );
  const favoritesUseCaseIds = favorites.map((f) => f.useCaseId);

  const useCasesAsOutput: UseCaseAsOutput[] = useCasesInTable.map((u) => {
    return {
      ...u,
      isFavorite: favoritesUseCaseIds.includes(u.useCaseId),
      isMyUseCase: getUserIdFromKey(u.id) === userId,
    };
  });

  return {
    data: useCasesAsOutput,
    lastEvaluatedKey,
  };
};

export const updateUseCase = async (
  userId: string,
  useCaseId: string,
  content: UseCaseContent,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId, event);

  if (!useCaseInTable) {
    console.error(
      `Use case doesn't exist for userId=${userId} and useCaseId=${useCaseId}`
    );
    return;
  }

  if (getUserIdFromKey(useCaseInTable.id) !== userId) {
    console.error(
      `userId mismatch ${userId} vs ${getUserIdFromKey(useCaseInTable.id)}`
    );
    return;
  }

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: useCaseInTable.id,
        dataType: useCaseInTable.dataType,
      },
      UpdateExpression:
        'set title = :title, promptTemplate = :promptTemplate, description = :description, inputExamples = :inputExamples, fixedModelId = :fixedModelId, fileUpload = :fileUpload',
      ExpressionAttributeValues: {
        ':title': content.title,
        ':promptTemplate': content.promptTemplate,
        ':description': content.description ?? '',
        ':inputExamples': content.inputExamples ?? [],
        ':fixedModelId': content.fixedModelId ?? '',
        ':fileUpload': !!content.fileUpload,
      },
    })
  );
};

export const deleteUseCase = async (
  userId: string,
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId, event);

  if (!useCaseInTable) {
    console.error(
      `Use case doesn't exist for userId=${userId} and useCaseId=${useCaseId}`
    );
    return;
  }

  if (getUserIdFromKey(useCaseInTable.id) !== userId) {
    console.error(
      `userId mismatch ${userId} vs ${getUserIdFromKey(useCaseInTable.id)}`
    );
    return;
  }

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const commons = await innerFindCommonsByUseCaseId(useCaseId, event);
  const requestItems = commons.map((common) => {
    return {
      DeleteRequest: {
        Key: {
          id: common.id,
          dataType: common.dataType,
        },
      },
    };
  });

  // Delete body, favorite, recently used at once
  await dynamoDbDocument.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: requestItems,
      },
    })
  );
};

export const listFavoriteUseCases = async (
  userId: string,
  event: APIGatewayProxyEvent,
  exclusiveStartKey?: string
): Promise<ListFavoriteUseCasesResponse> => {
  const { commons, lastEvaluatedKey } =
    await innerFindCommonsByUserIdAndDataTypePagniation(
      userId,
      'favorite',
      event,
      exclusiveStartKey
    );
  const useCaseIds = commons.map((c) => c.useCaseId);
  const useCasesInTable = await innerFindUseCasesByUseCaseIds(
    useCaseIds,
    event
  );
  const useCasesAsOutput: UseCaseAsOutput[] = useCasesInTable.map((u) => {
    return {
      ...u,
      isFavorite: true,
      isMyUseCase: getUserIdFromKey(u.id) === userId,
    };
  });

  // My use case or shared
  const useCasesAsOutputFiltered = useCasesAsOutput.filter((u) => {
    return u.isMyUseCase || u.isShared;
  });

  return {
    data: useCasesAsOutputFiltered,
    lastEvaluatedKey,
  };
};

export const toggleFavorite = async (
  userId: string,
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<IsFavorite> => {
  // Get my favorite list and check if it is already registered
  // MEMO: If the number of favorites is large, it may overflow from the list
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const commons = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite',
    event
  );
  const useCaseIds = commons.map((c) => c.useCaseId);
  const index = useCaseIds.indexOf(useCaseId);

  if (index >= 0) {
    // Unfavorite
    const common = commons[index];

    await dynamoDbDocument.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          id: common.id,
          dataType: common.dataType,
        },
      })
    );

    return { isFavorite: false };
  } else {
    // Register favorite
    await dynamoDbDocument.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id: `useCase#${userId}`,
          dataType: `favorite#${Date.now()}`,
          useCaseId: useCaseId,
        },
      })
    );

    return { isFavorite: true };
  }
};

export const toggleShared = async (
  userId: string,
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<IsShared> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId, event);

  if (!useCaseInTable) {
    console.error(
      `Use case doesn't exist for userId=${userId} and useCaseId=${useCaseId}`
    );
    return { isShared: false };
  }

  if (getUserIdFromKey(useCaseInTable.id) !== userId) {
    console.error(
      `userId mismatch ${userId} vs ${getUserIdFromKey(useCaseInTable.id)}`
    );
    return { isShared: false };
  }

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: useCaseInTable.id,
        dataType: useCaseInTable.dataType,
      },
      UpdateExpression: 'set isShared = :isShared',
      ExpressionAttributeValues: {
        ':isShared': !useCaseInTable.isShared,
      },
    })
  );

  return { isShared: !useCaseInTable.isShared };
};

export const listRecentlyUsedUseCases = async (
  userId: string,
  event: APIGatewayProxyEvent,
  exclusiveStartKey?: string
): Promise<ListRecentlyUsedUseCasesResponse> => {
  const { commons, lastEvaluatedKey } =
    await innerFindCommonsByUserIdAndDataTypePagniation(
      userId,
      'recentlyUsed',
      event,
      exclusiveStartKey
    );
  const useCaseIds = commons.map((c) => c.useCaseId);

  const [useCasesInTable, favorites] = await Promise.all([
    // List user's use cases
    innerFindUseCasesByUseCaseIds(useCaseIds, event),
    // List user's favorites
    innerFindCommonsByUserIdAndDataType(userId, 'favorite', event),
  ]);
  const favoritesUseCaseIds = new Set(favorites.map((f) => f.useCaseId));

  const useCasesAsOutput: UseCaseAsOutput[] = useCasesInTable.map((u) => {
    return {
      ...u,
      isFavorite: favoritesUseCaseIds.has(u.useCaseId),
      isMyUseCase: getUserIdFromKey(u.id) === userId,
    };
  });

  // Own or shared
  const useCasesAsOutputFiltered = useCasesAsOutput.filter((u) => {
    return u.isMyUseCase || u.isShared;
  });

  return {
    data: useCasesAsOutputFiltered,
    lastEvaluatedKey,
  };
};

export const updateRecentlyUsedUseCase = async (
  userId: string,
  useCaseId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);
  const itemsToDelete: UseCaseCommon[] = [];

  // Scan is running for recently used use case data
  const commons = await innerFindCommonsByUserIdAndDataType(
    userId,
    'recentlyUsed',
    event
  );

  // Max number of recently used use cases
  if (commons.length > RECENTLY_USED_SAVE_LIMIT) {
    itemsToDelete.push(...commons.slice(RECENTLY_USED_SAVE_LIMIT));
  }

  const useCaseIds = commons.map((c) => c.useCaseId);
  const index = useCaseIds.indexOf(useCaseId);

  // If there is an older history for the same use case, it is a deletion target
  if (0 <= index && index <= RECENTLY_USED_SAVE_LIMIT - 1) {
    itemsToDelete.push(commons[index]);
  }

  // Delete and add at the same time
  // If a new history is added (no existing history), the number of histories will be RECENTLY_USED_SAVE_LIMIT + 1, but this is acceptable
  await dynamoDbDocument.send(
    new TransactWriteCommand({
      TransactItems: [
        ...itemsToDelete.map((item: UseCaseCommon) => {
          return {
            Delete: {
              TableName: tableName,
              Key: {
                id: item.id,
                dataType: item.dataType,
              },
            },
          };
        }),
        {
          Put: {
            TableName: tableName,
            Item: {
              id: `useCase#${userId}`,
              dataType: `recentlyUsed#${Date.now()}`,
              useCaseId,
            },
          },
        },
      ],
    })
  );
};
