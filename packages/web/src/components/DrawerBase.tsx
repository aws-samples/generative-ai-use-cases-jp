import React, { ReactNode, useMemo } from 'react';
import { BaseProps } from '../@types/common';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import useVersion from '../hooks/useVersion';
import IconWithDot from './IconWithDot';
import { PiGear } from 'react-icons/pi';
import { fetchAuthSession } from 'aws-amplify/auth';

type Props = BaseProps & {
  children: ReactNode;
};

const DrawerBase: React.FC<Props> = (props) => {
  const { getHasUpdate } = useVersion();

  // 第一引数は不要だが、ないとリクエストされないため 'user' 文字列を入れる
  const { data } = useSWR('user', () => {
    return fetchAuthSession();
  });

  const email = useMemo<string>(() => {
    return (data?.tokens?.idToken?.payload.email ?? '') as string;
  }, [data]);

  const hasUpdate = getHasUpdate();

  return (
    <>
      <nav
        className={`bg-aws-squid-ink flex h-screen w-64 flex-col justify-between text-sm text-white  print:hidden`}>
        {props.children}
        <div className="flex items-center justify-between gap-2 border-t border-gray-400 px-3 py-2">
          <Link
            to="/setting"
            className="mr-2 overflow-x-hidden hover:brightness-75">
            <span className="text-sm">{email}</span>
          </Link>
          <Link to="/setting">
            <IconWithDot showDot={hasUpdate}>
              <PiGear className="text-lg" />
            </IconWithDot>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default DrawerBase;
