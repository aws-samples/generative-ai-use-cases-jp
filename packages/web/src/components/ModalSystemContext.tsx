import React from 'react';
import ModalDialog from './ModalDialog';
import { BaseProps } from '../@types/common';
import Textarea from './Textarea';
import Button from './Button';

type Props = BaseProps & {
  showSystemContextModal: boolean;
  saveSystemContext: string;
  saveSystemContextTitle: string;
  setShowSystemContextModal: (show: boolean) => void;
  setSaveSystemContext: (systemContext: string) => void;
  setSaveSystemContextTitle: (title: string) => void;
  onCreateSystemContext: () => void;
};

const ModalSystemContext: React.FC<Props> = (props) => {
  return (
    <>
      <ModalDialog
        title="システムプロンプトの作成"
        isOpen={props.showSystemContextModal}
        onClose={() => {
          props.setShowSystemContextModal(false);
        }}>
        <div className="py-2.5">タイトル</div>

        <Textarea
          placeholder="入力してください"
          value={props.saveSystemContextTitle}
          onChange={props.setSaveSystemContextTitle}
          maxHeight={-1}
          className="text-aws-font-color"
        />

        <div className="py-2.5">システムプロンプト</div>
        <Textarea
          placeholder="入力してください"
          value={props.saveSystemContext}
          onChange={props.setSaveSystemContext}
          maxHeight={500}
          className="text-aws-font-color"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button
            outlined
            onClick={() => props.setShowSystemContextModal(false)}
            className="p-2">
            キャンセル
          </Button>
          <Button
            onClick={() => {
              props.setShowSystemContextModal(false);
              props.onCreateSystemContext();
            }}
            className="bg-red-500 p-2 text-white"
            disabled={
              props.saveSystemContext === '' ||
              props.saveSystemContextTitle === ''
            }>
            作成
          </Button>
        </div>
      </ModalDialog>
    </>
  );
};

export default ModalSystemContext;
