import React from 'react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import { BaseProps } from '../../@types/common';
import { useTranslation } from 'react-i18next';

type Props = BaseProps & {
  isOpen: boolean;
  assistantName: string;
  currentVisibility: 'private' | 'public';
  isUpdating: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const ModalDialogVisibilityToggle: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const targetVisibility =
    props.currentVisibility === 'private' ? 'public' : 'private';

  return (
    <ModalDialog
      isOpen={props.isOpen}
      title={t('assistant.visibility.toggleTitle')}
      onClose={() => {
        props.onClose();
      }}>
      <div className="flex flex-col gap-4">
        <div>
          {t(
            `assistant.visibility.confirmToggleTo${targetVisibility === 'public' ? 'Public' : 'Private'}`,
            {
              assistantName: props.assistantName,
            }
          )}
        </div>

        {targetVisibility === 'public' && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            {t('assistant.visibility.publicWarning')}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            outlined
            onClick={() => {
              props.onClose();
            }}
            disabled={props.isUpdating}>
            {t('assistant.edit.cancel')}
          </Button>
          <Button
            className={
              targetVisibility === 'public' ? 'bg-blue-600' : 'bg-gray-600'
            }
            onClick={() => {
              props.onConfirm();
            }}
            disabled={props.isUpdating}>
            {props.isUpdating
              ? t('assistant.visibility.updating')
              : t(
                  `assistant.visibility.makeIt${targetVisibility === 'public' ? 'Public' : 'Private'}`
                )}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default ModalDialogVisibilityToggle;
