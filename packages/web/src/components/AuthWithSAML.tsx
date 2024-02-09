import React, { useEffect, useState } from 'react';
import App from '../App.tsx';
import { Button, Text, Loader } from '@aws-amplify/ui-react';
import { Amplify, Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

const samlCognitoDomainName: string = import.meta.env
  .VITE_APP_SAML_COGNITO_DOMAIN_NAME;
const samlCognitoFederatedIdentityProviderName: string = import.meta.env
  .VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PROVIDER_NAME;

const AuthWithSAML: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 未ログインの場合は、ログイン画面を表示する
  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(() => {
        setAuthenticated(true);
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => {
        setLoading(false); // 認証チェックが完了したらローディングを終了
      });
  }, []);

  const signIn = () => {
    Auth.federatedSignIn({
      customProvider: samlCognitoFederatedIdentityProviderName,
    }); // cdk.json の値を指定
  };

  Amplify.configure({
    Auth: {
      region: import.meta.env.VITE_APP_REGION,
      userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
      userPoolWebClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
      oauth: {
        domain: samlCognitoDomainName, // cdk.json の値を指定
        scope: ['openid', 'email', 'profile'],
        // CloudFront で展開している Web ページを動的に取得
        redirectSignIn: window.location.origin,
        redirectSignOut: window.location.origin,
        responseType: 'code',
      },
    },
  });

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Text className="mt-12 text-center">Loading...</Text>
          <Loader width="5rem" height="5rem" />
        </div>
      ) : !authenticated ? (
        <div className="grid grid-cols-1 justify-items-center gap-4">
          <Text className="mt-12 text-center text-3xl">
            Generative AI Use Cases on AWS
          </Text>
          <Button
            variation="primary"
            onClick={() => signIn()}
            className="mt-6 w-60">
            ログイン
          </Button>
        </div>
      ) : (
        <App />
      )}
    </>
  );
};

export default AuthWithSAML;
