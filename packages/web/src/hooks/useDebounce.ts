import { useState, useEffect } from 'react';

export function useDebounce(value: string, delay: number) {
  // debounce の対象 state と setter
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // delay 後 debounce の対象 state をアップデート
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 次の effect が実行される直前に timer キャンセル
    return () => {
      clearTimeout(timer);
    };

    // value、delay がアップデートするたびに effect 実行
  }, [value, delay]);

  // 最終的にアップデートされた state をリターン
  return debouncedValue;
}
