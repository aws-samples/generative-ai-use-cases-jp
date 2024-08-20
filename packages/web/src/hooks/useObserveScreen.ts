import React from 'react';
import { create } from 'zustand';

const useObserveScreenStore = create<{
  isAtBottom: boolean;
  setIsAtBottom: (newIsAtBottom: boolean) => void;
}>((set) => {
  const setIsAtBottom = (newIsAtBottom: boolean) => {
    set(() => {
      return {
        isAtBottom: newIsAtBottom,
      };
    });
  };

  return {
    isAtBottom: false,
    setIsAtBottom,
  };
});

const useObserveScreen = () => {
  const { isAtBottom, setIsAtBottom } = useObserveScreenStore();
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const div = e.target as HTMLDivElement;
    // 最下部に到達している時に isAtBottom を true に
    // 小数点が省略されることがあるため、1.0 の余裕を設ける
    if (div.clientHeight + div.scrollTop + 1.0 >= div.scrollHeight) {
      setIsAtBottom(true);
    } else {
      setIsAtBottom(false);
    }
  };

  return {
    handleScroll,
    isAtBottom,
    setIsAtBottom,
  };
};

export default useObserveScreen;
