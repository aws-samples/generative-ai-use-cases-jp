import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Environment variables
const TENANTS_TABLE_NAME = process.env.TENANTS_TABLE_NAME!;

// DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION! });

// Tenant status enum
enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROVISIONING = 'provisioning',
  ERROR = 'error',
}

// Request interface
interface TenantRegistrationRequest {
  tenantId: string;
  accountId: string;
  region: string;
  environment: string;
  roleArn?: string;
}

/**
 * API Gateway handler for tenant registration
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Registration request:', event.body);

  try {
    // Parse and validate request
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: TenantRegistrationRequest = JSON.parse(event.body);
    const { tenantId, accountId, region, environment, roleArn } = request;

    // Validate required fields
    if (!tenantId || !accountId || !region || !environment) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing required fields: tenantId, accountId, region, environment',
        }),
      };
    }

    // Create tenant record
    const now = new Date().toISOString();
    const tenant = {
      tenantId,
      status: TenantStatus.PROVISIONING,
      accountId,
      region,
      environment,
      roleArn,
      createdAt: now,
      updatedAt: now,
      metadata: {
        source: 'api-registration',
        registeredVia: 'tenant-stack',
      },
    };

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TENANTS_TABLE_NAME,
        Item: marshall(tenant),
        ConditionExpression: 'attribute_not_exists(tenantId)',
      })
    );

    console.log(`Successfully registered tenant: ${tenantId}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tenant registered successfully',
        tenantId,
        status: TenantStatus.PROVISIONING,
      }),
    };
  } catch (error) {
    console.error('Error registering tenant:', error);

    // Handle duplicate tenant
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Tenant already exists',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

