import { Stack, StackProps, CfnOutput, ArnFormat } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnApplicationInferenceProfile } from 'aws-cdk-lib/aws-bedrock';
import { ProcessedStackInput } from './stack-input';

export interface ApplicationInferenceProfileStackProps extends StackProps {
  readonly params: ProcessedStackInput;
}

export class ApplicationInferenceProfileStack extends Stack {
  public readonly inferenceProfileArns: Record<string, string> = {};

  constructor(
    scope: Construct,
    id: string,
    props: ApplicationInferenceProfileStackProps
  ) {
    super(scope, id, props);
    const params = props.params;
    const currentRegion = props.env?.region;

    const createInferenceProfiles = (modelIds: typeof params.modelIds) => {
      for (const modelId of modelIds) {
        // Inference Profile is not supported Cross Region Inference
        if (modelId.region === currentRegion) {
          const inferenceProfileNamePrefix = modelId.modelId
            .replace(/\./g, '-')
            .replace(/:/g, '-');
          const isCrossRegionProfile =
            modelId.modelId.startsWith('us.') ||
            modelId.modelId.startsWith('apac.') ||
            modelId.modelId.startsWith('eu.') ||
            modelId.modelId.startsWith('global') ||
            modelId.modelId.startsWith('jp');
          const arn = Stack.of(this).formatArn({
            service: 'bedrock',
            resource: isCrossRegionProfile
              ? 'inference-profile'
              : 'foundation-model',
            resourceName: modelId.modelId,
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
          });
          const inferenceProfile = new CfnApplicationInferenceProfile(
            this,
            `ApplicationInferenceProfile${modelId.modelId}`,
            {
              inferenceProfileName: `${inferenceProfileNamePrefix}${params.env}`,
              modelSource: {
                copyFrom: arn,
              },
            }
          );
          this.inferenceProfileArns[modelId.modelId] =
            inferenceProfile.attrInferenceProfileArn;
        }
      }
    };

    createInferenceProfiles(params.modelIds);
    createInferenceProfiles(params.imageGenerationModelIds);
    createInferenceProfiles(params.videoGenerationModelIds);
    createInferenceProfiles(params.speechToSpeechModelIds);

    // Export all inference profile ARNs as a single JSON output
    if (Object.keys(this.inferenceProfileArns).length > 0) {
      new CfnOutput(this, 'InferenceProfileArns', {
        value: JSON.stringify(this.inferenceProfileArns),
      });
    }
  }
}
