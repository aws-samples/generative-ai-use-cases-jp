import React from 'react';
import { BaseProps } from '../@types/common';
import Button from './Button';
import ModalDialog from './ModalDialog';
import { useTranslation } from 'react-i18next';

type Props = BaseProps & {
  isOpen: boolean;
  onDelete: () => void;
  onClose: () => void;
};

const DialogConfirmDeleteAllChats: React.FC<Props> = (props) => {
  const { t } = useTranslation();

  return (
    <ModalDialog {...props} title={t('chat.delete_confirmation')}>
      <div>{t('setting.items.delete_all_chats_confirmation')}</div>

      <div className="mt-4 flex justify-end gap-2">
        <Button outlined onClick={props.onClose} className="p-2">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => {
            props.onDelete();
          }}
          className="bg-red-500 p-2 text-white">
          {t('common.delete')}
        </Button>
      </div>
    </ModalDialog>
  );
};

export default DialogConfirmDeleteAllChats;
