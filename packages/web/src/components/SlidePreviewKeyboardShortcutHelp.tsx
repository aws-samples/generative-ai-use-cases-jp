import React, { useState } from 'react';
import { PiKeyboard } from 'react-icons/pi';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

const KBD = ({ children }: { children: React.ReactNode }) => {
  return <kbd className="rounded bg-gray-200 px-2">{children}</kbd>;
};

export const SlidePreviewKeyboardShortcutHelp = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-gray-50 p-4 text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-row items-center justify-between"
        aria-expanded={isExpanded}>
        <div className="flex items-center gap-1 font-bold">
          <PiKeyboard className="ml-1 mr-1 size-5" />
          <span>キーボードショートカット</span>
        </div>
        {isExpanded ? (
          <IoChevronUpOutline className="size-5 text-gray-600" />
        ) : (
          <IoChevronDownOutline className="size-5 text-gray-600" />
        )}
      </button>
      <div
        className={`grid overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <ul className="space-y-1">
              <li>
                <KBD>←</KBD> <span className="text-gray-600">前のスライド</span>
              </li>
              <li>
                <KBD>→</KBD> <span className="text-gray-600">次のスライド</span>
              </li>
            </ul>
          </div>
          <div>
            <ul className="space-y-1">
              <li>
                <KBD>Esc</KBD>{' '}
                <span className="text-gray-600">スライド一覧</span>
              </li>
              <li>
                <KBD>F</KBD>{' '}
                <span className="text-gray-600">フルスクリーン</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
