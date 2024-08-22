import React from 'react';
import useSettings from '../../settings/useSettings';
import AuthWithUserPool from './AuthWithUserPool';
import AuthWithSAML from './AuthWithSAML';
import { PiCircleNotchBold } from 'react-icons/pi';

type Props = {
  children: React.ReactNode;
};

const RequiresAuth: React.FC<Props> = (props) => {
  const { settings } = useSettings();

  return (
    <>
      {!settings ? (
        <div className="flex flex-col items-center">
          <div className="italic">Loading...</div>
          <PiCircleNotchBold className="text-6xl animate-spin" />
        </div>
      ) : (
        <>
          {settings.enabledSamlAuth && <AuthWithSAML>{props.children}</AuthWithSAML>}
          {!settings.enabledSamlAuth && <AuthWithUserPool>{props.children}</AuthWithUserPool>}
        </>
      )}
    </>
  );
};

export default RequiresAuth;
