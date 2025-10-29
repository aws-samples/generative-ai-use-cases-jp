import React from 'react';
import ModalDialog from './ModalDialog';
import Button from './Button';
import { useTranslation } from 'react-i18next';

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const NavigationBlockDialog: React.FC<Props> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <ModalDialog
      isOpen={isOpen}
      title={t('dialog.unsavedChanges.title')}
      onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div>{t('dialog.unsavedChanges.message')}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} className="p-2">
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} className="bg-red-500 p-2">
            {t('dialog.unsavedChanges.leave')}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default NavigationBlockDialog;
