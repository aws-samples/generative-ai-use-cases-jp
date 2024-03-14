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

  // 入力が必要な残りの文字列数
  const remainingTextLength = useMemo(() => {
    return typingTextInput.length - currentIndex;
  }, [currentIndex, typingTextInput]);

  // 一度に入力する文字列の単位
  const inputUnit = useMemo(() => {
    // タイピング中は残りの文字列数に応じて入力文字列数を変化させる
    // 入力文字数の単位は最大でも 10 文字とする
    if (typing) {
      return Math.min(Math.floor(remainingTextLength / 10) + 1, 10);
    } else {
      // タイピング中ではない場合は 10 文字を 1 単位で入力する (最速で入力する)
      return 10;
    }
  }, [typing, remainingTextLength]);

  useEffect(() => {
    if (animating && currentIndex <= typingTextInput.length + 1) {
      const timeout = setTimeout(() => {
        if (currentIndex < typingTextInput.length + 1) {
          setCurrentIndex(currentIndex + inputUnit);
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
    inputUnit,
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
