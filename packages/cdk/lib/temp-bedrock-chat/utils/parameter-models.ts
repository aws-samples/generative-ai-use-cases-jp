import { z } from 'zod';
import { TIdentityProvider } from './identity-provider';
import { App } from 'aws-cdk-lib';

export const BotStoreLanguageSchema = z.enum([
  'en',
  'de',
  'fr',
  'es',
  'ja',
  'ko',
  'zhhans',
  'zhhant',
  'it',
  'nb',
  'th',
  'id',
  'ms',
]);

/**
 * Base parameters schema that is common across all entry points
 */
const BaseParametersSchema = z.object({
  // CDK Environments
  envName: z
    .string()
    .max(10)
    .regex(/^$|^[a-zA-Z][a-zA-Z0-9]*$/)
    .default('default'),
  envPrefix: z.string().default(''),

  // Bedrock configuration
  bedrockRegion: z.string().default('us-east-1'),
  enableBedrockCrossRegionInference: z.boolean().default(true),
});

/**
 * Helper function to get environment variables with fallback
 * @param name Environment variable name
 * @param defaultValue Default value if environment variable is not set
 * @returns The environment variable value or default value
 */
function getEnvVar(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  return value !== undefined ? value : defaultValue;
}

/**
 * Parameters schema for the main Bedrock Chat application
 */
const BedrockChatParametersSchema = BaseParametersSchema.extend({
  // IP address restrictions
  allowedIpV4AddressRanges: z
    .array(z.string())
    .default(['0.0.0.0/1', '128.0.0.0/1']),
  allowedIpV6AddressRanges: z
    .array(z.string())
    .default([
      '0000:0000:0000:0000:0000:0000:0000:0000/1',
      '8000:0000:0000:0000:0000:0000:0000:0000/1',
    ]),
  publishedApiAllowedIpV4AddressRanges: z
    .array(z.string())
    .default(['0.0.0.0/1', '128.0.0.0/1']),
  publishedApiAllowedIpV6AddressRanges: z
    .array(z.string())
    .default([
      '0000:0000:0000:0000:0000:0000:0000:0000/1',
      '8000:0000:0000:0000:0000:0000:0000:0000/1',
    ]),

  // Optional list of allowed countries specified as ISO 3166-1 alpha-2 codes
  allowedCountries: z.array(z.string()).default([]),

  // Authentication and user management
  identityProviders: z
    .unknown()
    .transform((val) =>
      Array.isArray(val) ? (val as TIdentityProvider[]) : []
    )
    .pipe(z.array(z.custom<TIdentityProvider>()))
    .default([]),
  userPoolDomainPrefix: z.string().default(''),
  allowedSignUpEmailDomains: z.array(z.string()).default([]),
  autoJoinUserGroups: z.array(z.string()).default([]),
  selfSignUpEnabled: z.boolean().default(true),

  // Performance and availability
  enableRagReplicas: z.boolean().default(true),
  enableLambdaSnapStart: z.boolean().default(true),

  // Custom domain configuration
  alternateDomainName: z.string().default(''),
  hostedZoneId: z.string().default(''),

  // BotStore
  enableBotStore: z.boolean().default(true),
  enableBotStoreReplicas: z.boolean().default(false),
  botStoreLanguage: BotStoreLanguageSchema.default('en'),

  // ID token refresh interval
  tokenValidMinutes: z.number().default(30),

  // Global model configuration
  // If not configured (empty array), all models are available
  globalAvailableModels: z.array(z.string()).default([]),

  // debug parameter
  devAccessIamRoleArn: z.string().default(''),
});

/**
 * Parameters schema for API publishing
 */
const ApiPublishParametersSchema = BaseParametersSchema.extend({
  // API publishing configuration
  publishedApiThrottleRateLimit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  publishedApiThrottleBurstLimit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  publishedApiQuotaLimit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  publishedApiQuotaPeriod: z.enum(['DAY', 'WEEK', 'MONTH']).optional(),
  publishedApiDeploymentStage: z.string().default('api'),
  publishedApiId: z.string().optional(),
  publishedApiAllowedOrigins: z.string().default('["*"]'),
});

/**
 * Parameters schema for Bedrock Custom Bot
 */
const BedrockCustomBotParametersSchema = BaseParametersSchema.extend({
  // Bot configuration
  pk: z.string(),
  sk: z.string(),
  documentBucketName: z.string(),
  knowledge: z.string(),
  knowledgeBase: z.string(),
  guardrails: z.string(),
  enableRagReplicas: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
});

/**
 * Type definitions for each parameter set
 */
// Input types (for user input, default values are optional)
export type BaseParametersInput = z.input<typeof BaseParametersSchema>;
export type BedrockChatParametersInput = z.input<
  typeof BedrockChatParametersSchema
>;
export type ApiPublishParametersInput = z.input<
  typeof ApiPublishParametersSchema
>;
export type BedrockCustomBotParametersInput = z.input<
  typeof BedrockCustomBotParametersSchema
>;

// Output types (for function returns, all properties are required)
export type BaseParameters = z.infer<typeof BaseParametersSchema>;
export type BedrockChatParameters = z.infer<typeof BedrockChatParametersSchema>;
export type ApiPublishParameters = z.infer<typeof ApiPublishParametersSchema>;
export type BedrockCustomBotParameters = z.infer<
  typeof BedrockCustomBotParametersSchema
>;

/**
 * Parse and validate parameters for the main Bedrock Chat application.
 * If you omit parametersInput, context parameters and environment variables are used.
 * @param app CDK App instance
 * @param parametersInput (optional) Input parameters that should be used instead of context parameters
 * @returns Validated parameters object
 */
export function resolveBedrockChatParameters(
  app: App,
  parametersInput?: BedrockChatParametersInput
): BedrockChatParameters {
  // If parametersInput is provided, use it directly
  if (parametersInput) {
    return BedrockChatParametersSchema.parse(parametersInput);
  }

  // Get environment variables
  const envName = app.node.tryGetContext('envName') || 'default';
  const envPrefix = envName === 'default' ? '' : envName;

  // Otherwise, get parameters from context
  const identityProviders = app.node.tryGetContext('identityProviders');

  const contextParams = {
    envName,
    envPrefix,
    bedrockRegion: app.node.tryGetContext('bedrockRegion'),
    allowedIpV4AddressRanges: app.node.tryGetContext(
      'allowedIpV4AddressRanges'
    ),
    allowedIpV6AddressRanges: app.node.tryGetContext(
      'allowedIpV6AddressRanges'
    ),
    allowedCountries: app.node.tryGetContext('allowedCountries'),
    identityProviders: app.node.tryGetContext('identityProviders'),
    userPoolDomainPrefix: app.node.tryGetContext('userPoolDomainPrefix'),
    allowedSignUpEmailDomains: app.node.tryGetContext(
      'allowedSignUpEmailDomains'
    ),
    autoJoinUserGroups: app.node.tryGetContext('autoJoinUserGroups'),
    selfSignUpEnabled: app.node.tryGetContext('selfSignUpEnabled'),
    publishedApiAllowedIpV4AddressRanges: app.node.tryGetContext(
      'publishedApiAllowedIpV4AddressRanges'
    ),
    publishedApiAllowedIpV6AddressRanges: app.node.tryGetContext(
      'publishedApiAllowedIpV6AddressRanges'
    ),
    enableRagReplicas: app.node.tryGetContext('enableRagReplicas'),
    enableBedrockCrossRegionInference: app.node.tryGetContext(
      'enableBedrockCrossRegionInference'
    ),
    enableLambdaSnapStart: app.node.tryGetContext('enableLambdaSnapStart'),
    alternateDomainName: app.node.tryGetContext('alternateDomainName'),
    hostedZoneId: app.node.tryGetContext('hostedZoneId'),
    enableBotStore: app.node.tryGetContext('enableBotStore'),
    enableBotStoreReplicas: app.node.tryGetContext('EnableBotStoreReplicas'),
    botStoreLanguage: app.node.tryGetContext('botStoreLanguage'),
    globalAvailableModels: app.node.tryGetContext('globalAvailableModels'),
    devAccessIamRoleArn: app.node.tryGetContext('devAccessIamRoleArn'),
  };

  return BedrockChatParametersSchema.parse(contextParams);
}

/**
 * Get Bedrock Chat parameters based on environment name.
 * If you omit envName, "default" is used.
 * If you omit parametersInput, context parameters and environment variables are used.
 * @param app CDK App instance
 * @param envName (optional) Environment name. Used as map key if provided
 * @param paramsMap (optional) Map of parameters. If not provided, use context parameters
 * @returns Validated parameters object
 */
export function getBedrockChatParameters(
  app: App,
  envName: string | undefined,
  paramsMap: Map<string, BedrockChatParametersInput>
): BedrockChatParameters {
  if (envName == undefined) {
    if (paramsMap.has('default')) {
      // Use parameter.ts instead of context parameters
      const params = paramsMap.get('default') || {};
      return resolveBedrockChatParameters(app, {
        envName: 'default',
        envPrefix: '',
        ...params,
      });
    } else {
      // Use CDK context parameters (cdk.json or -c options)
      return resolveBedrockChatParameters(app);
    }
  } else {
    // Lookup envName in parameter.ts
    if (!paramsMap.has(envName)) {
      throw new Error(`Environment ${envName} not found in parameter.ts`);
    }

    const params = paramsMap.get(envName) || {};
    const envPrefix = envName === 'default' ? '' : envName;

    return resolveBedrockChatParameters(app, {
      envName,
      envPrefix,
      ...params,
    });
  }
}

/**
 * Parse and validate parameters for API publishing.
 * This function is executed by CDK in CodeBuild launched via the API.
 * Therefore, this is not intend to be set values using cdk.json or parameter.ts.
 * @returns Validated parameters object from environment variables
 */
export function resolveApiPublishParameters(): ApiPublishParameters {
  const envVars = {
    envName: getEnvVar('ENV_NAME'),
    envPrefix: getEnvVar('ENV_PREFIX'),
    bedrockRegion: getEnvVar('BEDROCK_REGION'),
    enableBedrockCrossRegionInference: getEnvVar(
      'ENABLE_BEDROCK_CROSS_REGION_INFERENCE'
    ),
    publishedApiThrottleRateLimit: getEnvVar(
      'PUBLISHED_API_THROTTLE_RATE_LIMIT'
    ),
    publishedApiThrottleBurstLimit: getEnvVar(
      'PUBLISHED_API_THROTTLE_BURST_LIMIT'
    ),
    publishedApiQuotaLimit: getEnvVar('PUBLISHED_API_QUOTA_LIMIT'),
    publishedApiQuotaPeriod: getEnvVar('PUBLISHED_API_QUOTA_PERIOD'),
    publishedApiDeploymentStage: getEnvVar('PUBLISHED_API_DEPLOYMENT_STAGE'),
    publishedApiId: getEnvVar('PUBLISHED_API_ID'),
    publishedApiAllowedOrigins: getEnvVar('PUBLISHED_API_ALLOWED_ORIGINS'),
  };

  return ApiPublishParametersSchema.parse(envVars);
}

/**
 * Parse and validate parameters for Bedrock Custom Bot.
 * This function is executed by CDK in CodeBuild launched via the API.
 * Therefore, this is not intend to be set values using cdk.json or parameter.ts.
 * @returns Validated parameters object from environment variables
 */
export function resolveBedrockCustomBotParameters(): BedrockCustomBotParameters {
  const envVars = {
    envName: getEnvVar('ENV_NAME'),
    envPrefix: getEnvVar('ENV_PREFIX'),
    bedrockRegion: getEnvVar('BEDROCK_REGION'),
    pk: getEnvVar('PK'),
    sk: getEnvVar('SK'),
    documentBucketName: getEnvVar('BEDROCK_CLAUDE_CHAT_DOCUMENT_BUCKET_NAME'),
    knowledge: getEnvVar('KNOWLEDGE'),
    knowledgeBase: getEnvVar('BEDROCK_KNOWLEDGE_BASE'),
    guardrails: getEnvVar('BEDROCK_GUARDRAILS'),
    enableRagReplicas: getEnvVar('ENABLE_RAG_REPLICAS'),
  };

  return BedrockCustomBotParametersSchema.parse(envVars);
}
