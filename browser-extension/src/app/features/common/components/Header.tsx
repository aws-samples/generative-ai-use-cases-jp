import React from 'react';
import { PiGear, PiListPlus, PiX } from 'react-icons/pi';
import useAuth from '../hooks/useAuth';
import ButtonIcon from './ButtonIcon';

type Props = {
  onClickPromptSettings: () => void;
  onClickSettings: () => void;
  onClickClose: () => void;
};

const Header: React.FC<Props> = (props) => {
  const { hasAuthrized } = useAuth();
  return (
    <div className="fixed top-0 w-full z-50">
      <div className="relative h-12 flex items-center justify-between bg-aws-squid-ink p-2 brightness-150">
        <div className="text-lg font-bold ml-3">Bedrock 連携</div>
        <div className="flex items-center">
          {hasAuthrized && (
            <ButtonIcon onClick={props.onClickPromptSettings}>
              <PiListPlus />
            </ButtonIcon>
          )}
          <ButtonIcon onClick={props.onClickSettings}>
            <PiGear />
          </ButtonIcon>
          <ButtonIcon onClick={props.onClickClose}>
            <PiX />
          </ButtonIcon>
        </div>
      </div>
    </div>
  );
};

export default Header;
