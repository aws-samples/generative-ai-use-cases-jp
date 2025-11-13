import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';

import {
  getPptxTemplatesTableName,
  getPptxGenerationsTableName,
} from './tenantPptxConfig';
import { getTenantId } from '../utils/tenantUtils';
import { createTenantDynamoDBClient } from '../utils/tenantDynamoDBClient';

/**
 * Get or create a tenant-specific DynamoDB document client
 * Falls back to default client if tenant-specific access fails
 */
async function getTenantDynamoDBDocument(
  event: APIGatewayProxyEvent
): Promise<DynamoDBDocumentClient> {
  const tenantId = getTenantId(event);

  // For default tenant, use standard DynamoDB client
  if (!tenantId || tenantId === 'default') {
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

export interface PptxTemplate {
  templateId: string;
  tenantId: string;
  userId: string;
  templateName: string;
  templateDescription?: string;
  s3Key: string;
  thumbnailS3Key?: string;
  isPublic: string; // 'true' or 'false' for GSI compatibility
  tags: string[];
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface PptxGeneration {
  generationId: string;
  userId: string;
  tenantId: string;
  chatId?: string;
  templateId?: string;
  instructions: string;
  slideCount?: number;
  includeTitleSlide: boolean;
  includeSummarySlide: boolean;
  modelId?: string;
  status: 'generating' | 'completed' | 'failed';
  s3OutputKey?: string;
  errorMessage?: string;
  slides?: any[];
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

// Template Operations
export async function createTemplate(
  event: APIGatewayProxyEvent,
  templateId: string,
  userId: string,
  templateName: string,
  templateDescription: string | undefined,
  s3Key: string,
  isPublic: boolean = false,
  tags: string[] = [],
  thumbnailS3Key?: string
): Promise<PptxTemplate> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);
  const now = new Date().toISOString();
  const ttl = Math.floor(
    (new Date().getTime() + 365 * 24 * 60 * 60 * 1000) / 1000
  ); // 1 year TTL

  const item: PptxTemplate = {
    templateId,
    tenantId,
    userId,
    templateName,
    templateDescription,
    s3Key,
    thumbnailS3Key,
    isPublic: isPublic ? 'true' : 'false',
    tags,
    createdAt: now,
    updatedAt: now,
    ttl,
  };

  const command = new PutCommand({
    TableName: getPptxTemplatesTableName(tenantId),
    Item: item,
  });

  await docClient.send(command);
  console.log(`Created PPTX template: ${templateId} for tenant: ${tenantId}`);
  return item;
}

export async function findTemplateById(
  event: APIGatewayProxyEvent,
  templateId: string
): Promise<PptxTemplate | null> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);

  const command = new GetCommand({
    TableName: getPptxTemplatesTableName(tenantId),
    Key: {
      templateId,
    },
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    return null;
  }

  return response.Item as PptxTemplate;
}

export async function findTemplatesByTenant(
  event: APIGatewayProxyEvent,
  userId?: string,
  includePublic: boolean = true,
  limit: number = 20,
  offset: number = 0
): Promise<PptxTemplate[]> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);
  const templates: PptxTemplate[] = [];

  // Query user's private templates if userId provided
  if (userId) {
    const userCommand = new QueryCommand({
      TableName: getPptxTemplatesTableName(tenantId),
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
    });

    const userResponse = await docClient.send(userCommand);
    if (userResponse.Items) {
      templates.push(...(userResponse.Items as PptxTemplate[]));
    }
  }

  // Query public templates if requested
  if (includePublic && templates.length < limit) {
    const publicCommand = new QueryCommand({
      TableName: getPptxTemplatesTableName(tenantId),
      IndexName: 'PublicIndex',
      KeyConditionExpression: 'isPublic = :isPublic',
      ExpressionAttributeValues: {
        ':isPublic': 'true',
      },
      Limit: limit - templates.length,
    });

    const publicResponse = await docClient.send(publicCommand);
    if (publicResponse.Items) {
      templates.push(...(publicResponse.Items as PptxTemplate[]));
    }
  }

  // Apply offset and sort by creation date
  return templates
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(offset, offset + limit);
}

export async function deleteTemplateById(
  event: APIGatewayProxyEvent,
  templateId: string
): Promise<void> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);

  const command = new DeleteCommand({
    TableName: getPptxTemplatesTableName(tenantId),
    Key: {
      templateId,
    },
  });

  await docClient.send(command);
  console.log(`Deleted PPTX template: ${templateId} for tenant: ${tenantId}`);
}

// Generation Operations
export async function createGeneration(
  event: APIGatewayProxyEvent,
  generationId: string,
  userId: string,
  chatId: string | undefined,
  templateId: string | undefined,
  instructions: string,
  slideCount?: number,
  includeTitleSlide: boolean = true,
  includeSummarySlide: boolean = false,
  modelId?: string
): Promise<PptxGeneration> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);
  const now = new Date().toISOString();
  const ttl = Math.floor(
    (new Date().getTime() + 7 * 24 * 60 * 60 * 1000) / 1000
  ); // 7 days TTL

  const item: PptxGeneration = {
    generationId,
    userId,
    tenantId,
    chatId,
    templateId,
    instructions,
    slideCount,
    includeTitleSlide,
    includeSummarySlide,
    modelId,
    status: 'generating',
    createdAt: now,
    updatedAt: now,
    ttl,
  };

  const command = new PutCommand({
    TableName: getPptxGenerationsTableName(tenantId),
    Item: item,
  });

  await docClient.send(command);
  console.log(
    `Created PPTX generation: ${generationId} for tenant: ${tenantId}`
  );
  return item;
}

export async function findGenerationById(
  event: APIGatewayProxyEvent,
  generationId: string
): Promise<PptxGeneration | null> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);

  const command = new QueryCommand({
    TableName: getPptxGenerationsTableName(tenantId),
    KeyConditionExpression: 'generationId = :generationId',
    ExpressionAttributeValues: {
      ':generationId': generationId,
    },
  });

  const response = await docClient.send(command);
  const items = response.Items;

  if (!items || items.length === 0) {
    return null;
  }

  return items[0] as PptxGeneration;
}

export async function findGenerationsByUser(
  event: APIGatewayProxyEvent,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PptxGeneration[]> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);

  const command = new QueryCommand({
    TableName: getPptxGenerationsTableName(tenantId),
    IndexName: 'UserGenerationsIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Sort by createdAt DESC
    Limit: limit + offset,
  });

  const response = await docClient.send(command);
  const items = response.Items || [];

  return items.slice(offset, offset + limit) as PptxGeneration[];
}

export async function updateGenerationStatus(
  event: APIGatewayProxyEvent,
  generationId: string,
  userId: string,
  status: 'generating' | 'completed' | 'failed',
  s3OutputKey?: string,
  errorMessage?: string,
  slides?: any[]
): Promise<void> {
  const tenantId = getTenantId(event);
  const docClient = await getTenantDynamoDBDocument(event);

  let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
  };

  if (s3OutputKey) {
    updateExpression += ', s3OutputKey = :s3OutputKey';
    expressionAttributeValues[':s3OutputKey'] = s3OutputKey;
  }

  if (errorMessage) {
    updateExpression += ', errorMessage = :errorMessage';
    expressionAttributeValues[':errorMessage'] = errorMessage;
  }

  if (slides) {
    updateExpression += ', slides = :slides';
    expressionAttributeValues[':slides'] = slides;
  }

  const command = new UpdateCommand({
    TableName: getPptxGenerationsTableName(tenantId),
    Key: {
      generationId,
      userId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  await docClient.send(command);
  console.log(
    `Updated generation status: ${generationId} -> ${status} for tenant: ${tenantId}`
  );
}
