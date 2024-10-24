import React, { ReactNode } from 'react';
import { PiCircleNotch } from 'react-icons/pi';

type Props = {
  children: ReactNode;
};

const LoadingOverlay: React.FC<Props> = (props) => {
  return (
    <div className="bg-aws-squid-ink/50 fixed left-0 z-[9999999] flex h-screen w-screen flex-col items-center justify-center">
      <PiCircleNotch className="animate-spin text-8xl text-white" />
      <div className="text-white">{props.children}</div>
    </div>
  );
};

export default LoadingOverlay;
