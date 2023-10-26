import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useCallback } from 'react';
import { BaseProps } from '../@types/common';
import Help from './Help';

type Props = BaseProps & {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  help?: string;
};

const ModalDialog: React.FC<Props> = (props) => {
  const onClose = useCallback(() => {
    if (props.onClose) {
      props.onClose();
    }
  }, [props]);

  return (
    <>
      <Transition appear show={props.isOpen} as={Fragment}>
        <Dialog
          as="div"
          className={`${props.className ?? ''} relative z-50`}
          onClose={() => onClose()}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-aws-font-color flex items-center border-b pb-2 text-lg font-medium leading-6">
                    {props.title}
                    {props.help && (
                      <Help className="ml-2" message={props.help} />
                    )}
                  </Dialog.Title>

                  <div className="mt-3">
                    <div className="text-aws-font-color/70 text-sm">
                      {props.children}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ModalDialog;
