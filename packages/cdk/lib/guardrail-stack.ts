import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Guardrail } from './construct';

interface GuardrailStackProps extends StackProps {}

export class GuardrailStack extends Stack {
  public readonly guardrailIdentifier: string;

  constructor(scope: Construct, id: string, props: GuardrailStackProps) {
    super(scope, id, props);

    const guardrail = new Guardrail(this, 'Guardrail');
    this.guardrailIdentifier = guardrail.guardrailIdentifier;
  }
}
