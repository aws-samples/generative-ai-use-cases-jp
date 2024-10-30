import React from 'react';
import { BaseProps } from '../../@types/common';
import { PiLinkBold, PiLockKey } from 'react-icons/pi';
import Button from '../Button';

type Props = BaseProps & {
  hasShared: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const ButtonShare: React.FC<Props> = (props) => {
  return (
    <Button
      outlined
      className={`${props.className ?? ''} text-xs ${props.hasShared ? 'font-bold' : ''}`}
      disabled={props.disabled}
      onClick={() => {
        props.onClick();
      }}>
      {props.hasShared ? (
        <>
          <PiLinkBold className="mr-2" />
          共有中
        </>
      ) : (
        <>
          <PiLockKey className="mr-2" />
          非公開
        </>
      )}
    </Button>
  );
};

export default ButtonShare;
