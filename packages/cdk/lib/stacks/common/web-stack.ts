import { CfnOutput, NestedStack, StackProps } from 'aws-cdk-lib';
import { Api, Auth, SpeechToSpeech, Web } from '../../construct';
import { ProcessedStackInput } from '../../stack-input';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

interface WebStackProps extends StackProps {
  readonly params: ProcessedStackInput;
  readonly auth: Auth;
  readonly api: Api;
  readonly speechToSpeech: SpeechToSpeech;
  readonly webAclId?: string;
  readonly mcpEndpoint: string | null;
  readonly cert?: ICertificate;
}

class WebStack extends NestedStack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { params, auth, api, speechToSpeech, webAclId, mcpEndpoint, cert } =
      props;

    // Web Frontend
    const selfSignUpEnabledForWeb =
      params.samlAuthEnabled && !params.samlDefaultAuthEnabled
        ? false
        : params.selfSignUpEnabled;

    const web = new Web(this, 'Api', {
      // Auth
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.client.userPoolClientId,
      idPoolId: auth.idPool.identityPoolId,
      selfSignUpEnabled: selfSignUpEnabledForWeb,
      samlAuthEnabled: params.samlAuthEnabled,
      samlDefaultAuthEnabled: params.samlDefaultAuthEnabled,
      samlCognitoDomainName: params.samlCognitoDomainName,
      samlCognitoFederatedIdentityProviderName:
        params.samlCognitoFederatedIdentityProviderName,
      // Backend
      apiEndpointUrl: api.restApi.url,
      predictStreamFunctionArn: api.predictStreamFunction.functionArn,
      ragEnabled: params.ragEnabled,
      ragKnowledgeBaseEnabled: params.ragKnowledgeBaseEnabled,
      agentEnabled: params.agentEnabled || params.agents.length > 0,
      flows: params.flows,
      flowStreamFunctionArn: api.invokeFlowFunction.functionArn,
      optimizePromptFunctionArn: api.optimizePromptFunction.functionArn,
      webAclId: webAclId,
      modelRegion: api.modelRegion,
      modelIds: api.modelIds,
      imageGenerationModelIds: api.imageGenerationModelIds,
      videoGenerationModelIds: api.videoGenerationModelIds,
      endpointNames: api.endpointNames,
      agentNames: api.agentNames,
      inlineAgents: params.inlineAgents,
      useCaseBuilderEnabled: params.useCaseBuilderEnabled,
      speechToSpeechNamespace: speechToSpeech.namespace,
      speechToSpeechEventApiEndpoint: speechToSpeech.eventApiEndpoint,
      speechToSpeechModelIds: params.speechToSpeechModelIds,
      mcpEnabled: params.mcpEnabled,
      mcpEndpoint,
      pptxEnabled: params.pptxEnabled,
      // Frontend
      // Custom Domain
      cert: cert,
      hostName: params.hostName,
      domainName: params.domainName,
      hostedZoneId: params.hostedZoneId,
    });

    if (params.hostName && params.domainName) {
      new CfnOutput(this, 'WebUrl', {
        value: `https://${params.hostName}.${params.domainName}`,
      });
    } else {
      new CfnOutput(this, 'WebUrl', {
        value: `https://${web.distribution.domainName}`,
      });
    }
  }
}

export default WebStack;
