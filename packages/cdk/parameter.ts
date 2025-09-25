import * as cdk from 'aws-cdk-lib';
import {
  StackInput,
  stackInputSchema,
  ProcessedStackInput,
} from './lib/stack-input';
import { ModelConfiguration } from 'generative-ai-use-cases';

// Get parameters from CDK Context
const getContext = (app: cdk.App): StackInput => {
  const params = stackInputSchema.parse(app.node.getAllContext());
  return params;
};

// If you want to define parameters directly
const envs: Record<string, Partial<StackInput>> = {
  // If you want to define an anonymous environment, uncomment the following and the content of cdk.json will be ignored.
  // If you want to define an anonymous environment in parameter.ts, uncomment the following and the content of cdk.json will be ignored.
  // '': {
  //   // Parameters for anonymous environment
  //   // If you want to override the default settings, add the following
  // },
  dev: {
    // Parameters for development environment
  },
  staging: {
    // Parameters for staging environment
  },
  prod: {
    modelRegion: 'us-east-1',
    ragKnowledgeBaseEnabled: true,
    ragKnowledgeBaseStandbyReplicas: true, // 프로덕션용 고가용성
    ragKnowledgeBaseAdvancedParsing: true,
    ragKnowledgeBaseAdvancedParsingModelId:
      'anthropic.claude-3-sonnet-20240229-v1:0',
    embeddingModelId: 'amazon.titan-embed-text-v2:0',
    rerankingModelId: 'amazon.rerank-v1:0', // 검색 정확도 향상
    queryDecompositionEnabled: true, // 복잡한 쿼리 분해
    modelIds: [
      // Claude models (On-Demand 지원 - 3.5 Sonnet만)
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      // Cross-region inference models (CRIS 전용)
      'us.anthropic.claude-opus-4-1-20250805-v1:0',
      'us.anthropic.claude-opus-4-20250514-v1:0',
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
      'us.anthropic.claude-3-opus-20240229-v1:0',
      'us.anthropic.claude-3-sonnet-20240229-v1:0',
      'us.anthropic.claude-3-haiku-20240307-v1:0',
      // DeepSeek models
      'us.deepseek.r1-v1:0',
      // Writer models
      { modelId: 'us.writer.palmyra-x5-v1:0', region: 'us-west-2' },
      { modelId: 'us.writer.palmyra-x4-v1:0', region: 'us-west-2' },
      // Amazon models
      'amazon.nova-pro-v1:0',
      'amazon.nova-lite-v1:0',
      'amazon.nova-micro-v1:0',
      'us.amazon.nova-premier-v1:0',
      'us.amazon.nova-pro-v1:0',
      'us.amazon.nova-lite-v1:0',
      'us.amazon.nova-micro-v1:0',
      'amazon.titan-text-premier-v1:0',
      // Meta models (안정적인 모델들만)
      'us.meta.llama3-2-90b-instruct-v1:0',
      'us.meta.llama3-2-11b-instruct-v1:0',
      'us.meta.llama3-2-3b-instruct-v1:0',
      'us.meta.llama3-2-1b-instruct-v1:0',
      'meta.llama3-70b-instruct-v1:0',
      'meta.llama3-8b-instruct-v1:0',
      // Cohere models
      'cohere.command-r-plus-v1:0',
      'cohere.command-r-v1:0',
      // Mistral models (안정적인 모델들만)
      'us.mistral.pixtral-large-2502-v1:0',
      'mistral.mistral-large-2402-v1:0',
      'mistral.mistral-small-2402-v1:0',
      { modelId: 'mistral.mixtral-8x7b-instruct-v0:1', region: 'us-west-2' },
      { modelId: 'mistral.mistral-7b-instruct-v0:2', region: 'us-west-2' },
      // OpenAI models (us-west-2)
      { modelId: 'openai.gpt-oss-120b-1:0', region: 'us-west-2' },
      { modelId: 'openai.gpt-oss-20b-1:0', region: 'us-west-2' },
    ],
    imageGenerationModelIds: [
      // Amazon models
      'amazon.nova-canvas-v1:0',
      'amazon.titan-image-generator-v2:0',
      'amazon.titan-image-generator-v1',
      // Stability models (us-west-2)
      { modelId: 'stability.sd3-large-v1:0', region: 'us-west-2' },
      { modelId: 'stability.sd3-5-large-v1:0', region: 'us-west-2' },
      { modelId: 'stability.stable-image-core-v1:0', region: 'us-west-2' },
      { modelId: 'stability.stable-image-core-v1:1', region: 'us-west-2' },
      { modelId: 'stability.stable-image-ultra-v1:0', region: 'us-west-2' },
      { modelId: 'stability.stable-image-ultra-v1:1', region: 'us-west-2' },
      'stability.stable-diffusion-xl-v1',
    ],
    videoGenerationModelIds: [
      'amazon.nova-reel-v1:0',
      'amazon.nova-reel-v1:1',
      { modelId: 'luma.ray-v2:0', region: 'us-west-2' },
    ],
    speechToSpeechModelIds: ['amazon.nova-sonic-v1:0'],
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
  };
};
