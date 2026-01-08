import { CfnOutput, NestedStack, StackProps } from 'aws-cdk-lib';
import {
  Api,
  Auth,
  SpeechToSpeech,
  Web,
  MaintenanceMode,
} from '../../construct';
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
  readonly assistantMessageStreamFunctionArn: string;
}

class WebStack extends NestedStack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const {
      params,
      auth,
      api,
      speechToSpeech,
      webAclId,
      mcpEndpoint,
      cert,
      assistantMessageStreamFunctionArn,
    } = props;

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
      assistantMessageStreamFunctionArn: assistantMessageStreamFunctionArn,
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
      webSearchEnabled: !!params.searchApiKey && !!params.searchEngine,
      // Frontend
      // Custom Domain
      cert: cert,
      hostName: params.hostName,
      domainName: params.domainName,
      hostedZoneId: params.hostedZoneId,
    });

    // Task 5.1: Integrate MaintenanceMode construct
    const maintenanceMode = new MaintenanceMode(this, 'MaintenanceMode', {
      distribution: web.distribution,
      environmentSuffix: params.env,
    });

    // Task 5.1: Add CloudFormation outputs for maintenance mode resources
    new CfnOutput(this, 'MaintenanceKVSArn', {
      value: maintenanceMode.kvsArn,
      description: 'ARN of the KeyValueStore for maintenance mode',
      exportName: `MaintenanceModeKVSArn-${params.env}`,
    });

    new CfnOutput(this, 'MaintenanceBucketName', {
      value: maintenanceMode.maintenanceBucketName,
      description: 'Name of the S3 bucket for maintenance page assets',
      exportName: `MaintenanceModeBucketName-${params.env}`,
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
