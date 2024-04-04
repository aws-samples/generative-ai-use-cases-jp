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
    <ModalDialog {...props} title="削除確認">
      <div>
        チャット
        <span className="font-bold">「{props.target?.title}」</span>
        を削除しますか？
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
          削除
        </Button>
      </div>
    </ModalDialog>
  );
};

export default DialogConfirmDeleteChat;
