/**
 * Agent Repository - Simplified version
 */

import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { v7 as uuidv7 } from 'uuid';
import {
  AgentInTable,
  AgentAsOutput,
  AgentContent,
  RepositoryListAgentsResponse,
} from 'generative-ai-use-cases';

const TABLE_NAME: string = process.env.USECASE_TABLE_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

// Get agent by agentId with userId context
const findAgentByAgentId = async (
  agentId: string,
  userId: string
): Promise<AgentInTable | null> => {
  // First, try user's own agent
  const userAgentResult = await dynamoDbDocument.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: `agent#${userId}`, dataType: `agent#${agentId}` },
    })
  );
  if (userAgentResult.Item) {
    const item = userAgentResult.Item;
    return {
      ...item,
      starCount: item.starCount || 0, // Default for backward compatibility
    } as AgentInTable;
  }

  // If not found, try public agent (with full data)
  const publicResult = await dynamoDbDocument.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: 'public-agents', dataType: `public#${agentId}` },
    })
  );
  if (publicResult.Item) {
    const record = publicResult.Item;
    return {
      id: `agent#${record.createdBy}`,
      dataType: `agent#${record.agentId}`,
      agentId: record.agentId,
      name: record.name,
      description: record.description,
      systemPrompt: record.systemPrompt,
      modelId: record.modelId,
      mcpServers: record.mcpServers,
      codeExecutionEnabled: record.codeExecutionEnabled,
      tags: record.tags,
      isPublic: record.isPublic,
      starCount: record.starCount || 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdByEmail: record.createdByEmail,
      createdBy: record.createdBy,
    } as AgentInTable;
  }

  return null;
};

// Get agent list by userId
const findAgentsByUserId = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<{ agents: AgentInTable[]; lastEvaluatedKey?: string }> => {
  const startKey = exclusiveStartKey
    ? JSON.parse(Buffer.from(exclusiveStartKey, 'base64').toString())
    : undefined;

  const result = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        '#id = :id and begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': `agent#${userId}`,
        ':dataTypePrefix': 'agent#',
      },
      ScanIndexForward: true,
      Limit: limit || 30,
      ExclusiveStartKey: startKey,
    })
  );

  const agents = (result.Items || []).map((item) => ({
    ...item,
    starCount: item.starCount || 0, // Default for backward compatibility
  })) as AgentInTable[];

  return {
    agents,
    lastEvaluatedKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

// Get favorites by userId
const findFavoritesByUserId = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<{
  favorites: Array<{ dataType: string; agentId: string }>;
  lastEvaluatedKey?: string;
}> => {
  const startKey = exclusiveStartKey
    ? JSON.parse(Buffer.from(exclusiveStartKey, 'base64').toString())
    : undefined;

  const result = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        '#id = :id and begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': `agent#${userId}`,
        ':dataTypePrefix': 'favorite#',
      },
      ScanIndexForward: true,
      Limit: limit || 20,
      ExclusiveStartKey: startKey,
    })
  );

  const favorites = (result.Items || []).map((item) => ({
    dataType: item.dataType,
    agentId: item.dataType.replace('favorite#', ''),
  }));

  return {
    favorites,
    lastEvaluatedKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

// Get agents by agentIds (optimized for favorites)
const findAgentsByAgentIds = async (
  agentIds: string[],
  userId: string
): Promise<AgentInTable[]> => {
  if (agentIds.length === 0) return [];

  // Get user's own agents first
  const { agents: userAgents } = await findAgentsByUserId(userId);
  const userAgentMap = new Map(
    userAgents.map((agent) => [agent.agentId, agent])
  );

  const foundAgents: AgentInTable[] = [];
  const publicAgentIds: string[] = [];

  // Separate user's own agents from public agents
  for (const agentId of agentIds) {
    const userAgent = userAgentMap.get(agentId);
    if (userAgent) {
      foundAgents.push(userAgent);
    } else {
      publicAgentIds.push(agentId);
    }
  }

  // Get public agents
  if (publicAgentIds.length > 0) {
    const publicAgentPromises = publicAgentIds.map(async (agentId) => {
      const result = await dynamoDbDocument.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: 'public-agents', dataType: `public#${agentId}` },
        })
      );
      if (result.Item) {
        const record = result.Item;
        return {
          id: `agent#${record.createdBy}`,
          dataType: `agent#${record.agentId}`,
          agentId: record.agentId,
          name: record.name,
          description: record.description,
          systemPrompt: record.systemPrompt,
          modelId: record.modelId,
          mcpServers: record.mcpServers,
          codeExecutionEnabled: record.codeExecutionEnabled,
          tags: record.tags,
          isPublic: record.isPublic,
          starCount: record.starCount || 0,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          createdByEmail: record.createdByEmail,
          createdBy: record.createdBy,
        } as AgentInTable;
      }
      return null;
    });

    const publicAgents = (await Promise.all(publicAgentPromises)).filter(
      (agent): agent is AgentInTable => agent !== null
    );

    foundAgents.push(...publicAgents);
  }

  return foundAgents;
};

// Manage public agent record
const managePublicAgentRecord = async (
  agentId: string,
  isPublic: boolean,
  agentData?: AgentInTable
): Promise<void> => {
  const key = { id: 'public-agents', dataType: `public#${agentId}` };

  console.log(
    `managePublicAgentRecord: agentId=${agentId}, isPublic=${isPublic}, hasAgentData=${!!agentData}`
  );

  if (isPublic && agentData) {
    // Add/update public record with full data, but preserve the public record keys
    console.log(`Creating/updating public record for agent ${agentId}`);
    await dynamoDbDocument.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...agentData, // All agent data except id and dataType
          ...key, // Public record keys: id: 'public-agents', dataType: 'public#agentId'
        },
      })
    );
    console.log(`Public record created/updated for agent ${agentId}`);
  } else {
    // Remove public record
    console.log(`Removing public record for agent ${agentId}`);
    await dynamoDbDocument.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: key })
    );
    console.log(`Public record removed for agent ${agentId}`);
  }
};

// Get all public agents
export const listPublicAgents = async (): Promise<AgentInTable[]> => {
  const result = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        '#id = :id AND begins_with(#dataType, :dataTypePrefix)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#dataType': 'dataType',
      },
      ExpressionAttributeValues: {
        ':id': 'public-agents',
        ':dataTypePrefix': 'public#',
      },
    })
  );

  return (result.Items || []).map(
    (item) =>
      ({
        id: `agent#${item.createdBy}`,
        dataType: `agent#${item.agentId}`,
        agentId: item.agentId,
        name: item.name,
        description: item.description,
        systemPrompt: item.systemPrompt,
        modelId: item.modelId,
        mcpServers: item.mcpServers,
        codeExecutionEnabled: item.codeExecutionEnabled,
        tags: item.tags,
        isPublic: item.isPublic,
        starCount: item.starCount || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdByEmail: item.createdByEmail,
        createdBy: item.createdBy,
      }) as AgentInTable
  );
};

export const createAgent = async (
  userId: string,
  content: AgentContent
): Promise<AgentAsOutput> => {
  const agentId = uuidv7();
  const now = new Date().toISOString();

  const item: AgentInTable = {
    id: `agent#${userId}`,
    dataType: `agent#${agentId}`,
    agentId,
    name: content.name,
    description: content.description || '',
    systemPrompt: content.systemPrompt,
    modelId: content.modelId,
    mcpServers: content.mcpServers,
    codeExecutionEnabled: content.codeExecutionEnabled ?? false,
    tags: content.tags || [],
    isPublic: content.isPublic ?? false,
    starCount: 0,
    createdAt: now,
    updatedAt: now,
    createdByEmail: content.createdByEmail,
    createdBy: userId,
  };

  await dynamoDbDocument.send(
    new PutCommand({ TableName: TABLE_NAME, Item: item })
  );

  if (item.isPublic) {
    await managePublicAgentRecord(agentId, true, item);
  }

  return { ...item, isMyAgent: true };
};

export const getAgent = async (
  userId: string,
  agentId: string
): Promise<AgentAsOutput | null> => {
  const agent = await findAgentByAgentId(agentId, userId);
  if (!agent) return null;

  const isMyAgent = agent.createdBy === userId;

  // Access control: must be my agent or public
  if (!isMyAgent && !agent.isPublic) {
    return null;
  }

  return { ...agent, isMyAgent };
};

export const listAgents = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<RepositoryListAgentsResponse> => {
  const { agents, lastEvaluatedKey } = await findAgentsByUserId(
    userId,
    exclusiveStartKey,
    limit
  );

  return {
    data: agents.map((agent) => ({ ...agent, isMyAgent: true })),
    lastEvaluatedKey,
  };
};

export const updateAgent = async (
  userId: string,
  agentId: string,
  content: AgentContent
): Promise<void> => {
  const agent = await findAgentByAgentId(agentId, userId);
  if (!agent || agent.createdBy !== userId) {
    throw new Error(`Agent not found or access denied: ${agentId}`);
  }

  const now = new Date().toISOString();
  const wasPublic = agent.isPublic;
  const isNowPublic = content.isPublic ?? false;

  // Update main agent record
  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: agent.id, dataType: agent.dataType },
      UpdateExpression:
        'set #name = :name, description = :description, systemPrompt = :systemPrompt, modelId = :modelId, mcpServers = :mcpServers, codeExecutionEnabled = :codeExecutionEnabled, tags = :tags, isPublic = :isPublic, updatedAt = :updatedAt, createdByEmail = :createdByEmail',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: {
        ':name': content.name,
        ':description': content.description || '',
        ':systemPrompt': content.systemPrompt,
        ':modelId': content.modelId,
        ':mcpServers': content.mcpServers,
        ':codeExecutionEnabled': content.codeExecutionEnabled ?? false,
        ':tags': content.tags || [],
        ':isPublic': isNowPublic,
        ':updatedAt': now,
        ':createdByEmail': content.createdByEmail,
      },
    })
  );

  // Update public record if needed
  const updatedAgent: AgentInTable = {
    ...agent,
    ...content,
    description: content.description || '',
    codeExecutionEnabled: content.codeExecutionEnabled ?? false,
    tags: content.tags || [],
    isPublic: isNowPublic,
    updatedAt: now,
  };

  if (wasPublic !== isNowPublic || isNowPublic) {
    await managePublicAgentRecord(agentId, isNowPublic, updatedAgent);
  }
};

export const deleteAgent = async (
  userId: string,
  agentId: string
): Promise<void> => {
  const agent = await findAgentByAgentId(agentId, userId);
  if (!agent || agent.createdBy !== userId) {
    throw new Error(`Agent not found or access denied: ${agentId}`);
  }

  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: agent.id, dataType: agent.dataType },
    })
  );

  if (agent.isPublic) {
    await managePublicAgentRecord(agentId, false);
  }
};

export const listAgentsWithFavorites = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<{
  data: (AgentAsOutput & { isFavorite: boolean })[];
  lastEvaluatedKey?: string;
}> => {
  const [agentsResult, favoritesResult] = await Promise.all([
    findAgentsByUserId(userId, exclusiveStartKey, limit),
    findFavoritesByUserId(userId),
  ]);

  const favoriteIds = new Set(favoritesResult.favorites.map((f) => f.agentId));

  return {
    data: agentsResult.agents.map((agent) => ({
      ...agent,
      isMyAgent: true,
      isFavorite: favoriteIds.has(agent.agentId),
    })),
    lastEvaluatedKey: agentsResult.lastEvaluatedKey,
  };
};

export const listPublicAgentsWithFavorites = async (
  userId: string
): Promise<(AgentInTable & { isFavorite: boolean; isMyAgent: boolean })[]> => {
  const [publicAgents, favoritesResult] = await Promise.all([
    listPublicAgents(),
    findFavoritesByUserId(userId),
  ]);

  const favoriteIds = new Set(favoritesResult.favorites.map((f) => f.agentId));

  return publicAgents.map((agent) => ({
    ...agent,
    isFavorite: favoriteIds.has(agent.agentId),
    isMyAgent: agent.createdBy === userId,
  }));
};

export const listPublicAgentsWithFavoritesPaginated = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<{
  data: (AgentAsOutput & { isFavorite: boolean; isMyAgent: boolean })[];
  lastEvaluatedKey?: string;
}> => {
  const startKey = exclusiveStartKey
    ? JSON.parse(Buffer.from(exclusiveStartKey, 'base64').toString())
    : undefined;

  const [publicResult, favoritesResult] = await Promise.all([
    dynamoDbDocument.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          '#id = :id AND begins_with(#dataType, :dataTypePrefix)',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#dataType': 'dataType',
        },
        ExpressionAttributeValues: {
          ':id': 'public-agents',
          ':dataTypePrefix': 'public#',
        },
        ScanIndexForward: true,
        Limit: limit || 12,
        ExclusiveStartKey: startKey,
      })
    ),
    findFavoritesByUserId(userId),
  ]);

  const favoriteIds = new Set(favoritesResult.favorites.map((f) => f.agentId));
  const agents = (publicResult.Items || []).map(
    (item) =>
      ({
        id: `agent#${item.createdBy}`,
        dataType: `agent#${item.agentId}`,
        agentId: item.agentId,
        name: item.name,
        description: item.description,
        systemPrompt: item.systemPrompt,
        modelId: item.modelId,
        mcpServers: item.mcpServers,
        codeExecutionEnabled: item.codeExecutionEnabled,
        tags: item.tags,
        isPublic: item.isPublic,
        starCount: item.starCount || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdByEmail: item.createdByEmail,
        createdBy: item.createdBy,
      }) as AgentInTable
  );

  return {
    data: agents.map((agent) => ({
      ...agent,
      isFavorite: favoriteIds.has(agent.agentId),
      isMyAgent: agent.createdBy === userId,
    })),
    lastEvaluatedKey: publicResult.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(publicResult.LastEvaluatedKey)).toString(
          'base64'
        )
      : undefined,
  };
};

export const listFavoriteAgents = async (
  userId: string,
  exclusiveStartKey?: string,
  limit?: number
): Promise<{ data: AgentAsOutput[]; lastEvaluatedKey?: string }> => {
  const favoritesResult = await findFavoritesByUserId(
    userId,
    exclusiveStartKey,
    limit
  );

  const agentIds = favoritesResult.favorites.map((f) => f.agentId);
  const agents = await findAgentsByAgentIds(agentIds, userId);

  return {
    data: agents
      .filter((agent) => agent.createdBy === userId || agent.isPublic)
      .map((agent) => ({
        ...agent,
        isMyAgent: agent.createdBy === userId,
      })),
    lastEvaluatedKey: favoritesResult.lastEvaluatedKey,
  };
};

export const isFavoriteAgent = async (
  userId: string,
  agentId: string
): Promise<boolean> => {
  const result = await dynamoDbDocument.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: `agent#${userId}`, dataType: `favorite#${agentId}` },
    })
  );
  return !!result.Item;
};

export const toggleFavorite = async (
  userId: string,
  agentId: string
): Promise<{ isFavorite: boolean }> => {
  const key = { id: `agent#${userId}`, dataType: `favorite#${agentId}` };
  const existing = await dynamoDbDocument.send(
    new GetCommand({ TableName: TABLE_NAME, Key: key })
  );

  // Get the agent to update its star count
  const agent = await findAgentByAgentId(agentId, userId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  if (existing.Item) {
    // Remove from favorites and decrement star count
    await Promise.all([
      dynamoDbDocument.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: key })
      ),
      // Update star count in main agent record
      dynamoDbDocument.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: agent.id, dataType: agent.dataType },
          UpdateExpression: 'ADD starCount :dec',
          ExpressionAttributeValues: {
            ':dec': -1,
          },
        })
      ),
    ]);

    // Update public record if agent is public
    if (agent.isPublic) {
      await dynamoDbDocument.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: 'public-agents', dataType: `public#${agentId}` },
          UpdateExpression: 'ADD starCount :dec',
          ExpressionAttributeValues: {
            ':dec': -1,
          },
        })
      );
    }

    return { isFavorite: false };
  } else {
    // Add to favorites and increment star count
    await Promise.all([
      dynamoDbDocument.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...key,
            agentId,
            createdAt: new Date().toISOString(),
          },
        })
      ),
      // Update star count in main agent record
      dynamoDbDocument.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: agent.id, dataType: agent.dataType },
          UpdateExpression: 'ADD starCount :inc',
          ExpressionAttributeValues: {
            ':inc': 1,
          },
        })
      ),
    ]);

    // Update public record if agent is public
    if (agent.isPublic) {
      await dynamoDbDocument.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: 'public-agents', dataType: `public#${agentId}` },
          UpdateExpression: 'ADD starCount :inc',
          ExpressionAttributeValues: {
            ':inc': 1,
          },
        })
      );
    }

    return { isFavorite: true };
  }
};
