import * as cdk from 'aws-cdk-lib';
import { TenantDynamoDBStack } from './stacks/tenant/tenant-dynamodb-stack';
import { TenantS3Stack } from './stacks/tenant/tenant-s3-stack';
import { TenantIAMStack } from './stacks/tenant/tenant-iam-stack';
import { TenantBedrockChatStack } from './stacks/tenant/tenant-bedrock-chat-stack';
import { TenantPptxStack } from './stacks/tenant/tenant-pptx-stack';
import { TenantVpcStack } from './stacks/tenant/tenant-vpc-stack';
import { TenantOpenSearchStack } from './stacks/tenant/tenant-opensearch-stack';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkConfig {
  vpcCidr: string;
  maxAzs: number;
  natGateways: number;
}

export interface OpenSearchConfig {
  capacity: opensearch.CapacityConfig;
  ebsVolumeSize: number;
  ebsVolumeType: ec2.EbsDeviceVolumeType;
  availabilityZoneCount: number;
  automatedSnapshotStartHour: number;
}
export interface TenantStackInput {
  account?: string;
  region: string;
  tenantId: string;
  environment: string;
  removalPolicy: boolean;
  bedrockRegion?: string;
  enableBedrockChat?: boolean;
  pptxEnabled?: boolean;
  userPoolId?: string;
  identityPoolId?: string;
  userPoolClientId?: string;
  openSearchConfig: OpenSearchConfig;
  networkConfig: NetworkConfig;
}

export const createTenantStacks = (app: cdk.App, params: TenantStackInput) => {
  // Phase 1: Tenant IAM Stack (create first for role ARN export)
  // Note: UserPool and IdentityPool are imported via CloudFormation parameters
  const tenantIAMStack = new TenantIAMStack(
    app,
    `TenantIAMStack${params.environment}-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      tenantId: params.tenantId,
      environment: params.environment,
    }
  );

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

  // Tenant S3 Stack
  const tenantS3Stack = new TenantS3Stack(
    app,
    `TenantS3Stack${params.environment}-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      tenantId: params.tenantId,
      environment: params.environment,
      removalPolicy: params.removalPolicy,
    }
  );

  // Tenant VPC Stack (for networking infrastructure)
  const tenantVpcStack = new TenantVpcStack(
    app,
    `TenantVpcStack${params.environment}-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      tenantId: params.tenantId,
      environment: params.environment,
      vpcCidr: params.networkConfig.vpcCidr,
      maxAzs: params.networkConfig.maxAzs,
      natGateways: params.networkConfig.natGateways,
    }
  );

  // Tenant Managed OpenSearch Stack
  const tenantOpenSearchStack = new TenantOpenSearchStack(
    app,
    `TenantOpenSearchStack${params.environment}-${params.tenantId}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      tenantId: params.tenantId,
      environment: params.environment,
      vpc: tenantVpcStack.vpc,
      subnets: tenantVpcStack.privateSubnets,
      capacity: params.openSearchConfig.capacity,
      ebsVolumeSize: params.openSearchConfig.ebsVolumeSize,
      ebsVolumeType: params.openSearchConfig.ebsVolumeType,
      availabilityZoneCount: params.openSearchConfig.availabilityZoneCount,
      automatedSnapshotStartHour:
        params.openSearchConfig.automatedSnapshotStartHour,
      removalPolicy: params.removalPolicy
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    }
  );

  // Add dependency to ensure VPC is created before OpenSearch
  tenantOpenSearchStack.addDependency(tenantVpcStack);

  // Tenant Bedrock Chat Stack (optional)
  let tenantBedrockChatStack;
  if (params.enableBedrockChat) {
    tenantBedrockChatStack = new TenantBedrockChatStack(
      app,
      `TenantBedrockChatStack${params.environment}-${params.tenantId}`,
      {
        env: {
          account: params.account,
          region: params.region,
        },
        tenantId: params.tenantId,
        environment: params.environment,
        bedrockRegion: params.bedrockRegion || params.region,
        openSearchDomainEndpoint: tenantOpenSearchStack.domainEndpoint,
        openSearchDomainArn: tenantOpenSearchStack.domainArn,
        removalPolicy: params.removalPolicy
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      }
    );
    tenantBedrockChatStack.addDependency(tenantOpenSearchStack);
  }

  // Tenant PPTX Stack (optional)
  let tenantPptxStack;
  if (params.pptxEnabled) {
    tenantPptxStack = new TenantPptxStack(
      app,
      `TenantPptxStack${params.environment}-${params.tenantId}`,
      {
        env: {
          account: params.account,
          region: params.region,
        },
        tenantId: params.tenantId,
        environment: params.environment,
        removalPolicy: params.removalPolicy,
      }
    );
  }

  return {
    tenantIAMStack,
    tenantDynamoDBStack,
    tenantS3Stack,
    tenantVpcStack,
    tenantOpenSearchStack,
    tenantBedrockChatStack,
    tenantPptxStack,
  };
};
