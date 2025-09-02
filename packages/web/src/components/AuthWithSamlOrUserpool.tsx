import React, { useEffect, useState } from 'react';
import {
  Authenticator,
  Button,
  Loader,
  Text,
  translations,
  useAuthenticator,
} from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { signInWithRedirect } from 'aws-amplify/auth';
import { I18n } from 'aws-amplify/utils';
import { useTranslation } from 'react-i18next';

const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';
const samlCognitoDomainName: string = import.meta.env
  .VITE_APP_SAML_COGNITO_DOMAIN_NAME;
const samlCognitoFederatedIdentityProviderName: string = import.meta.env
  .VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME;
const speechToSpeechEventApiEndpoint: string = import.meta.env
  .VITE_APP_SPEECH_TO_SPEECH_EVENT_API_ENDPOINT;

type Props = {
  children: React.ReactNode;
};

const AuthWithSamlOrUserpool: React.FC<Props> = (props) => {
  const { t, i18n } = useTranslation();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === 'configuring') {
      setLoading(true);
      setAuthenticated(false);
    } else if (authStatus === 'authenticated') {
      setLoading(false);
      setAuthenticated(true);
    } else {
      setLoading(false);
      setAuthenticated(false);
    }
  }, [authStatus]);

  const signIn = () => {
    signInWithRedirect({
      provider: {
        custom: samlCognitoFederatedIdentityProviderName,
      },
    });
  };

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
        identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
        loginWith: {
          oauth: {
            domain: samlCognitoDomainName,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [window.location.origin],
            redirectSignOut: [window.location.origin],
            responseType: 'code',
          },
        },
      },
    },
    API: {
      Events: {
        endpoint: speechToSpeechEventApiEndpoint,
        region: process.env.VITE_APP_REGION!,
        defaultAuthMode: 'userPool',
      },
    },
  });

  I18n.putVocabularies(translations);
  I18n.setLanguage(i18n.language === 'ja' ? 'ja' : 'en');

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Text className="mt-12 text-center">{t('auth.loading')}</Text>
          <Loader width="5rem" height="5rem" />
        </div>
      ) : !authenticated ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Text className="mt-12 text-center text-3xl">{t('auth.title')}</Text>
          <Authenticator
            hideSignUp={!selfSignUpEnabled}
            components={{
              Header: () => null,
            }}
          />
          <Button
            variation="primary"
            onClick={() => signIn()}
            className="mt-6 w-60">
            {t('auth.loginWith', { provider: samlCognitoFederatedIdentityProviderName })}
          </Button>
        </div>
      ) : (
        <>{props.children}</>
      )}
    </>
  );
};

export default AuthWithSamlOrUserpool;
