import { Authenticator } from '@aws-amplify/ui-react';
import React from 'react';
import useSettings from '../../settings/useSettings';
import AuthWithUserPool from './AuthWithUserPool';
import AuthWithSAML from './AuthWithSAML';

type Props = {
  children: React.ReactNode;
};

const RequiresAuth: React.FC<Props> = (props) => {
  const { settings } = useSettings();

  return (
    <Authenticator.Provider>
      {settings?.enabledSamlAuth && <AuthWithSAML>{props.children}</AuthWithSAML>}
      {!settings?.enabledSamlAuth && <AuthWithUserPool>{props.children}</AuthWithUserPool>}
    </Authenticator.Provider>
  );
};

export default RequiresAuth;
