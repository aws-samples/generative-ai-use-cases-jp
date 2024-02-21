import { produce } from 'immer';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { InterUseCase } from '../@types/navigate';
import queryString from 'query-string';

const useInterUseCasesState = create<{
  isShow: boolean;
  setIsShow: (b: boolean) => void;
  title: string;
  useCases: InterUseCase[];
  setUseCases: (title: string, usecases: InterUseCase[]) => void;
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

  const navigateUseCase_ = (usecase: InterUseCase) => {
    const params: Record<string, string> = {};

    Object.entries(usecase.params ?? {}).forEach(([key, { value }]) => {
      let replacedValue = value;

      // 遷移元の画面項目の値を埋め込む処理
      // value 内の{}で囲われたキー名を取得し、copyTemporary から当該のキー名の値を取得して、置換する
      // 例) {context} が設定されている場合は、copyTemporary から context の値を取得し、{context} をその値で置換する。
      const matches = value.match(/\{(.+?)\}/g);
      matches?.forEach((m) => {
        replacedValue = replacedValue.replace(
          m,
          copyTemporary[m.replace(/({|})/g, '')]
        );
      });

      params[key] = replacedValue;
    });

    navigate(`${usecase.path}?${queryString.stringify(params)}`);
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
    init: (title: string, usecasesList: InterUseCase[]) => {
      setCurrentIndex(0);
      setUseCases(title, usecasesList);
      navigateUseCase_(usecasesList[0]);
    },
  };
};

export default useInterUseCases;
