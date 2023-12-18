import { useEffect, useMemo, useState } from 'react';

const TYPING_DELAY = 10;

const useTyping = (typing?: boolean) => {
  const [typingTextInput, setTypingTextInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (typing && currentIndex < typingTextInput.length) {
      const timeout = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, TYPING_DELAY);

      return () => clearTimeout(timeout);
    }
  }, [typingTextInput, currentIndex]);

  const typingTextOutput = useMemo(() => {
    if (typing) {
      return typingTextInput.slice(0, currentIndex);
    } else {
      // typing が false の場合は typingTextInput のまま返す
      return typingTextInput;
    }
  }, [typingTextInput, currentIndex]);

  return {
    setTypingTextInput,
    typingTextOutput,
  }
};

export default useTyping;
