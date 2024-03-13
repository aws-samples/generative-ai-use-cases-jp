import { useCallback, useState } from 'react';

const useLocalStorage = (key: string, defaultValue: string) => {
  const [value, setValue] = useState(localStorage.getItem(key) ?? defaultValue);

  const setValueWrapper = useCallback(
    (value: string) => {
      localStorage.setItem(key, value);
      setValue(value);
    },
    [setValue, key]
  );

  return [value, setValueWrapper] as const;
};

export default useLocalStorage;
