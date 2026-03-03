import { Construct } from 'constructs';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AgentCoreConfiguration } from 'generative-ai-use-cases';

export interface AgentCoreProps {
  readonly agentCoreExternalRuntimes: AgentCoreConfiguration[];
  readonly idPool: IdentityPool;
  readonly genericRuntimeArn?: string; // ARN from the separate AgentCore stack
  readonly agentBuilderRuntimeArn?: string; // ARN from the separate AgentCore stack
  readonly researchRuntimeArn?: string; // ARN from the separate Research AgentCore stack
}

export class AgentCore extends Construct {
  private readonly _genericRuntimeArn?: string;
  private readonly _agentBuilderRuntimeArn?: string;
  private readonly _researchRuntimeArn?: string;

  constructor(scope: Construct, id: string, props: AgentCoreProps) {
    super(scope, id);

    this._genericRuntimeArn = props.genericRuntimeArn;
    this._agentBuilderRuntimeArn = props.agentBuilderRuntimeArn;
    this._researchRuntimeArn = props.researchRuntimeArn;

    // Grant invoke permissions to identity pool
    this.grantInvokePermissions(props.idPool, props.agentCoreExternalRuntimes);
  }

  /**
   * Grant invoke permissions to identity pool for all runtimes
   */
  private grantInvokePermissions(
    idPool: IdentityPool,
    externalRuntimes: AgentCoreConfiguration[]
  ): void {
    const resources = [
      ...(this._genericRuntimeArn ? [this._genericRuntimeArn + '*'] : []),
      ...(this._agentBuilderRuntimeArn
        ? [this._agentBuilderRuntimeArn + '*']
        : []),
      ...(this._researchRuntimeArn ? [this._researchRuntimeArn + '*'] : []),
      ...externalRuntimes.map((runtime) => runtime.arn + '*'),
    ];

    if (resources.length > 0) {
      idPool.authenticatedRole.attachInlinePolicy(
        new Policy(this, 'AgentCoreRuntimePolicy', {
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['bedrock-agentcore:InvokeAgentRuntime'],
              resources: resources,
            }),
          ],
        })
      );
    }
  }
}
