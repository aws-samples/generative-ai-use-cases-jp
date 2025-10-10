#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { createTenantStacks } from '../lib/create-tenant-stacks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const app = new cdk.App();

// EBS Volume Type mapping
const ebsVolumeTypeMap: { [key: string]: ec2.EbsDeviceVolumeType } = {
  GP3: ec2.EbsDeviceVolumeType.GP3,
  GP2: ec2.EbsDeviceVolumeType.GP2,
  IO1: ec2.EbsDeviceVolumeType.IO1,
  IO2: ec2.EbsDeviceVolumeType.IO2,
  STANDARD: ec2.EbsDeviceVolumeType.STANDARD,
  SC1: ec2.EbsDeviceVolumeType.SC1,
  ST1: ec2.EbsDeviceVolumeType.ST1,
};

// Read tenant configuration from cdk.tenant.json
interface TenantConfig {
  tenantId?: string;
  environment?: string;
  tenantRegion?: string;
  enableAutoDelete?: boolean;
  openSearchCapacity?: any; // Will be parsed as JSON string or object
  networkConfig?: {
    vpcCidr?: string;
    maxAzs?: number;
    natGateways?: number;
  };
  controlPlane?: {
    account: string;
    region: string;
    tenantsTableName: string;
    registrationLambdaArn?: string;
    registrationApiEndpoint?: string;
    registrationApiKey?: string;
    userPoolId: string;
    identityPoolId: string;
    userPoolClientId: string;
    controlPlaneLambdaRoleArn?: string;
  };
}

let tenantConfig: TenantConfig = {};
const tenantConfigPath = path.join(__dirname, '..', 'cdk.tenant.json');
if (fs.existsSync(tenantConfigPath)) {
  const configContent = fs.readFileSync(tenantConfigPath, 'utf-8');
  const config: { context?: TenantConfig } = JSON.parse(configContent);
  tenantConfig = config.context || {};
}

// Merge with any context passed via command line (command line takes precedence)
const context = {
  ...tenantConfig,
  ...app.node.getAllContext(),
};

// Set the merged context back to the app
Object.keys(tenantConfig).forEach((key) => {
  if (!(key in app.node.getAllContext())) {
    app.node.setContext(key, (tenantConfig as any)[key]);
  }
});

// Extract and set controlPlane properties as individual context values
if (tenantConfig.controlPlane) {
  const controlPlane = tenantConfig.controlPlane;

  // Set each controlPlane property as a top-level context value if not already set
  if (controlPlane.userPoolId && !app.node.getAllContext()['userPoolId']) {
    app.node.setContext('userPoolId', controlPlane.userPoolId);
  }
  if (
    controlPlane.identityPoolId &&
    !app.node.getAllContext()['identityPoolId']
  ) {
    app.node.setContext('identityPoolId', controlPlane.identityPoolId);
  }
  if (
    controlPlane.userPoolClientId &&
    !app.node.getAllContext()['userPoolClientId']
  ) {
    app.node.setContext('userPoolClientId', controlPlane.userPoolClientId);
  }
  if (
    controlPlane.tenantsTableName &&
    !app.node.getAllContext()['tenantsTableName']
  ) {
    app.node.setContext('tenantsTableName', controlPlane.tenantsTableName);
  }
  if (
    controlPlane.registrationLambdaArn &&
    !app.node.getAllContext()['registrationLambdaArn']
  ) {
    app.node.setContext(
      'registrationLambdaArn',
      controlPlane.registrationLambdaArn
    );
  }
  if (
    controlPlane.registrationApiEndpoint &&
    !app.node.getAllContext()['registrationApiEndpoint']
  ) {
    app.node.setContext(
      'registrationApiEndpoint',
      controlPlane.registrationApiEndpoint
    );
  }
  if (
    controlPlane.registrationApiKey &&
    !app.node.getAllContext()['registrationApiKey']
  ) {
    app.node.setContext('registrationApiKey', controlPlane.registrationApiKey);
  }
  if (
    controlPlane.controlPlaneLambdaRoleArn &&
    !app.node.getAllContext()['controlPlaneLambdaRoleArn']
  ) {
    app.node.setContext('controlPlaneLambdaRoleArn', controlPlane.controlPlaneLambdaRoleArn);
  }
}

const tenantId = context.tenantId;
if (!tenantId) {
  throw new Error(
    'tenantId must be provided via context (--context tenantId=<value> or in cdk.tenant.json)'
  );
}

const params = {
  account: context.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: context.tenantRegion || process.env.CDK_DEFAULT_REGION || 'us-east-1',
  tenantId: tenantId,
  environment: context.environment || 'dev',
  removalPolicy: context.enableAutoDelete || false, // Map enableAutoDelete to removalPolicy, default to RETAIN (false) if not specified
  userPoolId: context.controlPlane?.userPoolId!,
  identityPoolId: context.controlPlane?.identityPoolId!,
  userPoolClientId: context.controlPlane?.userPoolClientId!,
  pptxEnabled: context.pptxEnabled ?? false,
  enableBedrockChat: true, // Bedrock Chatスタックを有効化
  bedrockRegion:
    context.bedrockRegion ||
    context.tenantRegion ||
    process.env.CDK_DEFAULT_REGION ||
    'us-east-1',
  openSearchConfig: {
    capacity: context.openSearchConfig.capacity,
    ebsVolumeSize: context.openSearchConfig.ebsVolumeSize,
    ebsVolumeType:
      ebsVolumeTypeMap[context.openSearchConfig.ebsVolumeType] ||
      ec2.EbsDeviceVolumeType.GP3,
    availabilityZoneCount: context.openSearchConfig.availabilityZoneCount,
    automatedSnapshotStartHour:
      context.openSearchConfig.automatedSnapshotStartHour,
  },
  networkConfig: context.networkConfig,
};

createTenantStacks(app, params);
