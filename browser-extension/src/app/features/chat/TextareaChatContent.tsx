import React, { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { BaseProps } from '../../../@types/common';

const MAX_HEIGHT = 300;

type Props = BaseProps & {
  value: string;
  onChange: (val: string) => void;
  onSend?: () => void;
};

const TextareaChatContent: React.FC<Props> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.style.height = 'auto';

    if (MAX_HEIGHT > 0 && ref.current.scrollHeight > MAX_HEIGHT) {
      ref.current.style.height = MAX_HEIGHT + 'px';
      setIsMax(true);
    } else {
      ref.current.style.height = ref.current.scrollHeight + 'px';
      setIsMax(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  useEffect(() => {
    if (!props.onSend) {
      return;
    }

    const current = ref.current;
    if (!current) {
      return;
    }

    const listener = (e: DocumentEventMap['keypress']) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        props.onSend ? props.onSend() : null;
      }
    };

    current.addEventListener('keypress', listener);

    return () => {
      if (current) {
        current.removeEventListener('keypress', listener);
      }
    };
  }, [props]);

  return (
    <textarea
      ref={ref}
      className={twMerge(
        props.className,
        'w-full resize-none outline-none pr-12 bg-aws-squid-ink brightness-150 border rounded',
        isMax ? 'overflow-y-auto' : 'overflow-hidden',
      )}
      rows={3}
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value);
      }}
    />
  );
};

export default TextareaChatContent;
