import { z } from 'zod';

// Base schema without refine
const baseStackInputSchema = z.object({
  account: z.string().default(process.env.CDK_DEFAULT_ACCOUNT ?? ''),
  region: z.string().default(process.env.CDK_DEFAULT_REGION ?? 'us-east-1'),
  env: z.string().default(''),
  anonymousUsageTracking: z.boolean().default(true),
  enableAutoDelete: z.boolean().default(false),

  // Auth
  selfSignUpEnabled: z.boolean().default(true),
  selfSignUpTenantMap: z
    .array(
      z
        .object({
          tenantId: z.string().min(1, 'Tenant ID cannot be empty'),
          domains: z.array(z.string().toLowerCase()).optional(),
          emails: z.array(z.string().email().toLowerCase()).optional(),
        })
        .refine(
          (data) =>
            (data.domains && data.domains.length > 0) ||
            (data.emails && data.emails.length > 0),
          {
            message:
              'Each tenant map entry must have at least one domain or email',
          }
        )
    )
    .nullish(),
  samlAuthEnabled: z.boolean().default(false),
  samlDefaultAuthEnabled: z.boolean().default(false),
  samlCognitoDomainName: z.string().nullish(),
  samlCognitoFederatedIdentityProviderName: z.string().nullish(),
  // API
  corsAllowOrigins: z.array(z.string()).default(['*']),
  modelRegion: z.string().default('us-east-1'),
  modelIds: z
    .array(
      z.union([
        z.string(),
        z.object({
          modelId: z.string(),
          region: z.string(),
        }),
      ])
    )
    .default([
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      'us.anthropic.claude-opus-4-20250514-v1:0',
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'us.amazon.nova-premier-v1:0',
      'us.amazon.nova-pro-v1:0',
      'us.amazon.nova-lite-v1:0',
      'us.amazon.nova-micro-v1:0',
      'us.deepseek.r1-v1:0',
    ]),
  imageGenerationModelIds: z
    .array(
      z.union([
        z.string(),
        z.object({
          modelId: z.string(),
          region: z.string(),
        }),
      ])
    )
    .default(['amazon.nova-canvas-v1:0']),
  videoGenerationModelIds: z
    .array(
      z.union([
        z.string(),
        z.object({
          modelId: z.string(),
          region: z.string(),
        }),
      ])
    )
    .default(['amazon.nova-reel-v1:0']),
  speechToSpeechModelIds: z
    .array(
      z.union([
        z.string(),
        z.object({
          modelId: z.string(),
          region: z.string(),
        }),
      ])
    )
    .default(['amazon.nova-sonic-v1:0']),
  endpointNames: z.array(z.string()).default([]),
  crossAccountBedrockRoleArn: z.string().nullish(),
  // RAG
  ragEnabled: z.boolean().default(false),
  kendraIndexLanguage: z.string().default('ja'),
  kendraIndexArn: z.string().nullish(),
  kendraDataSourceBucketName: z.string().nullish(),
  kendraIndexScheduleEnabled: z.boolean().default(false),
  kendraIndexScheduleCreateCron: z
    .object({
      minute: z.string(),
      hour: z.string(),
      month: z.string(),
      weekDay: z.string(),
    })
    .nullish(),
  kendraIndexScheduleDeleteCron: z
    .object({
      minute: z.string(),
      hour: z.string(),
      month: z.string(),
      weekDay: z.string(),
    })
    .nullish(),
  // RAG KB
  ragKnowledgeBaseEnabled: z.boolean().default(false),
  ragKnowledgeBaseId: z.string().nullish(),
  embeddingModelId: z.string().default('amazon.titan-embed-text-v2:0'),
  ragKnowledgeBaseStandbyReplicas: z.boolean().default(false),
  ragKnowledgeBaseAdvancedParsing: z.boolean().default(false),
  ragKnowledgeBaseAdvancedParsingModelId: z
    .string()
    .default('anthropic.claude-3-sonnet-20240229-v1:0'),
  ragKnowledgeBaseBinaryVector: z.boolean().default(false),
  queryDecompositionEnabled: z.boolean().default(false),
  rerankingModelId: z.string().nullish(),
  // Agent
  agentEnabled: z.boolean().default(false),
  searchAgentEnabled: z.boolean().default(false),
  searchApiKey: z.string().nullish(),
  searchEngine: z.enum(['Brave', 'Tavily']).default('Brave'),
  agents: z
    .array(
      z.object({
        displayName: z.string(),
        agentId: z.string(),
        aliasId: z.string(),
      })
    )
    .default([]),
  inlineAgents: z.boolean().default(false),
  // MCP
  mcpEnabled: z.boolean().default(false),
  // PPTX
  pptxEnabled: z.boolean().default(false),
  // LiteLLM Proxy Server
  litellmProxyEnabled: z.boolean().default(false),
  // Guardrail
  guardrailEnabled: z.boolean().default(false),
  // Usecase builder
  useCaseBuilderEnabled: z.boolean().default(true),
  // Flows
  flows: z
    .array(
      z.object({
        flowId: z.string(),
        aliasId: z.string(),
        flowName: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  // WAF
  allowedIpV4AddressRanges: z.array(z.string()).nullish(),
  allowedIpV6AddressRanges: z.array(z.string()).nullish(),
  allowedCountryCodes: z.array(z.string()).nullish(),
  // Custom Domain
  hostName: z.string().nullish(),
  domainName: z.string().nullish(),
  hostedZoneId: z.string().nullish(),
  // Dashboard
  dashboard: z.boolean().default(false),

  // LangChain
  openai: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
});

// Common Validator with refine
export const stackInputSchema = baseStackInputSchema
  .refine(
    (data) => {
      // If searchApiKey is provided, searchEngine must also be provided
      if (data.searchApiKey && !data.searchEngine) {
        return false;
      }
      return true;
    },
    {
      message: 'searchEngine is required when searchApiKey is provided',
      path: ['searchEngine'],
    }
  )
  .refine(
    (data) => {
      // AWS account ID is required for CDK deployment
      if (!data.account || data.account === '') {
        return false;
      }
      return true;
    },
    {
      message: 'AWS account ID is required. Set CDK_DEFAULT_ACCOUNT environment variable.',
      path: ['account'],
    }
  );

// schema after conversion
export const processedStackInputSchema = baseStackInputSchema.extend({
  modelIds: z.array(
    z.object({
      modelId: z.string(),
      region: z.string(),
    })
  ),
  imageGenerationModelIds: z.array(
    z.object({
      modelId: z.string(),
      region: z.string(),
    })
  ),
  videoGenerationModelIds: z.array(
    z.object({
      modelId: z.string(),
      region: z.string(),
    })
  ),
  speechToSpeechModelIds: z.array(
    z.object({
      modelId: z.string(),
      region: z.string(),
    })
  ),
});

export type StackInput = z.infer<typeof stackInputSchema>;
export type ProcessedStackInput = z.infer<typeof processedStackInputSchema>;
