import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { TenantStatus } from './tenantManager';

// Environment variables
const TENANTS_TABLE_NAME = process.env.TENANTS_TABLE_NAME!;

// DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION! });

// Request interface
interface TenantRegistrationRequest {
  tenantId: string;
  accountId: string;
  region: string;
  environment: string;
  roleArn?: string;
  controlPlaneLambdaRoleArn?: string;
  openSearchDomainArn?: string;
  openSearchEndpoint?: string;
  openSearchIndexName?: string;
}

/**
 * API Gateway handler for tenant registration
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
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
    const {
      tenantId,
      accountId,
      region,
      environment,
      roleArn,
      controlPlaneLambdaRoleArn,
      openSearchDomainArn,
      openSearchEndpoint,
      openSearchIndexName,
    } = request;

    // Log request without sensitive data
    console.log('[INFO] Tenant registration request received', {
      tenantId,
      region,
      environment,
      hasOpenSearchConfig: !!(
        openSearchDomainArn ||
        openSearchEndpoint ||
        openSearchIndexName
      ),
    });

    // Validate required fields
    if (!tenantId || !accountId || !region || !environment) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error:
            'Missing required fields: tenantId, accountId, region, environment',
        }),
      };
    }

    // Validate OpenSearch configuration - all three fields must be provided together
    const hasOpenSearchConfig = !!(
      openSearchDomainArn?.trim() ||
      openSearchEndpoint?.trim() ||
      openSearchIndexName?.trim()
    );

    if (hasOpenSearchConfig) {
      // All three must be provided and non-empty
      if (
        !openSearchDomainArn?.trim() ||
        !openSearchEndpoint?.trim() ||
        !openSearchIndexName?.trim()
      ) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message:
              'All OpenSearch fields (domainArn, endpoint, indexName) must be provided together',
          }),
        };
      }

      // Validate endpoint is HTTPS and from amazonaws.com
      if (
        !openSearchEndpoint.startsWith('https://') ||
        !openSearchEndpoint.includes('.amazonaws.com')
      ) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message:
              'OpenSearch endpoint must be an HTTPS URL from amazonaws.com domain',
          }),
        };
      }

      // Validate that endpoint region matches ARN region
      const arnMatch = openSearchDomainArn.match(/arn:aws:es:([^:]+):/);
      const endpointMatch = openSearchEndpoint.match(
        /\.([^.]+)\.es\.amazonaws\.com/
      );

      if (arnMatch && endpointMatch && arnMatch[1] !== endpointMatch[1]) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'OpenSearch endpoint region must match domain ARN region',
          }),
        };
      }
    }

    // Create tenant record with default use case configuration
    const now = new Date().toISOString();
    const tenant: Record<string, any> = {
      tenantId,
      status: TenantStatus.PROVISIONING,
      accountId,
      region,
      environment,
      roleArn,
      controlPlaneLambdaRoleArn,
      createdAt: now,
      updatedAt: now,
      metadata: {
        source: 'api-registration',
        registeredVia: 'tenant-stack',
      },
      useCaseConfiguration: {
        hiddenUseCases: {}, // All use cases enabled by default
        updatedAt: now,
        updatedBy: 'system',
      },
    };

    // Add OpenSearch configuration if provided
    if (hasOpenSearchConfig) {
      tenant.openSearchDomainArn = openSearchDomainArn;
      tenant.openSearchEndpoint = openSearchEndpoint;
      tenant.openSearchIndexName = openSearchIndexName;
    }

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
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
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
