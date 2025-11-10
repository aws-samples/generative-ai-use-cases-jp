import React from 'react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import { BaseProps } from '../../@types/common';
import { useTranslation } from 'react-i18next';

type Props = BaseProps & {
  isOpen: boolean;
  assistantName: string;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
};

const ModalDialogDeleteAssistant: React.FC<Props> = (props) => {
  const { t } = useTranslation();

  return (
    <ModalDialog
      isOpen={props.isOpen}
      title={t('assistant.deleteTitle')}
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-2">
        <div>
          {t('assistant.deleteConfirmation', { assistantName: props.assistantName })}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            outlined
            onClick={() => {
              props.onClose();
            }}
            disabled={props.deleting}>
            {t('assistant.edit.cancel')}
          </Button>
          <Button
            className="bg-red-600"
            onClick={() => {
              props.onDelete();
            }}
            disabled={props.deleting}>
            {props.deleting ? t('assistant.deleting') : t('assistant.delete')}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default ModalDialogDeleteAssistant;
