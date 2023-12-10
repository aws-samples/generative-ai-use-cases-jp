import { produce } from 'immer';
import { create } from 'zustand';

type InterUseCases = {
  title: string;
  description: string;
  path: string;
  initState?: {
    constValue?: {
      key: string;
      value: string;
    }[];
    copy?: {
      from: string;
      to: string;
    }[];
  };
};

const useInterUseCasesState = create<{
  isShow: boolean;
  setIsShow: (b: boolean) => void;
  useCases: InterUseCases[];
  setUseCases: (usecases: InterUseCases[]) => void;
  currentIndex: number;
  setCurrentIndex: (n: number) => void;
  copyTemporary: {
    [key: string]: string;
  };
  setCopyTemporary: (key: string, value: string) => void;
}>((set, get) => {
  return {
    isShow: false,
    setIsShow: (b) => {
      set(() => ({
        isShow: b,
      }));
    },
    useCases: [],
    setUseCases: (useCases) => {
      set(() => ({
        useCases,
      }));
    },
    currentIndex: -1,
    setCurrentIndex: (n: number) => {
      set(() => ({
        currentIndex: n,
      }));
    },
    copyTemporary: {},
    setCopyTemporary: (key, value) => {
      const tmp = produce(get().copyTemporary, (draft) => {
        draft[key] = value;
      });
      set(() => ({
        copyTemporary: tmp,
      }));
    },
  };
});

const useInterUseCases = () => {
  const {
    isShow,
    setIsShow,
    useCases,
    setUseCases,
    currentIndex,
    setCurrentIndex,
    copyTemporary,
    setCopyTemporary,
  } = useInterUseCasesState();

  return {
    isShow,
    setIsShow,
    useCases,
    setUseCases,
    currentIndex,
    setCurrentIndex,
    copyTemporary,
    setCopyTemporary,
  };
};

export default useInterUseCases;
