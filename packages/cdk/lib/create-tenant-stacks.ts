import * as cdk from 'aws-cdk-lib';
import { TenantDynamoDBStack } from './stacks/tenant/tenant-dynamodb-stack';

export interface TenantStackInput {
  account?: string;
  region: string;
  tenantId: string;
  environment: string;
}

export const createTenantStacks = (app: cdk.App, params: TenantStackInput) => {
  // Tenant DynamoDB Stack
  const tenantDynamoDBStack = new TenantDynamoDBStack(
    app,
    `TenantDynamoDBStack${params.environment}-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      tenantId: params.tenantId,
      environment: params.environment,
    }
  );

  return {
    tenantDynamoDBStack,
  };
};
