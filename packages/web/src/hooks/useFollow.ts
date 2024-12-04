import { useRef, useEffect, useState } from 'react';
import useScreen from './useScreen';

const useFollow = () => {
  const { isAtBottom, scrollToBottom } = useScreen();

  // スクロールされる要素が含まれる要素
  // サイズが動的に変更されることが想定される
  // チャットのページであればメッセージを wrap した要素
  const scrollableContainer = useRef<HTMLDivElement>(null);

  // フォローするか否か
  // ページ最下部まで到達している場合はフォローする
  // そうでない場合 (手動で上にスクロールした場合) はフォローしないようにする
  const [following, setFollowing] = useState(true);

  // scrollableContainer のサイズ変更を監視
  useEffect(() => {
    if (scrollableContainer.current) {
      const observer = new ResizeObserver(() => {
        // 画面サイズ変更されたらフォローする
        if (following) {
          scrollToBottom();
        }
      });

      observer.observe(scrollableContainer.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [following, scrollToBottom]);

  // ページ最下部に到達した場合は following を true に
  // 手動で上にスクロールした場合は following を false にする
  useEffect(() => {
    setFollowing(isAtBottom);
  }, [isAtBottom, setFollowing]);

  return {
    setFollowing,
    scrollableContainer,
  };
};

export default useFollow;
