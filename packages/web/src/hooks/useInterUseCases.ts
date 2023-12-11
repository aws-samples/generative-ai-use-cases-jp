import { produce } from 'immer';
import { create } from 'zustand';

type InterUseCases = {
  title: string;
  description: string;
  path: string;
  // 画面遷移時の初期値
  initState?: {
    // 画面項目の値をコピーして表示したい場合に設定する
    copy?: {
      // コピー元の interUseCasesKey を設定する
      from: string;
      // コピー先の画面項目を設定
      // useLocationのstateで管理している項目のみ指定可能
      to: string;
    }[];

    // 固定値を設定する場合に設定する
    constValue?: {
      // 設定先の画面項目を設定
      // useLocationのstateで管理している項目のみ指定可能
      key: string;
      // 設定したい値を設定
      // 遷移元の画面項目の値を埋め込みたい場合は、{interUseCasesKey}を設定することで埋め込み可能
      // 例) contextに設定されている値を埋め込みたい場合は、{context}を設定する
      value: string;
    }[];
  };
};

const useInterUseCasesState = create<{
  isShow: boolean;
  setIsShow: (b: boolean) => void;
  title: string;
  useCases: InterUseCases[];
  setUseCases: (title: string, usecases: InterUseCases[]) => void;
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
    title: '',
    useCases: [],
    setUseCases: (title, useCases) => {
      set(() => ({
        title,
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
    title,
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
    title,
    useCases,
    setUseCases,
    currentIndex,
    setCurrentIndex,
    copyTemporary,
    setCopyTemporary,
  };
};

export default useInterUseCases;
