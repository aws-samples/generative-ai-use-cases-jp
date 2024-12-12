import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Auth,
  Api,
  Web,
  Database,
  Rag,
  RagKnowledgeBase,
  Transcribe,
  CommonWebAcl,
} from './construct';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Agent, PromptFlow } from 'generative-ai-use-cases-jp';
import { UseCaseBuilder } from './construct/use-case-builder';

const errorMessageForBooleanContext = (key: string) => {
  return `${key} の設定でエラーになりました。原因として考えられるものは以下です。
 - cdk.json の変更ではなく、-c オプションで設定しようとしている
 - cdk.json に boolean ではない値を設定している (例: "true" ダブルクォートは不要)
 - cdk.json に項目がない (未設定)`;
};

interface GenerativeAiUseCasesStackProps extends StackProps {
  webAclId?: string;
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowedCountryCodes: string[] | null;
  cert?: ICertificate;
  hostName?: string;
  domainName?: string;
  hostedZoneId?: string;
  agents?: Agent[];
  promptFlows?: PromptFlow[];
  knowledgeBaseId?: string;
  knowledgeBaseDataSourceBucketName?: string;
  guardrailIdentifier?: string;
  guardrailVersion?: string;
}

export class GenerativeAiUseCasesStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(
    scope: Construct,
    id: string,
    props: GenerativeAiUseCasesStackProps
  ) {
    super(scope, id, props);

    process.env.overrideWarningsEnabled = 'false';

    const ragEnabled: boolean = this.node.tryGetContext('ragEnabled')!;
    const ragKnowledgeBaseEnabled: boolean = this.node.tryGetContext(
      'ragKnowledgeBaseEnabled'
    )!;
    const selfSignUpEnabled: boolean =
      this.node.tryGetContext('selfSignUpEnabled')!;
    const allowedSignUpEmailDomains: string[] | null | undefined =
      this.node.tryGetContext('allowedSignUpEmailDomains');
    const samlAuthEnabled: boolean =
      this.node.tryGetContext('samlAuthEnabled')!;
    const samlCognitoDomainName: string = this.node.tryGetContext(
      'samlCognitoDomainName'
    )!;
    const samlCognitoFederatedIdentityProviderName: string =
      this.node.tryGetContext('samlCognitoFederatedIdentityProviderName')!;
    const agentEnabled = this.node.tryGetContext('agentEnabled') || false;
    const promptFlows = this.node.tryGetContext('promptFlows') || [];

    const guardrailEnabled: boolean =
      this.node.tryGetContext('guardrailEnabled') || false;
    const useCaseBuilderEnabled: boolean = this.node.tryGetContext(
      'useCaseBuilderEnabled'
    )!;

    if (typeof ragEnabled !== 'boolean') {
      throw new Error(errorMessageForBooleanContext('ragEnabled'));
    }

    if (typeof ragKnowledgeBaseEnabled !== 'boolean') {
      throw new Error(errorMessageForBooleanContext('ragKnowledgeBaseEnabled'));
    }

    if (typeof selfSignUpEnabled !== 'boolean') {
      throw new Error(errorMessageForBooleanContext('selfSignUpEnabled'));
    }

    if (typeof samlAuthEnabled !== 'boolean') {
      throw new Error(errorMessageForBooleanContext('samlAuthEnabled'));
    }

    if (typeof guardrailEnabled !== 'boolean') {
      throw new Error(
        errorMessageForBooleanContext('guardrailsForAmazonBedrockEnabled')
      );
    }

    if (typeof useCaseBuilderEnabled !== 'boolean') {
      throw new Error(errorMessageForBooleanContext('useCaseBuilderEnabled'));
    }

    const auth = new Auth(this, 'Auth', {
      selfSignUpEnabled,
      allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
      allowedSignUpEmailDomains,
      samlAuthEnabled,
    });
    const database = new Database(this, 'Database');

    const api = new Api(this, 'API', {
      userPool: auth.userPool,
      idPool: auth.idPool,
      table: database.table,
      agents: props.agents,
      guardrailIdentify: props.guardrailIdentifier,
      guardrailVersion: props.guardrailVersion,
    });

    if (
      props.allowedIpV4AddressRanges ||
      props.allowedIpV6AddressRanges ||
      props.allowedCountryCodes
    ) {
      const regionalWaf = new CommonWebAcl(this, 'RegionalWaf', {
        scope: 'REGIONAL',
        allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
        allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
        allowedCountryCodes: props.allowedCountryCodes,
      });
      new CfnWebACLAssociation(this, 'ApiWafAssociation', {
        resourceArn: api.api.deploymentStage.stageArn,
        webAclArn: regionalWaf.webAclArn,
      });
      new CfnWebACLAssociation(this, 'UserPoolWafAssociation', {
        resourceArn: auth.userPool.userPoolArn,
        webAclArn: regionalWaf.webAclArn,
      });
    }

    const web = new Web(this, 'Api', {
      apiEndpointUrl: api.api.url,
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.client.userPoolClientId,
      idPoolId: auth.idPool.identityPoolId,
      predictStreamFunctionArn: api.predictStreamFunction.functionArn,
      ragEnabled,
      ragKnowledgeBaseEnabled,
      agentEnabled,
      promptFlows,
      promptFlowStreamFunctionArn: api.invokePromptFlowFunction.functionArn,
      optimizePromptFunctionArn: api.optimizePromptFunction.functionArn,
      selfSignUpEnabled,
      webAclId: props.webAclId,
      modelRegion: api.modelRegion,
      modelIds: api.modelIds,
      imageGenerationModelIds: api.imageGenerationModelIds,
      endpointNames: api.endpointNames,
      samlAuthEnabled,
      samlCognitoDomainName,
      samlCognitoFederatedIdentityProviderName,
      agentNames: api.agentNames,
      cert: props.cert,
      hostName: props.hostName,
      domainName: props.domainName,
      hostedZoneId: props.hostedZoneId,
      useCaseBuilderEnabled,
    });

    if (ragEnabled) {
      const rag = new Rag(this, 'Rag', {
        userPool: auth.userPool,
        api: api.api,
      });

      // File API から data source の Bucket のファイルをダウンロードできるようにする
      // 既存の Kendra を import している場合、data source が S3 ではない可能性がある
      // その際は rag.dataSourceBucketName が undefined になって権限は付与されない
      if (rag.dataSourceBucketName) {
        api.allowDownloadFile(rag.dataSourceBucketName);
      }
    }

    if (ragKnowledgeBaseEnabled) {
      new RagKnowledgeBase(this, 'RagKnowledgeBase', {
        knowledgeBaseId: props.knowledgeBaseId!,
        dataSourceBucketName: props.knowledgeBaseDataSourceBucketName!,
        userPool: auth.userPool,
        api: api.api,
      });

      // File API から data source の Bucket のファイルをダウンロードできるようにする
      api.allowDownloadFile(props.knowledgeBaseDataSourceBucketName!);
    }

    if (useCaseBuilderEnabled) {
      new UseCaseBuilder(this, 'UseCaseBuilder', {
        userPool: auth.userPool,
        api: api.api,
      });
    }

    new Transcribe(this, 'Transcribe', {
      userPool: auth.userPool,
      idPool: auth.idPool,
      api: api.api,
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
    });

    if (props.hostName && props.domainName) {
      new CfnOutput(this, 'WebUrl', {
        value: `https://${props.hostName}.${props.domainName}`,
      });
    } else {
      new CfnOutput(this, 'WebUrl', {
        value: `https://${web.distribution.domainName}`,
      });
    }

    new CfnOutput(this, 'ApiEndpoint', {
      value: api.api.url,
    });

    new CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });

    new CfnOutput(this, 'UserPoolClientId', {
      value: auth.client.userPoolClientId,
    });

    new CfnOutput(this, 'IdPoolId', { value: auth.idPool.identityPoolId });

    new CfnOutput(this, 'PredictStreamFunctionArn', {
      value: api.predictStreamFunction.functionArn,
    });

    new CfnOutput(this, 'OptimizePromptFunctionArn', {
      value: api.optimizePromptFunction.functionArn,
    });

    new CfnOutput(this, 'InvokePromptFlowFunctionArn', {
      value: api.invokePromptFlowFunction.functionArn,
    });

    new CfnOutput(this, 'PromptFlows', {
      value: Buffer.from(JSON.stringify(promptFlows)).toString('base64'),
    });

    new CfnOutput(this, 'RagEnabled', {
      value: ragEnabled.toString(),
    });

    new CfnOutput(this, 'RagKnowledgeBaseEnabled', {
      value: ragKnowledgeBaseEnabled.toString(),
    });

    new CfnOutput(this, 'AgentEnabled', {
      value: agentEnabled.toString(),
    });

    new CfnOutput(this, 'SelfSignUpEnabled', {
      value: selfSignUpEnabled.toString(),
    });

    new CfnOutput(this, 'ModelRegion', {
      value: api.modelRegion,
    });

    new CfnOutput(this, 'ModelIds', {
      value: JSON.stringify(api.modelIds),
    });

    new CfnOutput(this, 'ImageGenerateModelIds', {
      value: JSON.stringify(api.imageGenerationModelIds),
    });

    new CfnOutput(this, 'EndpointNames', {
      value: JSON.stringify(api.endpointNames),
    });

    new CfnOutput(this, 'SamlAuthEnabled', {
      value: samlAuthEnabled.toString(),
    });

    new CfnOutput(this, 'SamlCognitoDomainName', {
      value: samlCognitoDomainName.toString(),
    });

    new CfnOutput(this, 'SamlCognitoFederatedIdentityProviderName', {
      value: samlCognitoFederatedIdentityProviderName.toString(),
    });

    new CfnOutput(this, 'AgentNames', {
      value: JSON.stringify(api.agentNames),
    });

    new CfnOutput(this, 'UseCaseBuilderEnabled', {
      value: useCaseBuilderEnabled.toString(),
    });

    this.userPool = auth.userPool;
    this.userPoolClient = auth.client;
  }
}
