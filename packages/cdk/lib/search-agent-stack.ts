import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Agent } from './construct';
import { Agent as AgentType } from 'generative-ai-use-cases-jp';

interface SearchAgentStackProps extends StackProps {}

export class SearchAgentStack extends Stack {
  public readonly agents: AgentType[];

  constructor(scope: Construct, id: string, props: SearchAgentStackProps) {
    super(scope, id, props);

    const agent = new Agent(this, 'Agent');
    this.agents = agent.agents;
  }
}
