/**
 * Assistant API Construct
 * Provides endpoints for assistant management and message operations
 *
 * Similar to CentralPptxApi, this uses wildcard IAM permissions to access
 * tenant-specific S3 buckets dynamically based on tenant context.
 */

import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration, Stack } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

export interface AssistantApiProps extends GenericApiProps {
  readonly assistantTable: Table;
  readonly assistantMessagesTable: Table;
  readonly assistantIdIndexName: string;
}

class AssistantApi extends Construct {
  constructor(scope: Construct, id: string, props: AssistantApiProps) {
    super(scope, id);

    const {
      api,
      commonAuthorizerProps,
      assistantTable,
      assistantMessagesTable,
      assistantIdIndexName,
      tenantManager,
      bedrockPolicy,
      environment,
    } = props;

    // Create Lambda function for assistant CRUD operations
    const assistantHandler = new NodejsFunction(this, 'AssistantHandler', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/assistant/assistantHandler.ts',
      timeout: Duration.seconds(10),
      memorySize: 1024,
      environment: getBaseEnvironment(this, props, {
        ASSISTANT_TABLE_NAME: assistantTable.tableName,
        ASSISTANT_MESSAGES_TABLE_NAME: assistantMessagesTable.tableName,
        ASSISTANT_ID_INDEX_NAME: assistantIdIndexName,
      }),
    });

    // Grant DynamoDB permissions
    assistantTable.grantReadWriteData(assistantHandler);
    assistantMessagesTable.grantReadWriteData(assistantHandler);

    // Create common S3 policy for assistant file access
    const s3ReadPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: [
        `arn:aws:s3:::assistant-files-${environment}-tenant-*`,
        `arn:aws:s3:::assistant-files-${environment}-tenant-*/*`,
      ],
    });

    // Grant S3 permissions
    assistantHandler.addToRolePolicy(s3ReadPolicy);

    // Grant tenant table access
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(assistantHandler);
    }

    // Create Lambda function for message operations
    const assistantMessageHandler = new NodejsFunction(
      this,
      'AssistantMessageHandler',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/assistant/assistantMessageHandler.ts',
        timeout: Duration.seconds(30), // Longer timeout for RAG processing
        memorySize: 1024,
        environment: getBaseEnvironment(this, props, {
          ASSISTANT_TABLE_NAME: assistantTable.tableName,
          ASSISTANT_MESSAGES_TABLE_NAME: assistantMessagesTable.tableName,
          ASSISTANT_ID_INDEX_NAME: assistantIdIndexName,
        }),
      }
    );

    // Grant DynamoDB permissions
    assistantTable.grantReadData(assistantMessageHandler);
    assistantMessagesTable.grantReadWriteData(assistantMessageHandler);

    // Grant S3 permissions
    assistantMessageHandler.addToRolePolicy(s3ReadPolicy);

    // Grant Bedrock permissions for message generation
    if (bedrockPolicy) {
      assistantMessageHandler.addToRolePolicy(bedrockPolicy);
    }

    // Grant OpenSearch permissions for RAG (wildcard for all tenant domains)
    // TODO Phase 2: Restrict to specific tenant OpenSearch domains
    assistantMessageHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'es:ESHttpGet',
          'es:ESHttpPost',
          'es:ESHttpPut',
          'es:ESHttpDelete',
        ],
        resources: [
          `arn:aws:es:${Stack.of(this).region}:${Stack.of(this).account}:domain/*`,
        ],
      })
    );

    // Grant tenant table access
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(assistantMessageHandler);
    }

    // Create Lambda function for file upload URL generation
    const assistantFileUploadHandler = new NodejsFunction(
      this,
      'AssistantFileUploadHandler',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/assistant/assistantFileUpload.ts',
        timeout: Duration.seconds(10),
        memorySize: 1024,
        environment: getBaseEnvironment(this, props, {
          ASSISTANT_TABLE_NAME: assistantTable.tableName,
        }),
      }
    );

    // Create S3 write policy for file uploads
    const s3WritePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        `arn:aws:s3:::assistant-files-${environment}-tenant-*`,
        `arn:aws:s3:::assistant-files-${environment}-tenant-*/*`,
      ],
    });

    // Grant S3 permissions
    assistantFileUploadHandler.addToRolePolicy(s3WritePolicy);

    // Grant tenant table access
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(assistantFileUploadHandler);
    }

    // API: /assistant
    const assistantResource = api.root.addResource('assistant');

    // POST: /assistant - Create assistant
    assistantResource.addMethod(
      'POST',
      new LambdaIntegration(assistantHandler),
      commonAuthorizerProps
    );

    // GET: /assistant - List assistants
    assistantResource.addMethod(
      'GET',
      new LambdaIntegration(assistantHandler),
      commonAuthorizerProps
    );

    // API: /assistant/{assistantId}
    const assistantIdResource = assistantResource.addResource('{assistantId}');

    // GET: /assistant/{assistantId} - Get assistant
    assistantIdResource.addMethod(
      'GET',
      new LambdaIntegration(assistantHandler),
      commonAuthorizerProps
    );

    // PUT: /assistant/{assistantId} - Update assistant
    assistantIdResource.addMethod(
      'PUT',
      new LambdaIntegration(assistantHandler),
      commonAuthorizerProps
    );

    // DELETE: /assistant/{assistantId} - Delete assistant
    assistantIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(assistantHandler),
      commonAuthorizerProps
    );

    // API: /assistant/{assistantId}/messages
    const messagesResource = assistantIdResource.addResource('messages');

    // POST: /assistant/{assistantId}/messages - Create message
    messagesResource.addMethod(
      'POST',
      new LambdaIntegration(assistantMessageHandler),
      commonAuthorizerProps
    );

    // GET: /assistant/{assistantId}/messages - List messages
    messagesResource.addMethod(
      'GET',
      new LambdaIntegration(assistantMessageHandler),
      commonAuthorizerProps
    );

    // API: /assistant/upload-url
    const uploadUrlResource = assistantResource.addResource('upload-url');

    // POST: /assistant/upload-url - Request pre-signed URL
    uploadUrlResource.addMethod(
      'POST',
      new LambdaIntegration(assistantFileUploadHandler),
      commonAuthorizerProps
    );
  }
}

export default AssistantApi;
