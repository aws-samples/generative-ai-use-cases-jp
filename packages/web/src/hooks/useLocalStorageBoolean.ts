import { useCallback, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';

const useLocalStorageBoolean = (key: string, defaultFlag: boolean) => {
  const [flag, setFlag] = useLocalStorage(key, defaultFlag.toString());

  const flagWrapper = useMemo(() => {
    return flag === 'true';
  }, [flag]);

  const setFlagWrapper = useCallback(
    (f: boolean) => {
      setFlag(f.toString());
    },
    [setFlag]
  );

  return [flagWrapper, setFlagWrapper] as const;
};

export default useLocalStorageBoolean;
