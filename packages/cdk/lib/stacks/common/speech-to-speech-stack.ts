import { NestedStack, StackProps } from 'aws-cdk-lib';
import { ProcessedStackInput } from '../../stack-input';
import { Api, Auth, SpeechToSpeech } from '../../construct';
import { Construct } from 'constructs';

interface SpeechToSpeechStackProps extends StackProps {
  params: ProcessedStackInput;
  api: Api;
  auth: Auth;
}

class SpeechToSpeechStack extends NestedStack {
  readonly speechToSpeech: SpeechToSpeech;

  constructor(scope: Construct, id: string, props: SpeechToSpeechStackProps) {
    super(scope, id, props);

    const { params, api, auth } = props;

    const speechToSpeech = new SpeechToSpeech(this, 'SpeechToSpeech', {
      envSuffix: params.env,
      api: api.restApi,
      userPool: auth.userPool,
      speechToSpeechModelIds: params.speechToSpeechModelIds,
      crossAccountBedrockRoleArn: params.crossAccountBedrockRoleArn,
    });

    this.speechToSpeech = speechToSpeech;
  }
}

export default SpeechToSpeechStack;
