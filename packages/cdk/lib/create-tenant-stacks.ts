import * as cdk from 'aws-cdk-lib';
import { TenantIamRoleStack } from './stacks/tenant/tenant-iam-role-stack';

export interface TenantStackInput {
  account?: string;
  region: string;
  tenantId: string;
  identityProviderArn?: string;
  audience?: string;
  tenantIdClaim?: string;
  roleName?: string;
}

export const createTenantStacks = (app: cdk.App, params: TenantStackInput) => {
  // Tenant IAM Role Stack
  const tenantIamRoleStack = new TenantIamRoleStack(
    app,
    `TenantStack-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      identityProviderArn: params.identityProviderArn,
      audience: params.audience,
      tenantIdClaim: params.tenantIdClaim,
      roleName: params.roleName || `TenantRole-${params.tenantId}`,
    }
  );

  return {
    tenantIamRoleStack,
  };
};
