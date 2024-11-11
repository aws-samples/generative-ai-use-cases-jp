import {
  CustomUseCaseMeta,
  UseCaseId,
  IsFavorite,
  HasShared,
  CustomUseCase,
  TableUseCase,
  UseCaseInputExample,
} from 'generative-ai-use-cases-jp';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const USECASE_TABLE_NAME: string = process.env.USECASE_TABLE_NAME!;
const USECASE_ID_INDEX_NAME: string = process.env.USECASE_ID_INDEX_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

export const listUseCases = async (
  _userId: string
): Promise<CustomUseCaseMeta[]> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;

  const [useCaseRes, favoriteRes] = await Promise.all([
    dynamoDbDocument.send(
      new QueryCommand({
        TableName: USECASE_TABLE_NAME,
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':id': useCaseUserId,
        },
      })
    ),

    dynamoDbDocument.send(
      new QueryCommand({
        TableName: USECASE_TABLE_NAME,
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':id': favoriteUserId,
        },
      })
    ),
  ]);

  const favoriteSet = new Set(
    (favoriteRes.Items || []).map((item) => item.useCaseId)
  );

  return ((useCaseRes.Items as TableUseCase[]) || []).map((item) => ({
    useCaseId: item.useCaseId,
    title: item.title,
    description: item.description,
    isFavorite: favoriteSet.has(item.useCaseId),
    hasShared: item.hasShared,
    isMyUseCase: true,
  }));
};

export const listFavoriteUseCases = async (
  _userId: string
): Promise<CustomUseCaseMeta[]> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;

  const favoriteRes = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': favoriteUserId,
      },
    })
  );

  if (!favoriteRes.Items || favoriteRes.Items.length === 0) {
    return [];
  }

  const favoriteUseCaseIds = favoriteRes.Items.map((item) => item.useCaseId);

  const useCases: TableUseCase[] = [];
  for (const favoriteUseCaseId of favoriteUseCaseIds) {
    const useCaseRes = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: USECASE_TABLE_NAME,
        IndexName: USECASE_ID_INDEX_NAME,
        KeyConditionExpression:
          'useCaseId = :useCaseId AND begins_with(#id, :prefixId)',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':useCaseId': favoriteUseCaseId,
          ':prefixId': 'user#useCase#',
        },
      })
    );
    if (!useCaseRes.Items || useCaseRes.Items.length === 0) continue;
    const useCaseItem = useCaseRes.Items[0];
    if (!useCaseItem) continue;
    useCases.push(useCaseItem as TableUseCase);
  }

  return useCases
    .filter((useCase): useCase is NonNullable<typeof useCase> => {
      if (!useCase) return false;
      return useCase.id === useCaseUserId || useCase.hasShared;
    })
    .map((item) => ({
      useCaseId: item.useCaseId,
      title: item.title,
      description: item.description,
      isFavorite: true,
      hasShared: item.hasShared,
      isMyUseCase: item.id === useCaseUserId,
    }));
};

// 自分が作成しただけでなく、共有されたユースケースも取得
export const getUseCase = async (
  _userId: string,
  useCaseId: string
): Promise<CustomUseCase | null> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;
  const useCaseRes = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
      IndexName: USECASE_ID_INDEX_NAME,
      KeyConditionExpression:
        'useCaseId = :useCaseId AND begins_with(#id, :prefixId)',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':useCaseId': useCaseId,
        ':prefixId': 'user#useCase#',
      },
    })
  );

  const useCase = useCaseRes.Items?.[0] as TableUseCase | undefined;

  if (!useCase || (useCase.id !== useCaseUserId && !useCase.hasShared)) {
    return null;
  }

  const favoriteRes = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: favoriteUserId,
        useCaseId: useCaseId,
      },
    })
  );

  return {
    useCaseId: useCase.useCaseId,
    title: useCase.title,
    description: useCase.description,
    inputExamples: useCase.inputExamples,
    isFavorite: Boolean(favoriteRes.Item),
    promptTemplate: useCase.promptTemplate,
    hasShared: useCase.hasShared,
    isMyUseCase: useCase.id === useCaseUserId,
  };
};

export const createUseCase = async (params: {
  userId: string;
  title: string;
  promptTemplate: string;
  description?: string;
  inputExamples?: UseCaseInputExample[];
}): Promise<UseCaseId> => {
  const userId = `user#useCase#${params.userId}`;
  const useCaseId = crypto.randomUUID();
  const item: TableUseCase = {
    id: userId,
    useCaseId: useCaseId,
    title: params.title,
    description: params.description,
    promptTemplate: params.promptTemplate,
    inputExamples: params.inputExamples,
    hasShared: false,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: USECASE_TABLE_NAME,
      Item: item,
    })
  );

  return { useCaseId: useCaseId };
};

export const updateUseCase = async (
  _userId: string,
  useCaseId: string,
  params: {
    title: string;
    promptTemplate: string;
    description?: string;
    inputExamples?: UseCaseInputExample[];
  }
): Promise<void> => {
  const userId = `user#useCase#${_userId}`;
  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: userId,
        useCaseId: useCaseId,
      },
      UpdateExpression:
        'set title = :title, promptTemplate = :promptTemplate, description = :description, inputExamples = :inputExamples',
      ExpressionAttributeValues: {
        ':title': params.title,
        ':promptTemplate': params.promptTemplate,
        ':description': params.description ?? '',
        ':inputExamples': params.inputExamples ?? [],
      },
    })
  );
};

export const deleteUseCase = async (
  _userId: string,
  useCaseId: string
): Promise<void> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;

  // ユースケース削除
  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: useCaseUserId,
        useCaseId: useCaseId,
      },
    })
  );

  // お気に入り登録があれば削除
  const result = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: favoriteUserId,
        useCaseId: useCaseId,
      },
    })
  );
  if (result.Item) {
    await dynamoDbDocument.send(
      new DeleteCommand({
        TableName: USECASE_TABLE_NAME,
        Key: {
          id: favoriteUserId,
          useCaseId: useCaseId,
        },
      })
    );
  }
};

export const toggleFavorite = async (
  _userId: string,
  useCaseId: string
): Promise<IsFavorite> => {
  const favoriteUserId = `user#favorite#${_userId}`;

  const existingFavorite = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: favoriteUserId,
        useCaseId: useCaseId,
      },
    })
  );

  if (existingFavorite.Item) {
    await dynamoDbDocument.send(
      new DeleteCommand({
        TableName: USECASE_TABLE_NAME,
        Key: {
          id: favoriteUserId,
          useCaseId: useCaseId,
        },
      })
    );
    return { isFavorite: false };
  } else {
    await dynamoDbDocument.send(
      new PutCommand({
        TableName: USECASE_TABLE_NAME,
        Item: {
          id: favoriteUserId,
          useCaseId: useCaseId,
        },
      })
    );
    return { isFavorite: true };
  }
};

export const getOwnedUseCase = async (
  _userId: string,
  useCaseId: string
): Promise<CustomUseCase | null> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;

  const useCaseRes = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: useCaseUserId,
        useCaseId: useCaseId,
      },
    })
  );
  if (!useCaseRes.Item) return null;

  const favoriteRes = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: favoriteUserId,
        useCaseId: useCaseId,
      },
    })
  );
  const item = useCaseRes.Item;

  return {
    useCaseId: item.useCaseId,
    title: item.title,
    isFavorite: Boolean(favoriteRes.Item),
    promptTemplate: item.promptTemplate,
    hasShared: item.hasShared,
    isMyUseCase: true,
  };
};

export const toggleShared = async (
  _userId: string,
  useCase: CustomUseCaseMeta
): Promise<HasShared> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const newSharedState = !useCase.hasShared;
  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: useCaseUserId,
        useCaseId: useCase.useCaseId,
      },
      UpdateExpression: 'set hasShared = :hasShared',
      ExpressionAttributeValues: {
        ':hasShared': newSharedState,
      },
    })
  );
  return { hasShared: newSharedState };
};

export const listRecentlyUsedUseCases = async (
  _userId: string
): Promise<CustomUseCaseMeta[]> => {
  const useCaseUserId = `user#useCase#${_userId}`;
  const favoriteUserId = `user#favorite#${_userId}`;
  const recentlyUsedUserId = `user#recentlyUsed#${_userId}`;

  const recentlyUsedRes = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: recentlyUsedUserId,
        useCaseId: 'recently',
      },
    })
  );

  if (
    !recentlyUsedRes.Item?.recentUseCaseIds ||
    recentlyUsedRes.Item.recentUseCaseIds.length === 0
  ) {
    return [];
  }

  const recentUseCaseIds = recentlyUsedRes.Item.recentUseCaseIds;

  const favoriteRes = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': favoriteUserId,
      },
    })
  );

  const favoriteSet = new Set(
    (favoriteRes.Items || []).map((item) => item.useCaseId)
  );

  const useCasesMeta: CustomUseCaseMeta[] = [];
  for (const useCaseId of recentUseCaseIds) {
    if (useCasesMeta.length >= 15) break;
    const useCaseRes = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: USECASE_TABLE_NAME,
        IndexName: USECASE_ID_INDEX_NAME,
        KeyConditionExpression:
          'useCaseId = :useCaseId AND begins_with(#id, :prefixId)',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':useCaseId': useCaseId,
          ':prefixId': 'user#useCase#',
        },
      })
    );

    if (!useCaseRes.Items || useCaseRes.Items.length === 0) continue;

    const useCase = useCaseRes.Items[0] as TableUseCase;
    if (useCase.id !== useCaseUserId && !useCase.hasShared) continue;
    useCasesMeta.push({
      useCaseId: useCase.useCaseId,
      title: useCase.title,
      description: useCase.description,
      isFavorite: favoriteSet.has(useCase.useCaseId),
      hasShared: useCase.hasShared,
      isMyUseCase: useCase.id === useCaseUserId,
    });
  }

  return useCasesMeta;
};

export const updateRecentlyUsedUseCase = async (
  _userId: string,
  useCaseId: string
): Promise<void> => {
  const recentlyUsedUserId = `user#recentlyUsed#${_userId}`;

  const currentRes = await dynamoDbDocument.send(
    new GetCommand({
      TableName: USECASE_TABLE_NAME,
      Key: {
        id: recentlyUsedUserId,
        useCaseId: 'recently',
      },
    })
  );

  let currentUseCaseIds = currentRes.Item?.recentUseCaseIds || [];
  currentUseCaseIds = currentUseCaseIds.filter(
    (id: string) => id !== useCaseId
  );
  currentUseCaseIds.unshift(useCaseId);
  currentUseCaseIds = currentUseCaseIds.slice(0, 15);

  if (!currentRes.Item) {
    // 新規作成
    await dynamoDbDocument.send(
      new PutCommand({
        TableName: USECASE_TABLE_NAME,
        Item: {
          id: recentlyUsedUserId,
          useCaseId: 'recently',
          recentUseCaseIds: currentUseCaseIds,
        },
      })
    );
  } else {
    // 更新
    await dynamoDbDocument.send(
      new UpdateCommand({
        TableName: USECASE_TABLE_NAME,
        Key: {
          id: recentlyUsedUserId,
          useCaseId: 'recently',
        },
        UpdateExpression: 'SET recentUseCaseIds = :recentUseCaseIds',
        ExpressionAttributeValues: {
          ':recentUseCaseIds': currentUseCaseIds,
        },
      })
    );
  }
};
