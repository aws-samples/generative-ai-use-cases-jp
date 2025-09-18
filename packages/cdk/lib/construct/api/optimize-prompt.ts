import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';

export type OptimizePromptApiProps = GenericApiProps;

class OptimizePromptApi extends Construct {
  readonly optimizePromptFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: OptimizePromptApiProps) {
    super(scope, id);

    const { idPool, modelRegion, bedrockPolicy } = props;

    const optimizePromptFunction = new NodejsFunction(
      this,
      'OptimizePromptFunction',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/optimizePrompt.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: ['@aws-sdk/client-bedrock-agent-runtime'],
        },
        environment: {
          MODEL_REGION: modelRegion,
        },
      }
    );
    optimizePromptFunction.grantInvoke(idPool.authenticatedRole);

    if (bedrockPolicy) {
      optimizePromptFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    }

    this.optimizePromptFunction = optimizePromptFunction;
  }
}

export default OptimizePromptApi;
