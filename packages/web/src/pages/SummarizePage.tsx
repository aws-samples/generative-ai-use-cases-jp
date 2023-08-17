import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import ExpandedField from '../components/ExpandedField';
import { SummarizePrompt } from '../prompts';
import useChat from '../hooks/useChat';
import PromptTamplatePageBase from './PromptTamplatePageBase';

const SummarizePage: React.FC = () => {
  const [sentence, setSentence] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [disabledExec, setDisabledExec] = useState(true);
  const { state } = useLocation();
  const { postChat } = useChat();

  useEffect(() => {
    if (state !== null) {
      setSentence(state.sentence);
    }
  }, [state]);

  useEffect(() => {
    if (sentence === '') {
      setDisabledExec(true);
    } else {
      setDisabledExec(false);
    }
  }, [sentence]);

  const onClickExec = useCallback(() => {
    setDisabledExec(true);

    postChat(
      SummarizePrompt.summaryContext(
        sentence,
        additionalContext === '' ? undefined : additionalContext
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalContext, sentence]);

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

        <div className="flex justify-end">
          <Button disabled={disabledExec} onClick={onClickExec}>
            実行
          </Button>
        </div>
      </Card>
    </PromptTamplatePageBase>
  );
};

export default SummarizePage;
