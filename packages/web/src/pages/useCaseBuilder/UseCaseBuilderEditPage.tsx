import React, { useCallback } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { create } from 'zustand';
import RowItem from '../../components/RowItem';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';
import InputText from '../../components/InputText';

type StateType = {
  title: string;
  setTitle: (s: string) => void;
  promptTemplate: string;
  setPromptTemplate: (s: string) => void;
  clear: () => void;
};

const useUseCaseBuilderEditPageState = create<StateType>((set) => {
  const INIT_STATE = {
    title: '',
    promptTemplate: `英語翻訳してください。
<本文>
{{text:本文}}
</本文>
<翻訳条件>
{{text:翻訳条件}}
</翻訳条件>`,
  };
  return {
    ...INIT_STATE,
    setTitle: (s) => {
      set(() => ({
        title: s,
      }));
    },
    setPromptTemplate: (s) => {
      set(() => ({
        promptTemplate: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const UseCaseBuilderEditPage: React.FC = () => {
  const { title, setTitle, promptTemplate, setPromptTemplate, clear } =
    useUseCaseBuilderEditPageState();

  // リセット
  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <div className="invisible col-span-12 my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:h-min print:visible print:h-min">
        ユースケース編集
      </div>
      <div className="col-span-12 h-[calc(100vh-2rem)] lg:col-span-6">
        <Card label="アプリの定義">
          <RowItem>
            <InputText label="タイトル" value={title} onChange={setTitle} />
          </RowItem>
          <RowItem>
            <Textarea
              label="プロンプトテンプレート"
              rows={30}
              maxHeight={500}
              value={promptTemplate}
              onChange={(v) => {
                setPromptTemplate(v);
              }}
            />
          </RowItem>
          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear}>
              クリア
            </Button>

            <Button onClick={() => {}}>登録</Button>
          </div>
        </Card>
      </div>
      <div className="col-span-12 h-[calc(100vh-2rem)] lg:col-span-6">
        <Card label="プレビュー">
          <AppBuilderView title={title} promptTemplate={promptTemplate} />
        </Card>
      </div>
    </div>
  );
};

export default UseCaseBuilderEditPage;
