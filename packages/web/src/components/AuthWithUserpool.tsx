import { Amplify } from 'aws-amplify';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { I18n } from 'aws-amplify/utils';
import React from 'react';

const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';

type Props = {
  children: React.ReactNode;
};
const AuthWithUserpool: React.FC<Props> = (props) => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
        identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
      },
    },
  });

  I18n.putVocabularies(translations);
  I18n.setLanguage('ja');

  return (
    <Authenticator
      hideSignUp={!selfSignUpEnabled}
      components={{
        Header: () => (
          <div className="text-aws-font-color mb-5 mt-10 flex justify-center text-3xl">
            Generative AI Use Cases on AWS
          </div>
        ),
      }}>
      {props.children}
    </Authenticator>
  );
};

export default AuthWithUserpool;
