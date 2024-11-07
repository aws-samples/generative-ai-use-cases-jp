import React from 'react';
import { BaseProps } from '../@types/common';
import Button from './Button';
import ModalDialog from './ModalDialog';
import { Chat } from 'generative-ai-use-cases-jp';
import { decomposeId } from '../utils/ChatUtils';

type Props = BaseProps & {
  isOpen: boolean;
  target?: Chat;
  onDelete: (chatId: string) => void;
  onClose: () => void;
};

const DialogConfirmDeleteChat: React.FC<Props> = (props) => {
  return (
    <ModalDialog {...props} title="Delete confirmation">
      <div>
        Are you sure you want to delete the chat "{props.target?.title}"?
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button outlined onClick={props.onClose} className="p-2">
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onDelete(decomposeId(props.target?.chatId ?? '') ?? '');
          }}
          className="bg-red-500 p-2 text-white">
          Delete
        </Button>
      </div>
    </ModalDialog>
  );
};

export default DialogConfirmDeleteChat;
