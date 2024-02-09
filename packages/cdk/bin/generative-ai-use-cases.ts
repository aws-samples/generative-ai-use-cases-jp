#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from '../lib/generative-ai-use-cases-stack';
import { CloudFrontWafStack } from '../lib/cloud-front-waf-stack';
import { DashboardStack } from '../lib/dashboard-stack';
import { SearchAgentStack } from '../lib/search-agent-stack';

class DeletionPolicySetter implements cdk.IAspect {
  constructor(private readonly policy: cdk.RemovalPolicy) {}

  visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(this.policy);
    }
  }
}

const app = new cdk.App();

const allowedIpV4AddressRanges: string[] | null = app.node.tryGetContext(
  'allowedIpV4AddressRanges'
)!;
const allowedIpV6AddressRanges: string[] | null = app.node.tryGetContext(
  'allowedIpV6AddressRanges'
)!;
const allowedCountryCodes: string[] | null = app.node.tryGetContext(
  'allowedCountryCodes'
)!;

let cloudFrontWafStack: CloudFrontWafStack | undefined;

// IP アドレス範囲(v4もしくはv6のいずれか)か地理的制限が定義されている場合のみ、CloudFrontWafStack をデプロイする
if (
  allowedIpV4AddressRanges ||
  allowedIpV6AddressRanges ||
  allowedCountryCodes
) {
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  cloudFrontWafStack = new CloudFrontWafStack(app, 'CloudFrontWafStack', {
    env: {
      region: 'us-east-1',
    },
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
  });
}

const anonymousUsageTracking: boolean = !!app.node.tryGetContext(
  'anonymousUsageTracking'
);

const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
  app,
  'GenerativeAiUseCasesStack',
  {
    env: {
      region: process.env.CDK_DEFAULT_REGION,
    },
    webAclId: cloudFrontWafStack
      ? cloudFrontWafStack.webAclArn.value
      : undefined,
    crossRegionReferences: true,
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
    description: anonymousUsageTracking
      ? 'Generative AI Use Cases JP (uksb-1tupboc48)'
      : undefined,
  }
);

cdk.Aspects.of(generativeAiUseCasesStack).add(
  new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
);

// Agent

const searchAgentEnabled =
  app.node.tryGetContext('searchAgentEnabled') || false;
const agentRegion = app.node.tryGetContext('agentRegion') || 'us-east-1';

if (searchAgentEnabled) {
  new SearchAgentStack(app, 'WebSearchAgentStack', {
    env: {
      region: agentRegion,
    },
  });
}

const modelRegion: string = app.node.tryGetContext('modelRegion')!;
const dashboard: boolean = app.node.tryGetContext('dashboard')!;

if (dashboard) {
  new DashboardStack(app, 'GenerativeAiUseCasesDashboardStack', {
    env: {
      region: modelRegion,
    },
    userPool: generativeAiUseCasesStack.userPool,
    userPoolClient: generativeAiUseCasesStack.userPoolClient,
    appRegion: process.env.CDK_DEFAULT_REGION!,
    crossRegionReferences: true,
  });
}
