import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { PiX } from 'react-icons/pi';

type Props = {
  isOpen: boolean;
  userEmail: string;
  onDelete: () => void;
  onClose: () => void;
  isDeleting?: boolean;
};

const DialogConfirmDeleteAccount: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const [emailInput, setEmailInput] = useState('');
  const [deleteInput, setDeleteInput] = useState('');

  // Reset inputs when dialog opens/closes
  useEffect(() => {
    if (!props.isOpen) {
      setEmailInput('');
      setDeleteInput('');
    }
  }, [props.isOpen]);

  const isValid = emailInput === props.userEmail && deleteInput === 'DELETE';

  return (
    <Dialog.Root
      open={props.isOpen}
      onOpenChange={(open: boolean) => !open && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[60] bg-black/30" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {t('settings.deleteAccountConfirmTitle')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none"
                aria-label={t('common.close')}>
                <PiX className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            {t('settings.deleteAccountConfirmDescription')}
          </Dialog.Description>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('settings.deleteAccountEmailLabel')}
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={props.userEmail}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                disabled={props.isDeleting}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('settings.deleteAccountDeleteLabel')}
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                disabled={props.isDeleting}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={props.onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={props.isDeleting}>
              {t('settings.deleteAccountCancel')}
            </button>
            <button
              onClick={props.onDelete}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
              disabled={!isValid || props.isDeleting}>
              {props.isDeleting
                ? t('common.loading')
                : t('settings.deleteAccountConfirm')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DialogConfirmDeleteAccount;
