import { Amplify } from 'aws-amplify';

const samlAuthEnabled = import.meta.env.VITE_APP_SAMLAUTH_ENABLED === 'true';
const samlDomain = import.meta.env.VITE_APP_SAML_COGNITO_DOMAIN_NAME;
const samlProvider = import.meta.env
  .VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME;
const speechToSpeechEventApiEndpoint = import.meta.env
  .VITE_APP_SPEECH_TO_SPEECH_EVENT_API_ENDPOINT;
const redirectOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
      ...(samlAuthEnabled && samlDomain && samlProvider
        ? {
            loginWith: {
              oauth: {
                domain: samlDomain,
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: redirectOrigin ? [redirectOrigin] : [],
                redirectSignOut: redirectOrigin ? [redirectOrigin] : [],
                responseType: 'code',
              },
            },
          }
        : {}),
    },
  },
  API: {
    Events: {
      endpoint: speechToSpeechEventApiEndpoint,
      region: import.meta.env.VITE_APP_REGION,
      defaultAuthMode: 'userPool',
    },
  },
});
