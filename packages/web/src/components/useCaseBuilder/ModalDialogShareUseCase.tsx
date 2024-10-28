import React from 'react';
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
  return (
    <ModalDialog
      isOpen={props.isOpen}
      title="共有"
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Switch
            checked={props.hasShared}
            label=""
            onSwitch={() => {
              props.onToggleShared();
            }}
          />
          {props.hasShared
            ? 'このユースケースは共有されています。共有URLにアクセスすることで、他のユーザーも利用できます。'
            : '共有を有効化すると、あなた以外もユースケースを利用できるようになります。'}
        </div>
        {props.hasShared && (
          <div className="flex grow ">
            <InputText
              className="grow"
              label="共有URL"
              value={`${window.location.origin}${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${props.useCaseId}`}
            />
            <ButtonCopy
              className="ml-2 mt-4"
              text={`${window.location.origin}${ROUTE_INDEX_USE_CASE_BUILDER}/execute/${props.useCaseId}`}
            />
          </div>
        )}
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
