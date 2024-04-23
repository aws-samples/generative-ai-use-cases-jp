import React, { useEffect, useState } from 'react';
import {
  useFloating,
  useDismiss,
  useInteractions,
  flip,
  shift,
  inline,
  autoUpdate,
  autoPlacement,
} from '@floating-ui/react';
import AwsLogo from '../../../assets/aws.svg?react';
import PromptList from './PromptList';
import { BaseProps } from '../../../@types/common';
import { PromptSetting } from '../../../@types/settings';

type Props = BaseProps & {
  onOpenChat: (content: string, systemContext: PromptSetting) => void;
};

const HighlightMenu: React.FC<Props> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  // Floating UIのExampleを参考に実装
  // https://floating-ui.com/docs/react-examples
  const { refs, floatingStyles, context } = useFloating({
    placement: 'bottom',
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [inline(), flip(), shift(), autoPlacement()],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);

  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (refs.floating.current?.contains(event.target as Element | null)) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        const range =
          typeof selection?.rangeCount === 'number' && selection.rangeCount > 0
            ? selection.getRangeAt(0)
            : null;

        if (selection?.isCollapsed) {
          setIsOpen(false);
          return;
        }

        if (range) {
          refs.setReference({
            getBoundingClientRect: () => range.getBoundingClientRect(),
            getClientRects: () => range.getClientRects(),
          });
          setIsOpen(true);
        }
      });
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (refs.floating.current?.contains(event.target as Element | null)) {
        return;
      }

      if (window.getSelection()?.isCollapsed) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [refs]);

  const [isOpenContextList, setIsOpenContextList] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsOpenContextList(false);
    }
  }, [isOpen]);

  const [content, setContent] = useState('');

  return (
    <div>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
          }}
          {...getFloatingProps()}
        >
          <div className="">
            {isOpenContextList ? (
              <PromptList
                onClick={(systemContext) => {
                  props.onOpenChat(content, systemContext);
                }}
              />
            ) : (
              <button
                className="py-2 rounded-full px-4 bg-aws-squid-ink text-white"
                onClick={() => {
                  setContent(window.getSelection()?.toString() ?? '');
                  setIsOpenContextList(true);
                }}
              >
                {/* Integration先のフォント設置に影響を受けるのでピクセル指定 */}
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="rounded">
                    <AwsLogo className="h-[13px]" />
                  </div>
                  <div className="inline">Bedrock連携</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightMenu;
