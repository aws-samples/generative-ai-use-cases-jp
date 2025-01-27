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
} from 'generative-ai-use-cases-jp';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const USECASE_TABLE_NAME: string = process.env.USECASE_TABLE_NAME!;
const USECASE_ID_INDEX_NAME: string = process.env.USECASE_ID_INDEX_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

// 利用履歴の最大保存数
// 正確には RECENTLY_USED_SAVE_LIMIT + 1 になるケースがある
// 詳細は updateRecentlyUsedUseCase 関数を参照
const RECENTLY_USED_SAVE_LIMIT = 100;

const getUserIdFromKey = (key: string): string => {
  return key.split('#').slice(1).join('#');
};

// useCaseId のユースケースを取得
const innerFindUseCaseByUseCaseId = async (
  useCaseId: string
): Promise<UseCaseInTable | null> => {
  const useCaseInTable = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
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
    })
  );

  if (useCaseInTable.Items && useCaseInTable.Items.length > 0) {
    return useCaseInTable.Items[0] as UseCaseInTable;
  } else {
    return null;
  }
};

// userId のユースケース一覧を取得
const innerFindUseCasesByUserId = async (
  userId: string,
  _exclusiveStartKey?: string
): Promise<{ useCases: UseCaseInTable[]; lastEvaluatedKey?: string }> => {
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;
  const useCasesInTable = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
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
      Limit: 30, // マイユースケースのページあたりの取得件数
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

// useCaseId の配列からユースケース一覧を取得
const innerFindUseCasesByUseCaseIds = async (
  useCaseIds: string[]
): Promise<UseCaseInTable[]> => {
  const useCasesInTable: UseCaseInTable[] = [];

  for (const useCaseId of useCaseIds) {
    const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId);

    if (useCaseInTable) {
      useCasesInTable.push(useCaseInTable);
    }
  }

  return useCasesInTable;
};

// userId の特定のデータタイプ (お気に入り・利用履歴) 一覧を取得 (全取得)
const innerFindCommonsByUserIdAndDataType = async (
  userId: string,
  dataTypePrefix: string
): Promise<UseCaseCommon[]> => {
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
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

// userId の特定のデータタイプ (お気に入り・利用履歴) 一覧を取得 (ページネーション対応)
const innerFindCommonsByUserIdAndDataTypePagniation = async (
  userId: string,
  dataTypePrefix: string,
  _exclusiveStartKey?: string
): Promise<{ commons: UseCaseCommon[]; lastEvaluatedKey?: string }> => {
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
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
      Limit: 20, // お気に入り・利用履歴のページあたりの取得件数
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

// useCaseId に関連する全てのデータ (本体・お気に入り・利用履歴) 一覧を取得
const innerFindCommonsByUseCaseId = async (
  useCaseId: string
): Promise<UseCaseCommon[]> => {
  const commons = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: USECASE_TABLE_NAME,
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
  content: UseCaseContent
): Promise<UseCaseAsOutput> => {
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
      TableName: USECASE_TABLE_NAME,
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
  useCaseId: string
): Promise<UseCaseAsOutput | null> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId);

  if (!useCaseInTable) {
    return null;
  }

  const isMyUseCase = getUserIdFromKey(useCaseInTable.id) === userId;
  const isShared = useCaseInTable.isShared;

  // 自分のユースケースではない & シェアされていないものは取得させない
  if (!isMyUseCase && !isShared) {
    return null;
  }

  const favorites = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite'
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
  exclusiveStartKey?: string
): Promise<ListUseCasesResponse> => {
  const { useCases: useCasesInTable, lastEvaluatedKey } =
    await innerFindUseCasesByUserId(userId, exclusiveStartKey);

  const favorites = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite'
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
  content: UseCaseContent
): Promise<void> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId);

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

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: USECASE_TABLE_NAME,
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
  useCaseId: string
): Promise<void> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId);

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

  const commons = await innerFindCommonsByUseCaseId(useCaseId);
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

  // 本体・お気に入り・利用履歴をまとめて削除
  await dynamoDbDocument.send(
    new BatchWriteCommand({
      RequestItems: {
        [USECASE_TABLE_NAME]: requestItems,
      },
    })
  );
};

export const listFavoriteUseCases = async (
  userId: string,
  exclusiveStartKey?: string
): Promise<ListFavoriteUseCasesResponse> => {
  const { commons, lastEvaluatedKey } =
    await innerFindCommonsByUserIdAndDataTypePagniation(
      userId,
      'favorite',
      exclusiveStartKey
    );
  const useCaseIds = commons.map((c) => c.useCaseId);
  const useCasesInTable = await innerFindUseCasesByUseCaseIds(useCaseIds);
  const useCasesAsOutput: UseCaseAsOutput[] = useCasesInTable.map((u) => {
    return {
      ...u,
      isFavorite: true,
      isMyUseCase: getUserIdFromKey(u.id) === userId,
    };
  });

  // 自分のもの or シェアされているもののみ
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
  useCaseId: string
): Promise<IsFavorite> => {
  // 自分のお気に入り一覧を取得してすでに登録されているかを確認する
  // MEMO: お気に入りの数が膨大になった場合リストから溢れる可能性あり
  const commons = await innerFindCommonsByUserIdAndDataType(userId, 'favorite');
  const useCaseIds = commons.map((c) => c.useCaseId);
  const index = useCaseIds.indexOf(useCaseId);

  if (index >= 0) {
    // お気に入りを解除
    const common = commons[index];

    await dynamoDbDocument.send(
      new DeleteCommand({
        TableName: USECASE_TABLE_NAME,
        Key: {
          id: common.id,
          dataType: common.dataType,
        },
      })
    );

    return { isFavorite: false };
  } else {
    // お気に入りに登録
    await dynamoDbDocument.send(
      new PutCommand({
        TableName: USECASE_TABLE_NAME,
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
  useCaseId: string
): Promise<IsShared> => {
  const useCaseInTable = await innerFindUseCaseByUseCaseId(useCaseId);

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

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: USECASE_TABLE_NAME,
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
  exclusiveStartKey?: string
): Promise<ListRecentlyUsedUseCasesResponse> => {
  const { commons, lastEvaluatedKey } =
    await innerFindCommonsByUserIdAndDataTypePagniation(
      userId,
      'recentlyUsed',
      exclusiveStartKey
    );
  const useCaseIds = commons.map((c) => c.useCaseId);
  const useCasesInTable = await innerFindUseCasesByUseCaseIds(useCaseIds);

  const favorites = await innerFindCommonsByUserIdAndDataType(
    userId,
    'favorite'
  );
  const favoritesUseCaseIds = favorites.map((f) => f.useCaseId);

  const useCasesAsOutput: UseCaseAsOutput[] = useCasesInTable.map((u) => {
    return {
      ...u,
      isFavorite: favoritesUseCaseIds.includes(u.useCaseId),
      isMyUseCase: getUserIdFromKey(u.id) === userId,
    };
  });

  // 自分のもの or シェアされているもののみ
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
  useCaseId: string
): Promise<void> => {
  const itemsToDelete: UseCaseCommon[] = [];

  // 最近使ったユースーケースのデータに対してスキャンが走っている
  const commons = await innerFindCommonsByUserIdAndDataType(
    userId,
    'recentlyUsed'
  );

  // 最近使ったユースケースの保存件数のリミット
  if (commons.length > RECENTLY_USED_SAVE_LIMIT) {
    itemsToDelete.push(...commons.slice(RECENTLY_USED_SAVE_LIMIT));
  }

  const useCaseIds = commons.map((c) => c.useCaseId);
  const index = useCaseIds.indexOf(useCaseId);

  // 同じユースケースに対して古い利用履歴があれば削除対象
  if (0 <= index && index <= RECENTLY_USED_SAVE_LIMIT - 1) {
    itemsToDelete.push(commons[index]);
  }

  // 削除と追加を同時に行う
  // 履歴の新規追加の場合 (既存の履歴がない場合) 保存数が
  // RECENTLY_USED_SAVE_LIMIT + 1 になるが、それは許容する
  await dynamoDbDocument.send(
    new TransactWriteCommand({
      TransactItems: [
        ...itemsToDelete.map((item: UseCaseCommon) => {
          return {
            Delete: {
              TableName: USECASE_TABLE_NAME,
              Key: {
                id: item.id,
                dataType: item.dataType,
              },
            },
          };
        }),
        {
          Put: {
            TableName: USECASE_TABLE_NAME,
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
