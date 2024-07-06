import { Authenticator, translations } from '@aws-amplify/ui-react';
import React, { useEffect, useMemo } from 'react';
import useSettings from '../../settings/useSettings';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';

type Props = {
  children: React.ReactNode;
};

const AuthWithUserPool: React.FC<Props> = (props) => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: settings.userPoolId,
            userPoolClientId: settings.userPoolClientId,
            identityPoolId: settings.identityPoolId,
          },
        },
      });
    }
  }, [settings]);

  const enabledSelfSignUp = useMemo(() => {
    return settings?.enabledSelfSignUp ?? false;
  }, [settings?.enabledSelfSignUp]);

  I18n.putVocabularies(translations);
  I18n.setLanguage('ja');

  return <Authenticator hideSignUp={!enabledSelfSignUp}>{props.children}</Authenticator>;
};

export default AuthWithUserPool;
