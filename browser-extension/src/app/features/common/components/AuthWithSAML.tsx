import React, { useEffect, useState } from 'react';
import { Button, Text, Loader, useAuthenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { signInWithRedirect } from 'aws-amplify/auth';
import useSettings from '../../settings/useSettings';

type Props = {
  children: React.ReactNode;
};

const AuthWithSAML: React.FC<Props> = (props) => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const { settings } = useSettings();

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証状態の検証
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
    console.log('Login');
    signInWithRedirect({
      provider: {
        custom: settings?.federatedIdentityProviderName ?? '',
      },
    })
      .then((data) => {
        console.log('success', data);
      })
      .catch((err) => {
        console.log('error', err);
      });
  };

  useEffect(() => {
    if (settings?.cognitoDomain) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
            identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
            loginWith: {
              oauth: {
                domain: settings.cognitoDomain,
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: [window.location.origin],
                redirectSignOut: [window.location.origin],
                responseType: 'code',
              },
            },
          },
        },
      });
    }
  }, [settings]);

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Text className="mt-12 text-center">Loading...</Text>
          <Loader width="5rem" height="5rem" />
        </div>
      ) : !authenticated ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Button variation="primary" onClick={() => signIn()} className="mt-6 w-60">
            ログイン
          </Button>
        </div>
      ) : (
        <>{props.children}</>
      )}
    </>
  );
};

export default AuthWithSAML;
