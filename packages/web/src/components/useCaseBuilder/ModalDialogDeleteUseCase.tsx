import React from 'react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import { BaseProps } from '../../@types/common';

type Props = BaseProps & {
  isOpen: boolean;
  targetLabel: string;
  onDelete: () => void;
  onClose: () => void;
};

const ModalDialogDeleteUseCase: React.FC<Props> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      title="マイユースケースの削除"
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-2">
        <div>
          <strong>{props.targetLabel}</strong>を削除しますか？
        </div>
        <div className="flex justify-end gap-2">
          <Button
            outlined
            onClick={() => {
              props.onClose();
            }}>
            キャンセル
          </Button>
          <Button
            className="bg-red-600"
            onClick={() => {
              props.onDelete();
            }}>
            削除
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default ModalDialogDeleteUseCase;
