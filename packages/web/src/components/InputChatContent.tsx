import React, { useMemo } from 'react';
import ButtonSend from './ButtonSend';
import Textarea from './Textarea';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import Button from './Button';
import { PiArrowsCounterClockwise } from 'react-icons/pi';

type Props = {
  content: string;
  disabled?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
  resetDisabled?: boolean;
  loading?: boolean;
  onChangeContent: (content: string) => void;
  onSend: () => void;
  sendIcon?: React.ReactNode;
  // ページ下部以外で使う時に margin bottom を無効化するためのオプション
  disableMarginBottom?: boolean;
} & (
  | {
      hideReset?: false;
      onReset: () => void;
    }
  | {
      hideReset: true;
    }
);

const InputChatContent: React.FC<Props> = (props) => {
  const { pathname } = useLocation();
  const { loading: chatLoading, isEmpty } = useChat(pathname);

  const loading = useMemo(() => {
    return props.loading === undefined ? chatLoading : props.loading;
  }, [chatLoading, props.loading]);

  const disabledSend = useMemo(() => {
    return props.content === '' || props.disabled;
  }, [props.content, props.disabled]);

  return (
    <div
      className={`${
        props.fullWidth ? 'w-full' : 'w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6'
      }`}>
      <div
        className={`relative flex items-end rounded-xl border border-black/10 bg-gray-100 shadow-[0_0_30px_1px] shadow-gray-400/40 ${
          props.disableMarginBottom ? '' : 'mb-7'
        }`}>
        <Textarea
          className="scrollbar-thumb-gray-200 scrollbar-thin m-2 -mr-14 bg-transparent pr-14 "
          placeholder={props.placeholder ?? '入力してください'}
          noBorder
          notItem
          value={props.content}
          onChange={props.onChangeContent}
          onEnter={disabledSend ? undefined : props.onSend}
        />
        <ButtonSend
          className="m-2 align-bottom"
          disabled={disabledSend}
          loading={loading}
          onClick={props.onSend}
          icon={props.sendIcon}
        />
        {!isEmpty && !props.resetDisabled && !props.hideReset && (
          <Button
            className="absolute -top-14 right-0 p-2 text-sm"
            outlined
            disabled={loading}
            onClick={props.onReset}>
            <PiArrowsCounterClockwise className="mr-2" />
            最初からやり直す
          </Button>
        )}
      </div>
    </div>
  );
};

export default InputChatContent;
