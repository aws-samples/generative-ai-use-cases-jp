import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from './generative-ai-use-cases-stack';
import { CloudFrontWafStack } from './cloud-front-waf-stack';
import { DashboardStack } from './dashboard-stack';
import { AgentStack } from './agent-stack';
import { RagKnowledgeBaseStack } from './rag-knowledge-base-stack';
import { GuardrailStack } from './guardrail-stack';
import { StackInput } from './stack-input';

class DeletionPolicySetter implements cdk.IAspect {
  constructor(private readonly policy: cdk.RemovalPolicy) {}

  visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(this.policy);
    }
  }
}

export const createStacks = (app: cdk.App, params: StackInput) => {
  // CloudFront WAF
  // IP アドレス範囲(v4もしくはv6のいずれか)か地理的制限が定義されている場合のみ、CloudFrontWafStack をデプロイする
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  const cloudFrontWafStack =
    params.allowedIpV4AddressRanges ||
    params.allowedIpV6AddressRanges ||
    params.allowedCountryCodes ||
    params.hostName
      ? new CloudFrontWafStack(app, `CloudFrontWafStack${params.env}`, {
          env: {
            account: params.account,
            region: 'us-east-1',
          },
          params: params,
          crossRegionReferences: true,
        })
      : null;

  // RAG Knowledge Base
  const ragKnowledgeBaseStack =
    params.ragKnowledgeBaseEnabled && !params.ragKnowledgeBaseId
      ? new RagKnowledgeBaseStack(app, `RagKnowledgeBaseStack${params.env}`, {
          env: {
            account: params.account,
            region: params.modelRegion,
          },
          params: params,
          crossRegionReferences: true,
        })
      : null;

  // Agent
  const agentStack = params.agentEnabled
    ? new AgentStack(app, `WebSearchAgentStack${params.env}`, {
        env: {
          account: params.account,
          region: params.modelRegion,
        },
        params: params,
        crossRegionReferences: true,
      })
    : null;

  // Guardrail
  const guardrail = params.guardrailEnabled
    ? new GuardrailStack(app, `GuardrailStack${params.env}`, {
        env: {
          account: params.account,
          region: params.modelRegion,
        },
        crossRegionReferences: true,
      })
    : null;

  // GenU Stack

  const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
    app,
    `GenerativeAiUseCasesStack${params.env}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      description: params.anonymousUsageTracking
        ? 'Generative AI Use Cases JP (uksb-1tupboc48)'
        : undefined,
      params: params,
      crossRegionReferences: true,
      // RAG Knowledge Base
      knowledgeBaseId: ragKnowledgeBaseStack?.knowledgeBaseId,
      knowledgeBaseDataSourceBucketName:
        ragKnowledgeBaseStack?.dataSourceBucketName,
      // Agent
      agents: agentStack?.agents,
      // Guardrail
      guardrailIdentifier: guardrail?.guardrailIdentifier,
      guardrailVersion: 'DRAFT',
      // WAF
      webAclId: cloudFrontWafStack?.webAclArn,
      // Custom Domain
      cert: cloudFrontWafStack?.cert,
    }
  );

  cdk.Aspects.of(generativeAiUseCasesStack).add(
    new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
  );

  const dashboardStack = params.dashboard
    ? new DashboardStack(
        app,
        `GenerativeAiUseCasesDashboardStack${params.env}`,
        {
          env: {
            account: params.account,
            region: params.modelRegion,
          },
          params: params,
          userPool: generativeAiUseCasesStack.userPool,
          userPoolClient: generativeAiUseCasesStack.userPoolClient,
          appRegion: params.region,
          crossRegionReferences: true,
        }
      )
    : null;

  return {
    cloudFrontWafStack,
    ragKnowledgeBaseStack,
    agentStack,
    guardrail,
    generativeAiUseCasesStack,
    dashboardStack,
  };
};
