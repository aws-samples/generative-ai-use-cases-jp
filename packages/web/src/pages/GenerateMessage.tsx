import React, { useCallback, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import PromptTamplatePageBase from './PromptTamplatePageBase';
import { CasualOptionList, GenerateMessagePrompt } from '../prompts';
import { GenerateMessageParams } from '../@types/cs-improvement';
import useChat from '../hooks/useChat';
import ButtonGroup from '../components/ButtonGroup';

const GenerateMessage: React.FC = () => {
  const [promptParams, setPromptParams] = useState<GenerateMessageParams>({
    context: '',
    situation: '',
    casual: 3,
    recipientMessage: '',
    senderMessage: '',
  });

  const [disabledExec, setDisabledExec] = useState(false);
  const { state } = useLocation();
  const { postChat } = useChat();

  useEffect(() => {
    if (state !== null) {
      setPromptParams(state);
    }
  }, [state]);

  useEffect(() => {
    if (
      promptParams.context === '' ||
      promptParams.situation === '' ||
      promptParams.recipientMessage === '' ||
      promptParams.senderMessage === ''
    ) {
      setDisabledExec(true);
    } else {
      setDisabledExec(false);
    }
  }, [promptParams]);

  const onClickExec = useCallback(() => {
    setDisabledExec(true);

    postChat(GenerateMessagePrompt.generateMessage(promptParams));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParams]);

  return (
    <>
      <PromptTamplatePageBase
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

          <div className="flex justify-end">
            <Button disabled={disabledExec} onClick={onClickExec}>
              実行
            </Button>
          </div>
        </Card>
      </PromptTamplatePageBase>
    </>
  );
};

export default GenerateMessage;
