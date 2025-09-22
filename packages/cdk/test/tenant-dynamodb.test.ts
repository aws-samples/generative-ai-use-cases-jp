import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TenantDynamoDB } from '../lib/construct/tenant-dynamodb';
import { TenantDynamoDBStack } from '../lib/stacks/tenant/tenant-dynamodb-stack';

describe('TenantDynamoDB Tests', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  describe('TenantDynamoDB Construct', () => {
    test('Should create tenant-specific DynamoDB tables', () => {
      // Arrange
      const tenantId = 'test-tenant-123';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment: 'dev',
      });

      // Assert
      const template = Template.fromStack(stack);

      // Check ChatHistory table
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-dev-tenant-test-tenant-123',
        BillingMode: 'PAY_PER_REQUEST',
      });

      // Check TokenUsageStats table
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TokenUsageStats-dev-tenant-test-tenant-123',
        BillingMode: 'PAY_PER_REQUEST',
      });

      // Check UseCaseBuilder table
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'UseCaseBuilder-dev-tenant-test-tenant-123',
        BillingMode: 'PAY_PER_REQUEST',
      });

      // Check that all three tables are created
      const resources = template.toJSON().Resources;
      const tables = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::DynamoDB::Table'
      );
      expect(tables.length).toBe(3);
    });

    test('Should sanitize tenant ID for resource names', () => {
      // Arrange
      const tenantId = 'test@tenant#123';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment: 'dev',
      });

      // Assert
      const template = Template.fromStack(stack);

      // Check that special characters are replaced with hyphens
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-dev-tenant-test-tenant-123',
      });
    });

    test('Should throw error if tenant ID is empty', () => {
      // Arrange & Act & Assert
      expect(() => {
        new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
          tenantId: '',
          environment: 'dev',
        });
      }).toThrow('Tenant ID is required');
    });

    test('Should create Use Case Builder table with correct schema', () => {
      // Arrange
      const tenantId = 'test-tenant-usecase';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment: 'dev',
      });

      // Assert
      const template = Template.fromStack(stack);

      // Check Use Case Builder table structure
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'UseCaseBuilder-dev-tenant-test-tenant-usecase',
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'dataType', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'dataType', AttributeType: 'S' },
          { AttributeName: 'useCaseId', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'UseCaseIdIndexName',
            KeySchema: [
              { AttributeName: 'useCaseId', KeyType: 'HASH' },
              { AttributeName: 'dataType', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      });
    });

    test('Should support custom table base names', () => {
      // Arrange
      const tenantId = 'test-tenant-custom';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment: 'dev',
        chatHistoryTableBaseName: 'CustomChat',
        tokenUsageStatsTableBaseName: 'CustomStats',
        useCaseBuilderTableBaseName: 'CustomUseCase',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'CustomChat-dev-tenant-test-tenant-custom',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'CustomStats-dev-tenant-test-tenant-custom',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'CustomUseCase-dev-tenant-test-tenant-custom',
      });
    });

    test('Should create tables with environment in name', () => {
      // Arrange
      const tenantId = 'test-tenant-env';
      const environment = 'prod';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-prod-tenant-test-tenant-env',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TokenUsageStats-prod-tenant-test-tenant-env',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'UseCaseBuilder-prod-tenant-test-tenant-env',
      });
    });

    test('Should set deletion protection based on environment', () => {
      // Arrange
      const tenantId = 'test-tenant-prod';
      const environment = 'prod';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment,
      });

      // Assert
      const template = Template.fromStack(stack);

      // For production, tables should have RETAIN policy
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-prod-tenant-test-tenant-prod',
      });

      // Check that DeletionPolicy is set to Retain at the resource level
      const resources = template.toJSON().Resources;
      const tables = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::DynamoDB::Table'
      );
      const chatHistoryTable = tables.find(
        (t: any) =>
          t.Properties.TableName === 'ChatHistory-prod-tenant-test-tenant-prod'
      ) as any;
      expect(chatHistoryTable?.DeletionPolicy).toBe('Retain');
    });

    test('Should allow deletion for dev environment', () => {
      // Arrange
      const tenantId = 'test-tenant-dev';
      const environment = 'dev';

      // Act
      new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment,
      });

      // Assert
      const template = Template.fromStack(stack);

      // For dev, tables should have DELETE policy (or no explicit policy)
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-dev-tenant-test-tenant-dev',
      });

      // Check that there's no RETAIN policy (should default to DELETE for dev)
      const resources = template.toJSON().Resources;
      const tables = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::DynamoDB::Table'
      );
      const chatHistoryTable = tables.find(
        (t: any) =>
          t.Properties.TableName === 'ChatHistory-dev-tenant-test-tenant-dev'
      ) as any;
      expect(chatHistoryTable?.DeletionPolicy).not.toBe('Retain');
    });
  });

  describe('TenantDynamoDBStack', () => {
    test('Should create stack with direct tenant ID', () => {
      // Arrange & Act
      const tenantStack = new TenantDynamoDBStack(app, 'TenantStack', {
        tenantId: 'test-tenant-456',
        environment: 'dev',
      });

      // Assert
      const template = Template.fromStack(tenantStack);

      // Check tables are created
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-dev-tenant-test-tenant-456',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TokenUsageStats-dev-tenant-test-tenant-456',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'UseCaseBuilder-dev-tenant-test-tenant-456',
      });

      // Check outputs
      template.hasOutput('StackChatHistoryTableName', {});
      template.hasOutput('StackTokenUsageStatsTableName', {});
      template.hasOutput('StackUseCaseBuilderTableName', {});
    });

    test('Should create stack with parameter when tenant ID not provided', () => {
      // Arrange & Act
      const tenantStack = new TenantDynamoDBStack(app, 'TenantStack', {
        environment: 'dev',
      });

      // Assert
      const template = Template.fromStack(tenantStack);

      // Check parameter is created
      template.hasParameter('TenantId', {
        Type: 'String',
        Description: 'The tenant identifier for the DynamoDB tables',
        AllowedPattern: '^[a-zA-Z0-9-]+$',
      });
    });

    test('Should create stack with environment parameter', () => {
      // Arrange & Act
      const tenantStack = new TenantDynamoDBStack(app, 'TenantStack', {
        tenantId: 'test-tenant-123',
        environment: 'staging',
      });

      // Assert
      const template = Template.fromStack(tenantStack);

      // Check tables are created with staging environment
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'ChatHistory-staging-tenant-test-tenant-123',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TokenUsageStats-staging-tenant-test-tenant-123',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'UseCaseBuilder-staging-tenant-test-tenant-123',
      });
    });
  });

  describe('TenantDynamoDB Helper Methods', () => {
    test('Should generate correct table name', () => {
      // Arrange & Act
      const tableName = TenantDynamoDB.generateTableName(
        'MyTable',
        'tenant-123',
        'dev'
      );

      // Assert
      expect(tableName).toBe('MyTable-dev-tenant-tenant-123');
    });

    test('Should create additional tenant table', () => {
      // Arrange
      const tenantId = 'test-tenant-789';
      const tenantDynamoDB = new TenantDynamoDB(stack, 'TestTenantDynamoDB', {
        tenantId,
        environment: 'dev',
      });

      // Act
      tenantDynamoDB.createTenantTable(
        'CustomTable',
        'CustomData',
        { name: 'pk', type: 'S' as any },
        { name: 'sk', type: 'S' as any }
      );

      // Assert
      const template = Template.fromStack(stack);

      // Check custom table is created
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'CustomData-dev-tenant-test-tenant-789',
      });
    });
  });
});
