#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from '../lib/generative-ai-use-cases-stack';
import { WafStack } from '../lib/waf-stack';

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

let wafStack: WafStack | undefined;

// IP アドレス範囲(v4もしくはv6のいずれか)か地理的制限が定義されている場合のみ、WafStack をデプロイする
if (
  allowedIpV4AddressRanges ||
  allowedIpV6AddressRanges ||
  allowedCountryCodes
) {
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  wafStack = new WafStack(app, 'WafStack', {
    env: {
      region: 'us-east-1',
    },
    scope: 'CLOUDFRONT',
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
  });
}

const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
  app,
  'GenerativeAiUseCasesStack',
  {
    env: {
      region: process.env.CDK_DEFAULT_REGION,
    },
    webAclId: wafStack ? wafStack.webAclArn.value : undefined,
    crossRegionReferences: true,
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
    allowedCountryCodes,
  }
);

cdk.Aspects.of(generativeAiUseCasesStack).add(
  new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
);
