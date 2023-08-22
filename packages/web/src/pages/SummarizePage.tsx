import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import ExpandedField from '../components/ExpandedField';
import { SummarizePrompt } from '../prompts';
import useChat from '../hooks/useChat';
import PromptTamplatePageBase from './PromptTamplatePageBase';
import { create } from 'zustand';

type StateType = {
  sentence: string;
  setSentence: (s: string) => void;
  additionalContext: string;
  setAdditionalContext: (s: string) => void;
  clear: () => void;
};

const useSummarizePageState = create<StateType>((set) => {
  const INIT_STATE = {
    sentence: '',
    additionalContext: '',
  };
  return {
    ...INIT_STATE,
    setSentence: (s: string) => {
      set(() => ({
        sentence: s,
      }));
    },
    setAdditionalContext: (s: string) => {
      set(() => ({
        additionalContext: s,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const SummarizePage: React.FC = () => {
  const [
    sentence,
    setSentence,
    additionalContext,
    setAdditionalContext,
    clear,
  ] = useSummarizePageState((state) => [
    state.sentence,
    state.setSentence,
    state.additionalContext,
    state.setAdditionalContext,
    state.clear,
  ]);

  const { state } = useLocation();
  const { pathname } = useLocation();
  const { postChat, isEmpty } = useChat(pathname);

  useEffect(() => {
    if (state !== null) {
      setSentence(state.sentence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const disabledExec = useMemo(() => {
    return sentence === '' || !isEmpty;
  }, [isEmpty, sentence]);

  const onClickExec = useCallback(() => {
    postChat(
      SummarizePrompt.summaryContext(
        sentence,
        additionalContext === '' ? undefined : additionalContext
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalContext, sentence]);

  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PromptTamplatePageBase
      title="要約"
      systemContext={SummarizePrompt.systemContext}>
      <Card label="要約したい文章">
        <Textarea
          placeholder="入力してください"
          value={sentence}
          onChange={setSentence}
        />

        <ExpandedField label="追加コンテキスト" optional>
          <Textarea
            placeholder="箇条書き等で追加のコンテキストを入力することができます"
            value={additionalContext}
            onChange={setAdditionalContext}
          />
        </ExpandedField>

        <div className="flex justify-end gap-3">
          <Button outlined onClick={onClickClear} disabled={!isEmpty}>
            クリア
          </Button>

          <Button disabled={disabledExec} onClick={onClickExec}>
            実行
          </Button>
        </div>
      </Card>
    </PromptTamplatePageBase>
  );
};

export default SummarizePage;
