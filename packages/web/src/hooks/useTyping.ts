import { useEffect, useMemo, useState } from 'react';

const TYPING_DELAY = 10;

const useTyping = (typing?: boolean) => {
  const [typingTextInput, setTypingTextInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (typing) {
      // アニメーション開始時
      if (!animating) {
        setAnimating(true);
      }
    } else {
      // アニメーション完了時 or 最初からアニメーションがないと指定された時
      if (!animating) {
        setCurrentIndex(0);
      }
    }
  }, [typing, animating, setAnimating, setCurrentIndex]);

  useEffect(() => {
    if (animating && currentIndex <= typingTextInput.length + 1) {
      const timeout = setTimeout(() => {
        if (currentIndex < typingTextInput.length + 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // 入力文字列の末尾に追いついた時に typing が false になっていたらアニメーションを終了
          if (!typing) {
            setAnimating(false);
          }
        }
      }, TYPING_DELAY);

      return () => clearTimeout(timeout);
    }
  }, [
    typingTextInput,
    currentIndex,
    animating,
    typing,
    setCurrentIndex,
    setAnimating,
  ]);

  const typingTextOutput = useMemo(() => {
    if (animating) {
      return typingTextInput.slice(0, currentIndex);
    } else {
      // animating が false の場合は typingTextInput をそのまま返す
      return typingTextInput;
    }
  }, [typingTextInput, currentIndex, animating]);

  return {
    setTypingTextInput,
    typingTextOutput,
  };
};

export default useTyping;
