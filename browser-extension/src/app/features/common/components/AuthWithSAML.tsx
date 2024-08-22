import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import useSettings from '../../settings/useSettings';
import Browser from 'webextension-polyfill';
import useAuth from '../hooks/useAuth';
import Button from './Button';
import { PiCircleNotchBold } from 'react-icons/pi';

type Props = {
  children: React.ReactNode;
};

const AuthWithSAML: React.FC<Props> = (props) => {
  const { settings } = useSettings();
  const { loading, authenticate, hasAuthenticated } = useAuth();

  useEffect(() => {
    if (settings) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
            identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
            loginWith: {
              oauth: {
                domain: settings.cognitoDomain ?? '',
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: [window.location.origin],
                redirectSignOut: [window.location.origin],
                responseType: 'code',
              },
            },
          },
        },
      });
      // 認証の設定をしたら認証を実行
      authenticate();
    }
  }, [authenticate, settings]);

  const signIn = () => {
    const url = Browser.runtime.getURL('/');
    Browser.tabs.create({ url });
  };

  return (
    <div className="flex justify-center mt-3">
      {loading ? (
        <div>
          <div className="italic">Loading...</div>
          <PiCircleNotchBold className="text-6xl animate-spin" />
        </div>
      ) : !hasAuthenticated ? (
        <div>
          <Button onClick={() => signIn()}>ログイン画面へ</Button>
        </div>
      ) : (
        <>{props.children}</>
      )}
    </div>
  );
};

export default AuthWithSAML;
