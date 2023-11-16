import React from 'react';
import { BaseProps } from '../@types/common';
import Button from './Button';
import ModalDialog from './ModalDialog';
import { Chat } from 'generative-ai-use-cases-jp';
import { decomposeChatId } from '../utils/ChatUtils';
import { I18n } from 'aws-amplify';

type Props = BaseProps & {
  isOpen: boolean;
  target?: Chat;
  onDelete: (chatId: string) => void;
  onClose: () => void;
};

const DialogConfirmDeleteChat: React.FC<Props> = (props) => {
  return (
    <ModalDialog {...props} title={I18n.get('cut_confirmation')}> {/*"削除確認">*/}
      <div>
        {I18n.get("chats")}
        <span className="font-bold">「{props.target?.title}」</span>
        {I18n.get("delete_confirmation")}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button outlined onClick={props.onClose} className="p-2">
          {I18n.get("cancel")}
        </Button>
        <Button
          onClick={() => {
            props.onDelete(decomposeChatId(props.target?.chatId ?? '') ?? '');
          }}
          className="bg-red-500 p-2 text-white">
          {I18n.get("delete")}
        </Button>
      </div>
    </ModalDialog>
  );
};

export default DialogConfirmDeleteChat;
