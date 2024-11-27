import React from 'react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import { BaseProps } from '../../@types/common';
import Alert from '../Alert';

type Props = BaseProps & {
  isOpen: boolean;
  targetLabel: string;
  isShared?: boolean;
  onDelete: () => void;
  onClose: () => void;
};

const ModalDialogDeleteUseCase: React.FC<Props> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      title="Delete use case"
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-2">
        {props.isShared && (
          <Alert severity="warning" className="mb-2">
            This use case is shared. If deleted, all users will no longer be able to use this use case.
          </Alert>
        )}
        <div>
          Are you sure to delete <strong>{props.targetLabel}</strong>?
        </div>

        <div className="flex justify-end gap-2">
          <Button
            outlined
            onClick={() => {
              props.onClose();
            }}>
            Cancel
          </Button>
          <Button
            className="bg-red-600"
            onClick={() => {
              props.onDelete();
            }}>
            Delete
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default ModalDialogDeleteUseCase;
