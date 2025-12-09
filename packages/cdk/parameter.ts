/* eslint-disable i18nhelper/no-jp-string */
import * as cdk from 'aws-cdk-lib';
import {
  StackInput,
  stackInputSchema,
  ProcessedStackInput,
} from './lib/stack-input';
import { ModelConfiguration } from 'generative-ai-use-cases';
import { loadBrandingConfig } from './branding';

// Get parameters from CDK Context
const getContext = (app: cdk.App): StackInput => {
  const params = stackInputSchema.parse(app.node.getAllContext());
  return params;
};

// If you want to define parameters directly
const envs: Record<string, Partial<StackInput>> = {
  // If you want to define an anonymous environment, uncomment the following and the content of cdk.json will be ignored.
  // If you want to define an anonymous environment in parameter.ts, uncomment the following and the content of cdk.json will be ignored.
  '': {
    // Parameters for anonymous environment
    // If you want to override the default settings, add the following
  },
  dev: {
    // Parameters for development environment
    hostName: 'generative-ai-use-cases-dev',
    allowedSignUpEmailDomains: ['amazon.com', 'amazon.co.jp'],
    modelIds: [
      'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'global.anthropic.claude-haiku-4-5-20251001-v1:0',
      'jp.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      'us.anthropic.claude-opus-4-20250514-v1:0',
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'us.amazon.nova-premier-v1:0',
      'us.amazon.nova-pro-v1:0',
      'us.amazon.nova-lite-v1:0',
      'us.amazon.nova-micro-v1:0',
      'us.deepseek.r1-v1:0',
    ],
    flows: [
      {
        flowId: 'ZLJCTSHUTZ',
        aliasId: 'HG9D7SVSQG',
        flowName: '企業訪問記録RAG',
        description:
          '企業誘致のために企業に訪問した際の議事録を保存したデータベースから検索して回答します。',
      },
    ],
    domainName: 'geeawa.net',
    hostedZoneId: 'Z06310181VQDDC4JW5ES2',
    ragEnabled: true,
    ragKnowledgeBaseEnabled: true,
    agentEnabled: true,
    agentBuilderEnabled: true,
    createGenericAgentCoreRuntime: true,
    agentCoreRegion: 'us-east-1',
  },
  stg: {
    // Parameters for staging environment
    // Parameters for development environment
    hostName: 'generative-ai-use-cases-stg',
    allowedSignUpEmailDomains: ['amazon.com', 'amazon.co.jp'],
    modelIds: [
      'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'global.anthropic.claude-haiku-4-5-20251001-v1:0',
      'jp.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      'us.anthropic.claude-opus-4-20250514-v1:0',
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'us.amazon.nova-premier-v1:0',
      'us.amazon.nova-pro-v1:0',
      'us.amazon.nova-lite-v1:0',
      'us.amazon.nova-micro-v1:0',
      'us.deepseek.r1-v1:0',
    ],
    flows: [
      {
        flowId: 'ZLJCTSHUTZ',
        aliasId: 'HG9D7SVSQG',
        flowName: '企業訪問記録RAG',
        description:
          '企業誘致のために企業に訪問した際の議事録を保存したデータベースから検索して回答します。',
      },
    ],
    domainName: 'geeawa.net',
    hostedZoneId: 'Z06310181VQDDC4JW5ES2',
    ragEnabled: true,
    ragKnowledgeBaseEnabled: true,
    agentEnabled: true,
    agentBuilderEnabled: true,
    createGenericAgentCoreRuntime: true,
    agentCoreRegion: 'us-east-1',
  },
  prod: {
    // Parameters for production environment
    hostName: 'generative-ai-use-cases',
  },
  // If you need other environments, customize them as needed
};

// For backward compatibility, get parameters from CDK Context > parameter.ts
export const getParams = (app: cdk.App): ProcessedStackInput => {
  // By default, get parameters from CDK Context
  let params = getContext(app);

  // If the env matches the ones defined in envs, use the parameters in envs instead of the ones in context
  if (envs[params.env]) {
    params = stackInputSchema.parse({
      ...envs[params.env],
      env: params.env,
    });
  }
  // Make the format of modelIds, imageGenerationModelIds consistent
  const convertToModelConfiguration = (
    models: (string | ModelConfiguration)[],
    defaultRegion: string
  ): ModelConfiguration[] => {
    return models.map((model) =>
      typeof model === 'string'
        ? { modelId: model, region: defaultRegion }
        : model
    );
  };

  return {
    ...params,
    modelIds: convertToModelConfiguration(params.modelIds, params.modelRegion),
    imageGenerationModelIds: convertToModelConfiguration(
      params.imageGenerationModelIds,
      params.modelRegion
    ),
    videoGenerationModelIds: convertToModelConfiguration(
      params.videoGenerationModelIds,
      params.modelRegion
    ),
    speechToSpeechModelIds: convertToModelConfiguration(
      params.speechToSpeechModelIds,
      params.modelRegion
    ),
    endpointNames: convertToModelConfiguration(
      params.endpointNames,
      params.modelRegion
    ),
    // Process agentCoreRegion: null -> modelRegion
    agentCoreRegion: params.agentCoreRegion || params.modelRegion,
    // Compute isAgentCoreNetworkPrivate from VPC configuration
    isAgentCoreNetworkPrivate: !!(
      params.agentCoreVpcId &&
      params.agentCoreSubnetIds &&
      params.agentCoreSubnetIds.length > 0
    ),
    // Load branding configuration
    brandingConfig: loadBrandingConfig(),
  };
};
