const {
  DynamoDBClient,
  UpdateItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { fromTemporaryCredentials } = require('@aws-sdk/credential-providers');

const TENANTS_TABLE_NAME = process.env.TENANTS_TABLE_NAME;
const CONTROL_PLANE_REGION = process.env.CONTROL_PLANE_REGION;
const CONTROL_PLANE_ACCOUNT = process.env.CONTROL_PLANE_ACCOUNT;
const CONTROL_PLANE_ROLE_ARN = process.env.CONTROL_PLANE_ROLE_ARN;
const DEFAULT_OPENSEARCH_INDEX =
  process.env.DEFAULT_OPENSEARCH_INDEX || 'assistant-docs';

// Create DynamoDB client with cross-account credentials if needed
const createDynamoClient = () => {
  const config = { region: CONTROL_PLANE_REGION };

  // If a control plane role ARN is provided, assume that role for cross-account access
  if (CONTROL_PLANE_ROLE_ARN) {
    config.credentials = fromTemporaryCredentials({
      params: {
        RoleArn: CONTROL_PLANE_ROLE_ARN,
        RoleSessionName: 'OpenSearchTenantUpdater',
        ExternalId: 'opensearch-tenant-updater',
      },
    });
  }

  return new DynamoDBClient(config);
};

const dynamoClient = createDynamoClient();

const updateStatus = async (event, status, reason, physicalResourceId) => {
  const body = JSON.stringify({
    Status: status,
    Reason: reason,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: {},
  });

  const res = await fetch(event.ResponseURL, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': '',
      'Content-Length': body.length.toString(),
    },
  });

  // For recording failures
  console.log(res);
  console.log(await res.text());
};

exports.handler = async (event, context) => {
  // For recording failures
  console.log(
    'OpenSearch Tenant Updater - Event:',
    JSON.stringify(event, null, 2)
  );

  const props = event.ResourceProperties;
  const tenantId = props.tenantId;
  const openSearchDomainArn = props.openSearchDomainArn;
  const openSearchEndpoint = props.openSearchEndpoint;
  const openSearchIndexName =
    props.openSearchIndexName || DEFAULT_OPENSEARCH_INDEX;

  // Physical resource ID for this custom resource
  const physicalResourceId = `opensearch-tenant-${tenantId}`;

  try {
    // Validate environment variables
    if (!TENANTS_TABLE_NAME) {
      throw new Error('TENANTS_TABLE_NAME environment variable is not set');
    }

    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        // Validate required properties
        if (!tenantId) {
          throw new Error('tenantId is required');
        }
        if (!openSearchDomainArn) {
          throw new Error('openSearchDomainArn is required');
        }
        if (!openSearchEndpoint) {
          throw new Error('openSearchEndpoint is required');
        }
        if (!openSearchEndpoint.startsWith('https://')) {
          throw new Error('openSearchEndpoint must start with https://');
        }

        console.log(
          `Updating tenant ${tenantId} with OpenSearch configuration:`,
          {
            openSearchDomainArn,
            openSearchEndpoint,
            openSearchIndexName,
          }
        );

        const now = new Date().toISOString();

        // Update the tenant record with OpenSearch information
        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: TENANTS_TABLE_NAME,
            Key: marshall({ tenantId }),
            UpdateExpression:
              'SET #openSearchDomainArn = :openSearchDomainArn, #openSearchEndpoint = :openSearchEndpoint, #openSearchIndexName = :openSearchIndexName, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
              '#openSearchDomainArn': 'openSearchDomainArn',
              '#openSearchEndpoint': 'openSearchEndpoint',
              '#openSearchIndexName': 'openSearchIndexName',
              '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: marshall({
              ':openSearchDomainArn': openSearchDomainArn,
              ':openSearchEndpoint': openSearchEndpoint,
              ':openSearchIndexName': openSearchIndexName,
              ':updatedAt': now,
            }),
          })
        );

        console.log(
          `Successfully updated tenant ${tenantId} with OpenSearch configuration`
        );

        await updateStatus(
          event,
          'SUCCESS',
          `Successfully updated tenant ${tenantId} with OpenSearch configuration`,
          physicalResourceId
        );
        break;

      case 'Delete':
        // Remove OpenSearch fields from tenant record
        console.log(
          `Removing OpenSearch configuration from tenant ${tenantId}`
        );

        const deleteNow = new Date().toISOString();

        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: TENANTS_TABLE_NAME,
            Key: marshall({ tenantId }),
            UpdateExpression:
              'SET #updatedAt = :updatedAt REMOVE #openSearchDomainArn, #openSearchEndpoint, #openSearchIndexName',
            ExpressionAttributeNames: {
              '#openSearchDomainArn': 'openSearchDomainArn',
              '#openSearchEndpoint': 'openSearchEndpoint',
              '#openSearchIndexName': 'openSearchIndexName',
              '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: marshall({
              ':updatedAt': deleteNow,
            }),
          })
        );

        console.log(
          `Successfully removed OpenSearch configuration from tenant ${tenantId}`
        );

        await updateStatus(
          event,
          'SUCCESS',
          `Successfully removed OpenSearch configuration from tenant ${tenantId}`,
          physicalResourceId
        );
        break;

      default:
        throw new Error(`Unsupported request type: ${event.RequestType}`);
    }
  } catch (e) {
    console.error('---- Error');
    console.error(e);

    await updateStatus(
      event,
      'FAILED',
      e.message || 'Unknown error',
      physicalResourceId
    );
  }
};
