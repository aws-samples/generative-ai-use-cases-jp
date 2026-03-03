import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GenerativeAiUseCasesStack } from './generative-ai-use-cases-stack';
import { CloudFrontWafStack } from './cloud-front-waf-stack';
import { DashboardStack } from './dashboard-stack';
import { AgentStack } from './agent-stack';
import { RagKnowledgeBaseStack } from './rag-knowledge-base-stack';
import { GuardrailStack } from './guardrail-stack';
import { AgentCoreStack } from './agent-core-stack';
import { ResearchAgentCoreStack } from './research-agent-core-stack';
import { ProcessedStackInput } from './stack-input';
import { VideoTmpBucketStack } from './video-tmp-bucket-stack';
import { ApplicationInferenceProfileStack } from './application-inference-profile-stack';
import { ClosedNetworkStack } from './closed-network-stack';
import { RemoteOutputs } from 'cdk-remote-stack';
import { REMOTE_OUTPUT_KEYS } from './remote-output-keys';

class DeletionPolicySetter implements cdk.IAspect {
  constructor(private readonly policy: cdk.RemovalPolicy) {}

  visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(this.policy);
    }
  }
}

// Merges inference profile ARNs into ModelIds and returns a new array using RemoteOutputs
const mergeModelIdsAndInferenceProfileArn = (
  modelIds: ProcessedStackInput['modelIds'],
  inferenceProfileStacks: Record<string, ApplicationInferenceProfileStack>,
  scope: cdk.App
) => {
  return modelIds.map((modelId) => {
    const result = { ...modelId };
    const stack = inferenceProfileStacks[modelId.region];
    if (stack) {
      try {
        const remoteOutputs = new RemoteOutputs(
          scope,
          `InferenceProfile-${modelId.region}-RemoteOutputs`,
          {
            stack: stack,
            alwaysUpdate: true,
          }
        );
        const inferenceProfileArnsJson = remoteOutputs.get(
          REMOTE_OUTPUT_KEYS.INFERENCE_PROFILE_ARNS
        );
        if (inferenceProfileArnsJson) {
          const inferenceProfileArns = JSON.parse(inferenceProfileArnsJson);
          const inferenceProfileArn = inferenceProfileArns[modelId.modelId];
          if (inferenceProfileArn) {
            result.inferenceProfileArn = inferenceProfileArn;
          }
        }
      } catch (e) {
        // Stack doesn't exist or output not found, continue without inference profile
      }
    }
    return result;
  });
};

export const createStacks = (app: cdk.App, params: ProcessedStackInput) => {
  // Create an ApplicationInferenceProfile for each region of the model to be used
  const modelRegions = [
    ...new Set([
      ...params.modelIds.map((model) => model.region),
      ...params.imageGenerationModelIds.map((model) => model.region),
      ...params.videoGenerationModelIds.map((model) => model.region),
      ...params.speechToSpeechModelIds.map((model) => model.region),
    ]),
  ];
  const inferenceProfileStacks: Record<
    string,
    ApplicationInferenceProfileStack
  > = {};
  for (const region of modelRegions) {
    const applicationInferenceProfileStack =
      new ApplicationInferenceProfileStack(
        app,
        `ApplicationInferenceProfileStack${params.env}${region}`,
        {
          env: {
            account: params.account,
            region,
          },
          params,
        }
      );
    inferenceProfileStacks[region] = applicationInferenceProfileStack;
  }

  // Set inference profile ARNs to model IDs
  const updatedParams: ProcessedStackInput = JSON.parse(JSON.stringify(params));
  updatedParams.modelIds = mergeModelIdsAndInferenceProfileArn(
    params.modelIds,
    inferenceProfileStacks,
    app
  );
  updatedParams.imageGenerationModelIds = mergeModelIdsAndInferenceProfileArn(
    params.imageGenerationModelIds,
    inferenceProfileStacks,
    app
  );
  updatedParams.videoGenerationModelIds = mergeModelIdsAndInferenceProfileArn(
    params.videoGenerationModelIds,
    inferenceProfileStacks,
    app
  );
  updatedParams.speechToSpeechModelIds = mergeModelIdsAndInferenceProfileArn(
    params.speechToSpeechModelIds,
    inferenceProfileStacks,
    app
  );

  // GenU Stack
  const isSageMakerStudio = 'SAGEMAKER_APP_TYPE_LOWERCASE' in process.env;

  let closedNetworkStack: ClosedNetworkStack | undefined = undefined;

  if (params.closedNetworkMode) {
    closedNetworkStack = new ClosedNetworkStack(
      app,
      `ClosedNetworkStack${params.env}`,
      {
        env: {
          account: params.account,
          region: params.region,
        },
        params,
        isSageMakerStudio,
      }
    );
  }

  // CloudFront WAF
  // Only deploy CloudFrontWafStack if IP address range (v4 or v6) or geographic restriction is defined
  // WAF v2 is only deployable in us-east-1, so the Stack is separated
  const cloudFrontWafStack =
    (params.allowedIpV4AddressRanges ||
      params.allowedIpV6AddressRanges ||
      params.allowedCountryCodes ||
      params.hostName) &&
    !params.closedNetworkMode
      ? new CloudFrontWafStack(app, `CloudFrontWafStack${params.env}`, {
          env: {
            account: updatedParams.account,
            region: 'us-east-1',
          },
          params: updatedParams,
          crossRegionReferences: true,
        })
      : null;

  // RAG Knowledge Base
  const ragKnowledgeBaseStack =
    updatedParams.ragKnowledgeBaseEnabled && !updatedParams.ragKnowledgeBaseId
      ? new RagKnowledgeBaseStack(
          app,
          `RagKnowledgeBaseStack${updatedParams.env}`,
          {
            env: {
              account: updatedParams.account,
              region: updatedParams.modelRegion,
            },
            params: updatedParams,
            crossRegionReferences: true,
          }
        )
      : null;

  // Agent
  if (updatedParams.crossAccountBedrockRoleArn) {
    if (updatedParams.agentEnabled || updatedParams.searchApiKey) {
      throw new Error(
        'When `crossAccountBedrockRoleArn` is specified, the `agentEnabled` and `searchApiKey` parameters are not supported. Please create agents in the other account and specify them in the `agents` parameter.'
      );
    }
  }
  const agentStack = updatedParams.agentEnabled
    ? new AgentStack(app, `WebSearchAgentStack${updatedParams.env}`, {
        env: {
          account: updatedParams.account,
          region: updatedParams.modelRegion,
        },
        params: updatedParams,
        vpc: closedNetworkStack?.vpc,
      })
    : null;

  // Guardrail
  const guardrailStack = updatedParams.guardrailEnabled
    ? new GuardrailStack(app, `GuardrailStack${updatedParams.env}`, {
        env: {
          account: updatedParams.account,
          region: updatedParams.modelRegion,
        },
        crossRegionReferences: true,
      })
    : null;

  // Agent Core Runtime (always create if either feature is enabled)
  const agentCoreStack =
    params.createGenericAgentCoreRuntime || params.agentBuilderEnabled
      ? new AgentCoreStack(app, `AgentCoreStack${params.env}`, {
          env: {
            account: params.account,
            region: params.agentCoreRegion,
          },
          params: params,
        })
      : null;

  // Research Agent Core Runtime
  const researchAgentCoreStack = params.researchAgentEnabled
    ? new ResearchAgentCoreStack(app, `ResearchAgentCoreStack${params.env}`, {
        env: {
          account: params.account,
          region: params.agentCoreRegion,
        },
        params: params,
      })
    : null;

  // Create S3 Bucket for each unique region for StartAsyncInvoke in video generation
  // because the S3 Bucket must be in the same region as Bedrock Runtime
  const videoModelRegions = [
    ...new Set(
      updatedParams.videoGenerationModelIds.map((model) => model.region)
    ),
  ];
  const videoBucketRegionMap: Record<string, string> = {};

  for (const region of videoModelRegions) {
    const videoTmpBucketStack = new VideoTmpBucketStack(
      app,
      `VideoTmpBucketStack${updatedParams.env}${region}`,
      {
        env: {
          account: updatedParams.account,
          region,
        },
        params: updatedParams,
      }
    );

    videoBucketRegionMap[region] = videoTmpBucketStack.bucketName;
  }

  const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
    app,
    `GenerativeAiUseCasesStack${updatedParams.env}`,
    {
      env: {
        account: updatedParams.account,
        region: updatedParams.region,
      },
      description: updatedParams.anonymousUsageTracking
        ? 'Generative AI Use Cases (uksb-1tupboc48)'
        : undefined,
      params: updatedParams,
      crossRegionReferences: true,
      // RAG Knowledge Base
      knowledgeBaseId: ragKnowledgeBaseStack?.knowledgeBaseId,
      knowledgeBaseDataSourceBucketName:
        ragKnowledgeBaseStack?.dataSourceBucketName,
      agentStack: agentStack || undefined,

      // Agent Core
      createGenericAgentCoreRuntime: params.createGenericAgentCoreRuntime,
      agentBuilderEnabled: params.agentBuilderEnabled,
      agentCoreStack: agentCoreStack || undefined,
      // Research Agent Core
      researchAgentEnabled: params.researchAgentEnabled,
      researchAgentCoreStack: researchAgentCoreStack || undefined,
      // Video Generation
      videoBucketRegionMap,
      // Guardrail
      guardrailIdentifier: guardrailStack?.guardrailIdentifier,
      guardrailVersion: 'DRAFT',
      // WAF
      webAclId: cloudFrontWafStack?.webAclArn,
      // Custom Domain
      cert: cloudFrontWafStack?.cert,
      // Image build environment
      isSageMakerStudio,
      // Closed network
      vpc: closedNetworkStack?.vpc,
      apiGatewayVpcEndpoint: closedNetworkStack?.apiGatewayVpcEndpoint,
      webBucket: closedNetworkStack?.webBucket,
    }
  );

  // Add explicit dependencies for RemoteOutputs
  if (agentStack) {
    generativeAiUseCasesStack.addDependency(agentStack);
  }
  if (agentCoreStack) {
    generativeAiUseCasesStack.addDependency(agentCoreStack);
  }

  cdk.Aspects.of(generativeAiUseCasesStack).add(
    new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY)
  );

  const dashboardStack = updatedParams.dashboard
    ? new DashboardStack(
        app,
        `GenerativeAiUseCasesDashboardStack${updatedParams.env}`,
        {
          env: {
            account: updatedParams.account,
            region: updatedParams.modelRegion,
          },
          params: updatedParams,
          userPool: generativeAiUseCasesStack.userPool,
          userPoolClient: generativeAiUseCasesStack.userPoolClient,
          appRegion: updatedParams.region,
          crossRegionReferences: true,
        }
      )
    : null;

  return {
    closedNetworkStack,
    cloudFrontWafStack,
    ragKnowledgeBaseStack,
    agentStack,
    guardrailStack,
    agentCoreStack,
    generativeAiUseCasesStack,
    dashboardStack,
  };
};
