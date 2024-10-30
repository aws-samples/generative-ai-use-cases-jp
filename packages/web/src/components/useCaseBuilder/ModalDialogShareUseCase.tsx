import React, { useMemo } from 'react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import { BaseProps } from '../../@types/common';
import Switch from '../Switch';
import InputText from '../InputText';
import ButtonCopy from '../ButtonCopy';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../../main';

type Props = BaseProps & {
  isOpen: boolean;
  hasShared: boolean;
  useCaseId: string;
  onToggleShared: () => void;
  onClose: () => void;
};

const ModalDialogShareUseCase: React.FC<Props> = (props) => {
  const shareUrl = useMemo(() => {
    return `${window.location.origin}${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${props.useCaseId}`;
  }, [props.useCaseId]);

  return (
    <ModalDialog
      isOpen={props.isOpen}
      title="共有"
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Switch
            checked={props.hasShared}
            className="text-xl"
            label={
              props.hasShared
                ? 'このユースケースは共有されているため、誰でも利用できます。'
                : 'このユースケースは共有されていないため、あなたしか利用できません。'
            }
            onSwitch={() => {
              props.onToggleShared();
            }}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex grow ">
            <InputText
              className="grow"
              label="共有URL"
              value={props.hasShared ? shareUrl : ''}
            />
            <ButtonCopy
              className="ml-2 mt-4"
              disabled={!props.hasShared}
              text={shareUrl}
            />
          </div>
          <div className="text-sm">
            {props.hasShared
              ? '共有URLにアクセスすることで、他のユーザーも利用できます。'
              : '共有URLが発行されていません。'}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              props.onClose();
            }}>
            OK
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default ModalDialogShareUseCase;
