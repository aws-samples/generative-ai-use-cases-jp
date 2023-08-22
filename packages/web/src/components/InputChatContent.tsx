import React, { useEffect, useMemo } from 'react';
import ButtonSend from './ButtonSend';
import Textarea from './Textarea';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import Button from './Button';
import { PiArrowArcLeft } from 'react-icons/pi';

type Props = {
  content: string;
  disabled?: boolean;
  placeholder?: string;
  onChangeContent: (content: string) => void;
  onSend: () => void;
  onReset: () => void;
};

const InputChatContent: React.FC<Props> = (props) => {
  const { pathname } = useLocation();
  const { loading, isEmpty } = useChat(pathname);

  const disabledSend = useMemo(() => {
    return props.content === '' || props.disabled;
  }, [props.content, props.disabled]);

  useEffect(() => {
    const listener = (e: DocumentEventMap['keypress']) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        if (!disabledSend) {
          props.onSend();
        }
      }
    };
    document
      .getElementById('input-chat-content')
      ?.addEventListener('keypress', listener);

    return () => {
      document
        .getElementById('input-chat-content')
        ?.removeEventListener('keypress', listener);
    };
  });

  return (
    <>
      <div
        id="input-chat-content"
        className="relative mb-7 flex w-11/12 items-end rounded-xl border border-black/10 bg-white shadow-[0_0_30px_7px] shadow-gray-400/50 md:w-10/12 lg:w-4/6 xl:w-3/6">
        <Textarea
          className="scrollbar-thumb-gray-200 scrollbar-thin m-2 -mr-14 bg-transparent pr-14 "
          placeholder={props.placeholder ?? '入力してください'}
          noBorder
          notItem
          value={props.content}
          onChange={props.onChangeContent}
        />
        <ButtonSend
          className="m-2 align-bottom"
          disabled={disabledSend}
          loading={loading}
          onClick={props.onSend}
        />
        {!isEmpty && (
          <Button
            className="absolute -top-12 right-0 p-2 text-sm"
            outlined
            disabled={loading}
            onClick={props.onReset}>
            <PiArrowArcLeft className="mr-2" />
            最初からやり直す
          </Button>
        )}
      </div>
    </>
  );
};

export default InputChatContent;
