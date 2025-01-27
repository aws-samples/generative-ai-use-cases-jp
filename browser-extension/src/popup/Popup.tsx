import Browser from 'webextension-polyfill';
import Button from '../app/features/common/components/Button';
import AwsLogo from '../assets/aws.svg?react';
import { MessagePayload } from '../@types/extension-message';

const Popup = () => {
  return (
    <div className="bg-aws-squid-ink w-[25rem] text-white p-3 flex flex-col gap-3 items-center rounded">
      <div className="flex font-bold justify-center text-base items-center gap-2">
        <AwsLogo className="w-6" />
        GenU 拡張機能
      </div>
      <div className="">
        <Button
          onClick={() => {
            Browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
              Browser.tabs.sendMessage(tab.id ?? 0, {
                type: 'CHAT-OPEN',
              } as MessagePayload);
            });
          }}
        >
          拡張機能を開く
        </Button>
      </div>
    </div>
  );
};

export default Popup;
