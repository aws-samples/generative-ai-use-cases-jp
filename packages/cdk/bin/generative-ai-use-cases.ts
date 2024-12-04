#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from '../lib/generative-ai-use-cases-stack';
import { CloudFrontWafStack } from '../lib/cloud-front-waf-stack';
import { DashboardStack } from '../lib/dashboard-stack';
import { SearchAgentStack } from '../lib/search-agent-stack';
import { RagKnowledgeBaseStack } from '../lib/rag-knowledge-base-stack';
import { GuardrailStack } from '../lib/guardrail-stack';

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

// Props for custom domain name
const hostName = app.node.tryGetContext('hostName');
if (
  typeof hostName != 'undefined' &&
  typeof hostName != 'string' &&
  hostName != null
) {
  throw new Error('hostName must be a string');
}
const domainName = app.node.tryGetContext('domainName');
if (
  typeof domainName != 'undefined' &&
  typeof domainName != 'string' &&
  domainName != null
) {
  throw new Error('domainName must be a string');
}
const hostedZoneId = app.node.tryGetContext('hostedZoneId');
if (
  typeof hostedZoneId != 'undefined' &&
  typeof hostedZoneId != 'string' &&
  hostedZoneId != null
) {
  throw new Error('hostedZoneId must be a string');
}

// check hostName, domainName hostedZoneId are all set or none of them
if (
  !(
    (hostName && domainName && hostedZoneId) ||
    (!hostName && !domainName && !hostedZoneId)
  )
) {
  throw new Error(
    'hostName, domainName and hostedZoneId must be set or none of them'
  );
}

let cloudFrontWafStack: CloudFrontWafStack | undefined;

// IP アドレス範囲(v4もしくはv6のいずれか)か地理的制限が定義されている場合のみ、CloudFrontWafStack をデプロイする
if (
  allowedIpV4AddressRanges ||
  allowedIpV6AddressRanges ||
  allowedCountryCodes ||
  hostName
) {
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  cloudFrontWafStack = new CloudFrontWafStack(app, 'CloudFrontWafStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
    hostName,
    domainName,
    hostedZoneId,
    crossRegionReferences: true,
  });
}

const anonymousUsageTracking: boolean = !!app.node.tryGetContext(
  'anonymousUsageTracking'
);

const modelRegion: string = app.node.tryGetContext('modelRegion')!;

// RAG Knowledge Base

const ragKnowledgeBaseEnabled =
  app.node.tryGetContext('ragKnowledgeBaseEnabled') || false;
const ragKnowledgeBaseStack = ragKnowledgeBaseEnabled
  ? new RagKnowledgeBaseStack(app, 'RagKnowledgeBaseStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: modelRegion,
      },
      crossRegionReferences: true,
    })
  : null;

// Agent

const searchAgentEnabled =
  app.node.tryGetContext('searchAgentEnabled') || false;
const agentRegion = app.node.tryGetContext('agentRegion') || 'us-east-1';
const searchAgentStack = searchAgentEnabled
  ? new SearchAgentStack(app, 'WebSearchAgentStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: agentRegion,
      },
      crossRegionReferences: true,
    })
  : null;

const guardrailEnabled: boolean =
  app.node.tryGetContext('guardrailEnabled') || false;
const guardrail = guardrailEnabled
  ? new GuardrailStack(app, 'GuardrailStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: modelRegion,
      },
      crossRegionReferences: true,
    })
  : null;

// GenU Stack

const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
  app,
  'GenerativeAiUseCasesStack',
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    webAclId: cloudFrontWafStack?.webAclArn,
    crossRegionReferences: true,
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
    description: anonymousUsageTracking
      ? 'Generative AI Use Cases JP (uksb-1tupboc48)'
      : undefined,
    cert: cloudFrontWafStack?.cert,
    hostName,
    domainName,
    hostedZoneId,
    agents: searchAgentStack?.agents,
    knowledgeBaseId: ragKnowledgeBaseStack?.knowledgeBaseId,
    knowledgeBaseDataSourceBucketName:
      ragKnowledgeBaseStack?.dataSourceBucketName,
    guardrailIdentifier: guardrail?.guardrailIdentifier,
    guardrailVersion: 'DRAFT',
  }
);

cdk.Aspects.of(generativeAiUseCasesStack).add(
  new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
);

const dashboard: boolean = app.node.tryGetContext('dashboard')!;

if (dashboard) {
  new DashboardStack(app, 'GenerativeAiUseCasesDashboardStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: modelRegion,
    },
    userPool: generativeAiUseCasesStack.userPool,
    userPoolClient: generativeAiUseCasesStack.userPoolClient,
    appRegion: process.env.CDK_DEFAULT_REGION!,
    crossRegionReferences: true,
  });
}
