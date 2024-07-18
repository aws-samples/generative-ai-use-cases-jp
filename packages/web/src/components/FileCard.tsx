import React from 'react';
import { BaseProps } from '../@types/common';
import ButtonIcon from './ButtonIcon';
import { PiSpinnerGap, PiX } from 'react-icons/pi';

type Props = BaseProps & {
  filename?: string;
  url?: string;
  loading?: boolean;
  size: 's' | 'm';
  onDelete?: () => void;
};

const FileCard: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      <div className="group relative cursor-pointer">
        <div
          className={`border-aws-squid-ink/50 bg-aws-squid-ink/20 w-32 break-all rounded border object-cover object-center ${props.size === 's' ? 'max-h-24' : 'max-h-32'}`}>
          {props.url ? (
            <a href={props.url}>{props.filename}</a>
          ) : (
            props.filename
          )}
        </div>
        {props.loading && (
          <div className="bg-aws-squid-ink/20 absolute top-0 flex h-full w-full items-center justify-center rounded">
            <PiSpinnerGap className="animate-spin text-4xl text-white" />
          </div>
        )}
        {props.onDelete && !props.loading && (
          <ButtonIcon
            className={`invisible absolute right-0 top-0 m-0.5 border bg-white text-xs group-hover:visible `}
            onClick={props.onDelete}>
            <PiX />
          </ButtonIcon>
        )}
      </div>
    </div>
  );
};

export default FileCard;
