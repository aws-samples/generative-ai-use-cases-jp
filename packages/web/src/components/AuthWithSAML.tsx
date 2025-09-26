import React, { useEffect, useState } from 'react';
import { Button, Text, Loader, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { signInWithRedirect } from 'aws-amplify/auth';
import { useTranslation } from 'react-i18next';

const samlCognitoFederatedIdentityProviderName: string = import.meta.env
  .VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME;

type Props = {
  children: React.ReactNode;
};

const AuthWithSAML: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify the authentication status
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
          <Button
            variation="primary"
            onClick={() => signIn()}
            className="mt-6 w-60">
            {t('auth.login')}
          </Button>
        </div>
      ) : (
        <>{props.children}</>
      )}
    </>
  );
};

export default AuthWithSAML;
