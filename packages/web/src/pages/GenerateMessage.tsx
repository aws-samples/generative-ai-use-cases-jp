import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import PromptTemplatePageBase from './PromptTamplatePageBase';
import { CasualOptionList, GenerateMessagePrompt } from '../prompts';
import { GenerateMessageParams } from '../@types/cs-improvement';
import useChat from '../hooks/useChat';
import ButtonGroup from '../components/ButtonGroup';
import { create } from 'zustand';

type StateType = {
  promptParams: GenerateMessageParams;
  setPromptParams: (params: GenerateMessageParams) => void;
  clear: () => void;
};

const useGenerateMessageState = create<StateType>((set) => {
  const INIT_STATE: Pick<StateType, 'promptParams'> = {
    promptParams: {
      context: '',
      situation: '',
      casual: 3,
      recipientMessage: '',
      senderMessage: '',
      otherContext: '',
    },
  };

  return {
    ...INIT_STATE,
    setPromptParams: (params: GenerateMessageParams) => {
      set(() => ({
        promptParams: params,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const GenerateMessage: React.FC = () => {
  const { promptParams, setPromptParams, clear } = useGenerateMessageState();

  const { state, pathname } = useLocation();
  const { postChat, isEmpty } = useChat(pathname);

  useEffect(() => {
    if (state !== null) {
      setPromptParams(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const disabledExec = useMemo(() => {
    return (
      promptParams.context === '' ||
      promptParams.situation === '' ||
      promptParams.recipientMessage === '' ||
      promptParams.senderMessage === '' ||
      !isEmpty
    );
  }, [promptParams, isEmpty]);

  const onClickExec = useCallback(() => {
    postChat(GenerateMessagePrompt.generateMessage(promptParams));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParams]);

  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PromptTemplatePageBase
        className="pb-80"
        title="CS 業務効率化"
        systemContext={GenerateMessagePrompt.systemContext}>
        <Card label="基本情報の設定">
          <Textarea
            label="前提条件"
            placeholder="メッセージ生成の前提となる条件を入力してください"
            value={promptParams.context}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                context: newVal,
              });
            }}
          />

          <Textarea
            label="状況"
            placeholder="現在の状況を具体的に入力してください"
            value={promptParams.situation}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                situation: newVal,
              });
            }}
          />

          <ButtonGroup
            label="カジュアル度"
            hint="1:ビジネスレベル ⇔ 5:友人レベル"
            value={promptParams.casual}
            options={CasualOptionList}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                casual: newVal as number,
              });
            }}
          />

          <Textarea
            label="その他の考慮して欲しいこと"
            placeholder="その他に考慮して欲しいことを自由に入力してください"
            optional
            value={promptParams.otherContext}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                otherContext: newVal,
              });
            }}
          />

          <Textarea
            label="相手からのメッセージ"
            placeholder="相手の意図がわかるレベルで入力してください。一言でOKです。"
            hint="例:「値下げして」「明日送って」など"
            value={promptParams.recipientMessage}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                recipientMessage: newVal,
              });
            }}
          />

          <Textarea
            label="送りたいメッセージ"
            placeholder="あなたの意思が伝わるレベルで入力してください。一言でOKです。"
            hint="例:「無理」「ダメ」「OK」「大丈夫」など"
            value={promptParams.senderMessage}
            onChange={(newVal) => {
              setPromptParams({
                ...promptParams,
                senderMessage: newVal,
              });
            }}
          />

          <div className="flex justify-end gap-3">
            <Button outlined onClick={onClickClear} disabled={!isEmpty}>
              クリア
            </Button>
            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
          </div>
        </Card>
      </PromptTemplatePageBase>
    </>
  );
};

export default GenerateMessage;
