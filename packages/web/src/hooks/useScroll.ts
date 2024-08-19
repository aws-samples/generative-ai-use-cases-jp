import { useRef, useEffect, useState, useCallback } from 'react';
import useObserveScreen from './useObserveScreen';

const useScroll = () => {
  const { isAtBottom } = useObserveScreen();

  // スクロールされる要素が含まれる要素
  // サイズが動的に変更されることが想定される
  // チャットのページであればメッセージを wrap した要素
  const scrollableContainer = useRef<HTMLDivElement>(null);

  // スクロール下部
  const scrolledAnchor = useRef<HTMLDivElement>(null);

  // フォローするか否か
  // ページ最下部まで到達している場合はフォローする
  // そうでない場合 (手動で上にスクロールした場合) はフォローしないようにする
  const [following, setFollowing] = useState(true);

  // フォロー中であれば最下部までスクロールする
  const scrollToBottom = useCallback(() => {
    if (scrolledAnchor.current && following) {
      scrolledAnchor.current.scrollIntoView();
    }
  }, [scrolledAnchor, following]);

  // scrollableContainer のサイズ変更を監視
  useEffect(() => {
    if (scrollableContainer.current) {
      const observer = new ResizeObserver(() => {
        // 画面サイズ変更されたらフォローする
        scrollToBottom();
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
    // App.tsx スクリーン "以外" でスクロールする場合はこちらの handleScroll を onScroll に設定する
    // 現状 GenerateImageAssistant.tsx のみで利用されている
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      const div = e.target as HTMLDivElement;
      // 最下部に到達している時に following を true に
      // 小数点が省略されることがあるため、1.0 の余裕を設ける
      if (div.clientHeight + div.scrollTop + 1.0 >= div.scrollHeight) {
        setFollowing(true);
      } else {
        setFollowing(false);
      }
    },
    setFollowing,
    scrollToBottom,
    scrollableContainer,
    scrolledAnchor,
  };
};

export default useScroll;
