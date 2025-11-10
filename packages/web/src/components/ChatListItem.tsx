import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BaseProps } from '../@types/common';
import { Link } from 'react-router-dom';
import { PiChat, PiCheck, PiPencilLine, PiTrash, PiX, PiDotsThreeVertical } from 'react-icons/pi';
import ButtonIcon from './ButtonIcon';
import { Chat } from 'generative-ai-use-cases';
import { decomposeId } from '../utils/ChatUtils';
import DialogConfirmDeleteChat from './DialogConfirmDeleteChat';

type Props = BaseProps & {
  active: boolean;
  chat: Chat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete: (chatId: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateTitle: (chatId: string, title: string) => Promise<any>;
  highlightWords: string[];
};

const ChatListItem: React.FC<Props> = (props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const chatId = useMemo(() => {
    return decomposeId(props.chat.chatId) ?? '';
  }, [props.chat.chatId]);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tempTitle, setTempTitle] = useState('');

  useEffect(() => {
    if (editing) {
      setTempTitle(props.chat.title);
    }
  }, [editing, props.chat.title]);

  const updateTitle = useCallback(() => {
    setEditing(false);
    props.onUpdateTitle(chatId, tempTitle).catch(() => {
      setEditing(true);
    });
  }, [chatId, props, tempTitle]);

  useLayoutEffect(() => {
    if (editing) {
      const listener = (e: DocumentEventMap['keypress']) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();

          // Update Title in dispatch process (to synchronize)
          setTempTitle((newTitle) => {
            setEditing(false);
            props.onUpdateTitle(chatId, newTitle).catch(() => {
              setEditing(true);
            });
            return newTitle;
          });
        }
      };
      inputRef.current?.addEventListener('keypress', listener);

      inputRef.current?.focus();

      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        inputRef.current?.removeEventListener('keypress', listener);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const highlightText = useCallback((text: string, words: string[]) => {
    if (words.length === 0) return text;

    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    return text.split(regex).map((part, i) => {
      if (words.some((word) => part.toLowerCase() === word.toLowerCase())) {
        return (
          <span key={i} className="text-blue-600 font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  // メニューの外側をクリックした時に閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 日付のフォーマット
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 24) {
      return '今日';
    } else if (diffInDays === 1) {
      return '1日前';
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }, []);

  return (
    <>
      {openDialog && (
        <DialogConfirmDeleteChat
          isOpen={openDialog}
          target={props.chat}
          onDelete={() => {
            setOpenDialog(false);
            props.onDelete(chatId);
          }}
          onClose={() => {
            setOpenDialog(false);
          }}
        />
      )}
      <div
        className="relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        <Link
          className={`hover:bg-blue-50 group flex w-full flex-col justify-start rounded p-2 ${
            props.active && 'bg-blue-100'
          } ${props.className}`}
          to={`/chat/${chatId}`}
          onClick={(e) => {
            // 編集中やメニュー表示中はリンク遷移を無効化
            if (editing || showMenu) {
              e.preventDefault();
            }
          }}>
          <div className="flex w-full items-start gap-2">
            <div className="shrink-0 pt-0.5">
              <PiChat />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              {editing ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full bg-transparent p-0 text-sm ring-0"
                  value={tempTitle}
                  onChange={(e) => {
                    setTempTitle(e.target.value);
                  }}
                />
              ) : (
                <>
                  <div className="truncate text-sm">
                    {highlightText(props.chat.title, props.highlightWords)}
                  </div>
                  {props.chat.updatedDate && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatDate(props.chat.updatedDate)}
                    </div>
                  )}
                </>
              )}
            </div>
            {editing && (
              <div className="flex shrink-0">
                <ButtonIcon className="text-base" onClick={updateTitle}>
                  <PiCheck />
                </ButtonIcon>
                <ButtonIcon
                  className="text-base"
                  onClick={() => {
                    setEditing(false);
                  }}>
                  <PiX />
                </ButtonIcon>
              </div>
            )}
            {!editing && (
              <div
                className={`shrink-0 ${!isHovered && !showMenu ? 'invisible' : 'visible'}`}
                ref={menuRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}>
                <ButtonIcon
                  onClick={() => {
                    setShowMenu(!showMenu);
                  }}>
                  <PiDotsThreeVertical />
                </ButtonIcon>
                {showMenu && (
                  <div className="absolute right-2 top-8 z-10 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        setEditing(true);
                      }}>
                      <PiPencilLine />
                      <span>名前を変更</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        setOpenDialog(true);
                      }}>
                      <PiTrash />
                      <span>削除</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Link>
      </div>
    </>
  );
};

export default ChatListItem;
