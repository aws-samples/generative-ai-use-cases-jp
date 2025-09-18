import { Stack } from 'aws-cdk-lib';
import { DEFAULT_TENANT_ID } from '../../../consts';
import { TABLE_PREFIX } from './const';
import { GenericApiProps } from './props';
import { Construct } from 'constructs';

// Helper function to generate consistent environment variables for Lambda functions
export const getBaseEnvironment = (
  construct: Construct,
  props: GenericApiProps,
  additionalEnvVars: Record<string, string> = {}
) => ({
  TABLE_NAME: TABLE_PREFIX,
  DEFAULT_TABLE_NAME: props.table.tableName,
  DEFAULT_TENANT_ID: DEFAULT_TENANT_ID,
  ENVIRONMENT: props.environment || 'dev',
  IDENTITY_POOL_ID: props.idPool.identityPoolId,
  USER_POOL_ID: props.userPool.userPoolId,
  AWS_ACCOUNT_ID: Stack.of(construct).account!,
  ...(props.tenantManager
    ? {
        TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
      }
    : {}),
  ...additionalEnvVars,
});
