#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from '../lib/generative-ai-use-cases-stack';
import { CommonWebAcl } from '../lib/construct/common-web-acl';

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

let commonWebAcl: CommonWebAcl | undefined;

// allowedIpV4AddressRanges または allowedIpV6AddressRanges が定義されている場合のみ、WafStack をデプロイする
if (allowedIpV4AddressRanges || allowedIpV6AddressRanges) {
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  commonWebAcl = new CommonWebAcl(app, 'CommonWebAcl', {
    env: {
      region: 'us-east-1',
    },
    scope: 'CLOUDFRONT',
    allowedIpV4AddressRanges,
    allowedIpV6AddressRanges,
  });
}

const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
  app,
  'GenerativeAiUseCasesStack',
  {
    env: {
      region: process.env.CDK_DEFAULT_REGION,
    },
    webAclId: commonWebAcl ? commonWebAcl.webAclArn.value : undefined,
    crossRegionReferences: true,
  }
);

cdk.Aspects.of(generativeAiUseCasesStack).add(
  new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
);