import { Authenticator, translations } from '@aws-amplify/ui-react';
import { I18n } from 'aws-amplify/utils';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';

type Props = {
  children: React.ReactNode;
};
const AuthWithUserpool: React.FC<Props> = (props) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    I18n.putVocabularies(translations);
    I18n.setLanguage(i18n.language === 'ja' ? 'ja' : 'en');
  }, [i18n.language]);

  return (
    <Authenticator
      hideSignUp={!selfSignUpEnabled}
      components={{
        Header: () => (
          <div className="text-aws-font-color mb-5 mt-10 flex justify-center text-3xl">
            {t('auth.title')}
          </div>
        ),
      }}>
      {props.children}
    </Authenticator>
  );
};

export default AuthWithUserpool;
