import { produce } from 'immer';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const navigateUseCase_ = (usecase: InterUseCases) => {
    const state: Record<string, string> = {};

    usecase.initState?.copy?.forEach(({ from, to }) => {
      state[to] = copyTemporary[from];
    });
    usecase.initState?.constValue?.forEach(({ key, value }) => {
      let replacedValue = value;

      // 遷移元の画面項目の値を埋め込む処理
      // initState.constValue 内の{}で囲われたキー名を取得し、copyTemporary から当該のキー名の値を取得して、置換する
      // 例) {context} が設定されている場合は、copyTemporary から context の値を取得し、{context} をその値で置換する。
      const matches = value.match(/\{(.+?)\}/g);
      matches?.forEach((m) => {
        replacedValue = replacedValue.replace(
          m,
          copyTemporary[m.replace(/({|})/g, '')]
        );
      });

      state[key] = replacedValue;
    });

    navigate(usecase.path, {
      state,
    });
  };

  return {
    isShow,
    setIsShow,
    title,
    useCases,
    setUseCases,
    currentIndex,
    setCurrentIndex,
    setCopyTemporary,
    navigateUseCase: (idx: number) => {
      navigateUseCase_(useCases[idx]);
    },
    init: (title: string, usecasesList: InterUseCases[]) => {
      setCurrentIndex(0);
      setUseCases(title, usecasesList);
      navigateUseCase_(usecasesList[0]);
    },
  };
};

export default useInterUseCases;
