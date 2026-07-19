import { SystemContext } from './chat';

export type Settings = {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  lambdaArn: string;
  region: string;
  apiEndpoint: string;
  enabledSamlAuth: boolean;
  enabledSelfSignUp: boolean;
  cognitoDomain?: string;
  federatedIdentityProviderName?: string;
  modelIds?: string;
  modelId?: string;
};

export type PromptSetting = SystemContext & {
  ignoreHistory?: boolean;
  directSend?: boolean;
  useForm?: boolean;
  initializeMessages?: boolean;
  formDefinitions?: {
    label: string;
    tag: string;
    autoCopy: boolean;
  }[];
};
