import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TenantS3 } from '../lib/construct/tenant-s3';
import { TenantS3Stack } from '../lib/stacks/tenant/tenant-s3-stack';

describe('TenantS3 Tests', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
  });

  describe('TenantS3 Construct', () => {
    test('Should create tenant-specific S3 buckets', () => {
      // Arrange
      const tenantId = 'test-tenant-123';

      // Act
      new TenantS3(stack, 'TestTenantS3', {
        tenantId,
        environment: 'dev',
        removalPolicy: true, // DESTROY for testing
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Check that three buckets are created
      const resources = template.toJSON().Resources;
      const buckets = Object.values(resources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      expect(buckets.length).toBe(3);

      // Check bucket properties
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('Should generate unique bucket names within 63 character limit', () => {
      // Arrange
      const tenantId = 'test-tenant-short';

      // Act
      const tenantS3 = new TenantS3(stack, 'TestTenantS3', {
        tenantId,
        environment: 'dev',
        removalPolicy: true,
      });

      // Assert
      expect(tenantS3.documentsBucketName.length).toBeLessThanOrEqual(63);
      expect(tenantS3.chatBucketName.length).toBeLessThanOrEqual(63);
      expect(tenantS3.analyticsBucketName.length).toBeLessThanOrEqual(63);

      // Check that names follow the expected pattern
      expect(tenantS3.documentsBucketName).toMatch(/^docs-dev-tenant-test-tenant-short-[a-f0-9]+$/);
      expect(tenantS3.chatBucketName).toMatch(/^chat-dev-tenant-test-tenant-short-[a-f0-9]+$/);
      expect(tenantS3.analyticsBucketName).toMatch(/^analytics-dev-tenant-test-tenant-short-[a-f0-9]+$/);
    });

    test('Should sanitize tenant ID for resource names', () => {
      // Arrange
      const tenantId = 'test@tenant#123!';

      // Act
      const tenantS3 = new TenantS3(stack, 'TestTenantS3', {
        tenantId,
        environment: 'dev',
        removalPolicy: true,
      });

      // Assert
      // Check that special characters are replaced with hyphens and converted to lowercase
      expect(tenantS3.documentsBucketName).toMatch(/^docs-dev-tenant-test-tenant-123--[a-f0-9]+$/);
      expect(tenantS3.chatBucketName).toMatch(/^chat-dev-tenant-test-tenant-123--[a-f0-9]+$/);
      expect(tenantS3.analyticsBucketName).toMatch(/^analytics-dev-tenant-test-tenant-123--[a-f0-9]+$/);
    });

    test('Should throw error if tenant ID is empty', () => {
      // Arrange & Act & Assert
      expect(() => {
        new TenantS3(stack, 'TestTenantS3', {
          tenantId: '',
          environment: 'dev',
          removalPolicy: true,
        });
      }).toThrow('Tenant ID is required');
    });

    test('Should throw error if environment is empty', () => {
      // Arrange & Act & Assert
      expect(() => {
        new TenantS3(stack, 'TestTenantS3', {
          tenantId: 'test-tenant',
          environment: '',
          removalPolicy: true,
        });
      }).toThrow('Environment is required');
    });


    test('Should apply correct removal policy', () => {
      // Arrange
      const tenantId = 'test-tenant-retention';

      // Act - Test DESTROY policy
      new TenantS3(stack, 'TestTenantS3Destroy', {
        tenantId,
        environment: 'dev',
        removalPolicy: true,
      });

      // Act - Test RETAIN policy
      const retainStack = new Stack(app, 'RetainStack');
      new TenantS3(retainStack, 'TestTenantS3Retain', {
        tenantId,
        environment: 'prod',
        removalPolicy: false,
      });

      // Assert
      const destroyTemplate = Template.fromStack(stack);
      const retainTemplate = Template.fromStack(retainStack);
      
      // Check DESTROY policy - CDK uses UpdateReplacePolicy and DeletionPolicy
      const destroyResources = destroyTemplate.toJSON().Resources;
      const destroyBuckets = Object.values(destroyResources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      destroyBuckets.forEach((bucket: any) => {
        expect(bucket.UpdateReplacePolicy).toBe('Delete');
      });

      // Check RETAIN policy
      const retainResources = retainTemplate.toJSON().Resources;
      const retainBuckets = Object.values(retainResources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      retainBuckets.forEach((bucket: any) => {
        expect(bucket.UpdateReplacePolicy).toBe('Retain');
      });
    });

    test('Should add appropriate tags to buckets', () => {
      // Arrange
      const tenantId = 'test-tenant-tags';
      const environment = 'staging';

      // Act
      new TenantS3(stack, 'TestTenantS3', {
        tenantId,
        environment,
        removalPolicy: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Check that buckets have tags (order may vary)
      const resources = template.toJSON().Resources;
      const buckets = Object.values(resources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      
      buckets.forEach((bucket: any) => {
        const tags = bucket.Properties.Tags;
        expect(tags).toContainEqual({ Key: 'TenantId', Value: tenantId });
        expect(tags).toContainEqual({ Key: 'Environment', Value: environment });
        expect(tags).toContainEqual({ Key: 'Purpose', Value: 'TenantS3Storage' });
      });
    });


    test('Should use custom bucket base names', () => {
      // Arrange
      const tenantId = 'test-tenant-custom';

      // Act
      const tenantS3 = new TenantS3(stack, 'TestTenantS3', {
        tenantId,
        environment: 'dev',
        removalPolicy: true,
        documentsBucketBaseName: 'custom-docs',
        chatBucketBaseName: 'custom-chat',
        analyticsBucketBaseName: 'custom-analytics',
      });

      // Assert
      expect(tenantS3.documentsBucketName).toMatch(/^custom-docs-dev-tenant-test-tenant-custom-[a-f0-9]+$/);
      expect(tenantS3.chatBucketName).toMatch(/^custom-chat-dev-tenant-test-tenant-custom-[a-f0-9]+$/);
      expect(tenantS3.analyticsBucketName).toMatch(/^custom-analytics-dev-tenant-test-tenant-custom-[a-f0-9]+$/);
    });


    test('Should throw error for overly long names', () => {
      // Arrange
      const veryLongTenantId = 'this-is-a-very-long-tenant-id-that-might-cause-issues-with-bucket-naming';
      const longEnvironment = 'very-long-environment-name';

      // Act & Assert
      expect(() => {
        new TenantS3(stack, 'TestTenantS3', {
          tenantId: veryLongTenantId,
          environment: longEnvironment,
          removalPolicy: true,
          documentsBucketBaseName: 'very-long-bucket-base-name',
        });
      }).toThrow(/too long/);
    });
  });

  describe('TenantS3Stack', () => {
    test('Should create stack with all required outputs', () => {
      // Arrange
      const tenantId = 'stack-test-tenant';

      // Act
      const tenantS3Stack = new TenantS3Stack(app, 'TestTenantS3Stack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
        tenantId,
        environment: 'dev',
        removalPolicy: true,
      });

      // Assert
      const template = Template.fromStack(tenantS3Stack);
      
      // Check that all required outputs exist
      const outputs = template.toJSON().Outputs;
      const outputKeys = Object.keys(outputs);
      
      expect(outputKeys).toContain('StackDocumentsBucketArn');
      expect(outputKeys).toContain('StackDocumentsBucketName');
      expect(outputKeys).toContain('StackDocumentsBucketDomainName');
      expect(outputKeys).toContain('StackChatBucketArn');
      expect(outputKeys).toContain('StackChatBucketName');
      expect(outputKeys).toContain('StackChatBucketDomainName');
      expect(outputKeys).toContain('StackAnalyticsBucketArn');
      expect(outputKeys).toContain('StackAnalyticsBucketName');
      expect(outputKeys).toContain('StackAnalyticsBucketDomainName');

      // Check that three buckets are created
      const resources = template.toJSON().Resources;
      const buckets = Object.values(resources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      expect(buckets.length).toBe(3);
    });

    test('Should have proper stack tags', () => {
      // Arrange
      const tenantId = 'stack-test-tags';
      const environment = 'test';

      // Act
      const tenantS3Stack = new TenantS3Stack(app, 'TestTenantS3Stack', {
        tenantId,
        environment,
        removalPolicy: false,
      });

      // Assert - Check that tags are applied to the stack
      const template = Template.fromStack(tenantS3Stack);
      const resources = template.toJSON().Resources;
      
      // Check tags on buckets (stack tags are inherited)
      const buckets = Object.values(resources).filter((r: any) => r.Type === 'AWS::S3::Bucket');
      expect(buckets.length).toBeGreaterThan(0);
      
      buckets.forEach((bucket: any) => {
        const tags = bucket.Properties.Tags;
        expect(tags).toContainEqual({ Key: 'TenantId', Value: tenantId });
        expect(tags).toContainEqual({ Key: 'Environment', Value: environment });
        expect(tags).toContainEqual({ Key: 'Purpose', Value: 'TenantS3Storage' });
      });
    });

    test('Should support parameterized deployment', () => {
      // Act - Create stack without tenantId prop
      const tenantS3Stack = new TenantS3Stack(app, 'TestTenantS3StackParam', {
        environment: 'dev',
        removalPolicy: true,
      });

      // Assert
      const template = Template.fromStack(tenantS3Stack);
      
      // Check that TenantId parameter is created
      const parameters = template.toJSON().Parameters;
      expect(parameters.TenantId).toBeDefined();
      expect(parameters.TenantId.Type).toBe('String');
      expect(parameters.TenantId.AllowedPattern).toBe('^[a-zA-Z0-9-]+$');
    });

    test('Should provide getter methods for buckets', () => {
      // Arrange
      const tenantId = 'getter-test-tenant';

      // Act
      const tenantS3Stack = new TenantS3Stack(app, 'TestTenantS3Stack', {
        tenantId,
        environment: 'dev',
        removalPolicy: true,
      });

      // Assert
      expect(tenantS3Stack.getTenantS3()).toBeDefined();
      expect(tenantS3Stack.getDocumentsBucket()).toBeDefined();
      expect(tenantS3Stack.getChatBucket()).toBeDefined();
      expect(tenantS3Stack.getAnalyticsBucket()).toBeDefined();

      // Check that bucket names are stored correctly in the construct
      const tenantS3 = tenantS3Stack.getTenantS3();
      expect(tenantS3.documentsBucketName).toMatch(/^docs-dev-tenant-getter-test-tenant-[a-f0-9]+$/);
      expect(tenantS3.chatBucketName).toMatch(/^chat-dev-tenant-getter-test-tenant-[a-f0-9]+$/);
      expect(tenantS3.analyticsBucketName).toMatch(/^analytics-dev-tenant-getter-test-tenant-[a-f0-9]+$/);
    });
  });
});