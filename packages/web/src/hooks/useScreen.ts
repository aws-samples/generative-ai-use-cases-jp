import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';

const useScreenStore = create<{
  isAtBottom: boolean;
  isAtTop: boolean;
  setIsAtBottom: (newIsAtBottom: boolean) => void;
  setIsAtTop: (newIsAtTop: boolean) => void;
  scrollTopAnchor: HTMLDivElement | null;
  scrollBottomAnchor: HTMLDivElement | null;
  setScrollTopAnchor: (newScrollTopAnchor: HTMLDivElement | null) => void;
  setScrollBottomAnchor: (newScrollBottomAnchor: HTMLDivElement | null) => void;
}>((set) => {
  const setIsAtBottom = (newIsAtBottom: boolean) => {
    set(() => {
      return {
        isAtBottom: newIsAtBottom,
      };
    });
  };

  const setIsAtTop = (newIsAtTop: boolean) => {
    set(() => {
      return {
        isAtTop: newIsAtTop,
      };
    });
  };

  const setScrollTopAnchor = (newScrollTopAnchor: HTMLDivElement | null) => {
    set(() => {
      return {
        scrollTopAnchor: newScrollTopAnchor,
      };
    });
  };

  const setScrollBottomAnchor = (
    newScrollBottomAnchor: HTMLDivElement | null
  ) => {
    set(() => {
      return {
        scrollBottomAnchor: newScrollBottomAnchor,
      };
    });
  };

  return {
    isAtBottom: false,
    isAtTop: false,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchor: null,
    scrollBottomAnchor: null,
    setScrollTopAnchor,
    setScrollBottomAnchor,
  };
});

const useScreen = () => {
  const {
    isAtBottom,
    isAtTop,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchor,
    setScrollTopAnchor,
    scrollBottomAnchor,
    setScrollBottomAnchor,
  } = useScreenStore();

  const screen = useRef<HTMLDivElement>(null);

  // スクリーンのサイズや位置が変わったことを通知する関数
  // 初期時、スクロール時に呼ばれる
  // チャットの要素読み込み完了時には自動で下までスクロールされるため、そこでも呼ばれる
  const notifyScreen = useCallback(
    (div: HTMLDivElement) => {
      // 最下部に到達している時に isAtBottom を true に
      // 小数点が省略されることがあるため、1.0 の余裕を設ける
      if (div.clientHeight + div.scrollTop + 1.0 >= div.scrollHeight) {
        setIsAtBottom(true);
      } else {
        setIsAtBottom(false);
      }

      // 最上部に到達している時に isAtTop を true に
      // 小数点が省略されることがあるため、1.0 の余裕を設ける
      if (div.scrollTop <= 1.0) {
        setIsAtTop(true);
      } else {
        setIsAtTop(false);
      }
    },
    [setIsAtBottom, setIsAtTop]
  );

  // screen (App.tsx に定義されている) が設定された際に scroll イベントの listener を設定する
  useEffect(() => {
    const current = screen.current;

    if (!current) return;

    const handleScrollInner = () => {
      notifyScreen(current);
    };

    screen.current.addEventListener('scroll', handleScrollInner);
    notifyScreen(current);

    return () => {
      current.removeEventListener('scroll', handleScrollInner);
    };
  }, [screen, notifyScreen]);

  const scrollTopAnchorRef = useRef(null);
  const scrollBottomAnchorRef = useRef(null);

  useEffect(() => {
    if (scrollTopAnchorRef.current) {
      setScrollTopAnchor(scrollTopAnchorRef.current);
    }
  }, [scrollTopAnchorRef, setScrollTopAnchor]);

  useEffect(() => {
    if (scrollBottomAnchorRef.current) {
      setScrollBottomAnchor(scrollBottomAnchorRef.current);
    }
  }, [scrollBottomAnchorRef, setScrollBottomAnchor]);

  const scrollToBottom = useCallback(() => {
    if (scrollBottomAnchor) {
      scrollBottomAnchor.scrollIntoView();
    }
  }, [scrollBottomAnchor]);

  const scrollToTop = useCallback(() => {
    if (scrollTopAnchor) {
      scrollTopAnchor.scrollIntoView();
    }
  }, [scrollTopAnchor]);

  return {
    screen,
    notifyScreen,
    isAtBottom,
    isAtTop,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchorRef,
    scrollBottomAnchorRef,
    scrollToBottom,
    scrollToTop,
  };
};

export default useScreen;
