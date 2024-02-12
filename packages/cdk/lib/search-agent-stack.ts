import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Agent } from './construct';

interface SearchAgentStackProps extends StackProps {}

export class SearchAgentStack extends Stack {
  constructor(scope: Construct, id: string, props: SearchAgentStackProps) {
    super(scope, id, props);

    const agent = new Agent(this, 'Agent');
    new CfnOutput(this, 'AgentLambdaFunctionName', {
      value: agent.lambdaFunctionName,
    });
    new CfnOutput(this, 'AgentSchemaURI', {
      value: agent.schemaUri,
    });
  }
}
