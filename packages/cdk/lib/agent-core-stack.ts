import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GenericAgentCore } from './construct/generic-agent-core';
import { ProcessedStackInput } from './stack-input';
import { BucketInfo } from 'generative-ai-use-cases';

export interface AgentCoreStackProps extends StackProps {
  readonly params: ProcessedStackInput;
}

export class AgentCoreStack extends Stack {
  public readonly genericAgentCore?: GenericAgentCore;

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id, props);

    const params = props.params;

    // Deploy Generic AgentCore Runtime if either generic or agentBuilder is enabled
    if (params.createGenericAgentCoreRuntime || params.agentBuilderEnabled) {
      this.genericAgentCore = new GenericAgentCore(this, 'GenericAgentCore', {
        env: params.env,
        createGenericRuntime: params.createGenericAgentCoreRuntime,
        createAgentBuilderRuntime: params.agentBuilderEnabled,
      });

      // Output the generic runtime ARN for cross-stack reference
      if (params.createGenericAgentCoreRuntime) {
        new CfnOutput(this, 'GenericAgentCoreRuntimeArn', {
          value: this.genericAgentCore.deployedGenericRuntimeArn || '',
          exportName: `${this.stackName}-GenericAgentCoreRuntimeArn`,
        });

        new CfnOutput(this, 'GenericAgentCoreRuntimeName', {
          value: this.genericAgentCore.getGenericRuntimeConfig().name,
          exportName: `${this.stackName}-GenericAgentCoreRuntimeName`,
        });
      }

      // Output the AgentBuilder runtime ARN for cross-stack reference
      if (params.agentBuilderEnabled) {
        new CfnOutput(this, 'AgentBuilderAgentCoreRuntimeArn', {
          value: this.genericAgentCore.deployedAgentBuilderRuntimeArn || '',
          exportName: `${this.stackName}-AgentBuilderAgentCoreRuntimeArn`,
        });

        new CfnOutput(this, 'AgentBuilderAgentCoreRuntimeName', {
          value: this.genericAgentCore.getAgentBuilderRuntimeConfig().name,
          exportName: `${this.stackName}-AgentBuilderAgentCoreRuntimeName`,
        });
      }
    }
  }

  /**
   * Get the deployed generic runtime ARN
   */
  public get deployedGenericRuntimeArn(): string | undefined {
    return this.genericAgentCore?.deployedGenericRuntimeArn;
  }

  /**
   * Get the deployed AgentBuilder runtime ARN
   */
  public get deployedAgentBuilderRuntimeArn(): string | undefined {
    return this.genericAgentCore?.deployedAgentBuilderRuntimeArn;
  }

  /**
   * Get the generic runtime configuration
   */
  public getGenericRuntimeConfig() {
    return this.genericAgentCore?.getGenericRuntimeConfig();
  }

  /**
   * Get the AgentBuilder runtime configuration
   */
  public getAgentBuilderRuntimeConfig() {
    return this.genericAgentCore?.getAgentBuilderRuntimeConfig();
  }

  /**
   * Get the file bucket for Agent Core Runtime
   */
  public get fileBucket() {
    return this.genericAgentCore?.fileBucket;
  }

  /**
   * Get the file bucket information (bucket name and region)
   */
  public get fileBucketInfo(): BucketInfo | undefined {
    return this.genericAgentCore?.fileBucketInfo;
  }
}
