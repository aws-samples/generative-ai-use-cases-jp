import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import PromptTemplatePageBase from './PromptTamplatePageBase';
import { GenerateMailPrompt } from '../prompts';
import { GenerateMailParams } from '../@types/mail';
import useChat from '../hooks/useChat';
import ButtonGroup from '../components/ButtonGroup';
import ExpandedField from '../components/ExpandedField';
import useTextToJson from '../hooks/useTextToJson';
import Checkbox from '../components/Checkbox';
import Alert from '../components/Alert';
import { create } from 'zustand';

type StateType = {
  promptParams: GenerateMailParams;
  setPromptParams: (params: GenerateMailParams) => void;
  mailContent: string;
  setMailContent: (s: string) => void;
  isReply: boolean;
  setIsReply: (b: boolean) => void;
  clear: () => void;
};

const useGenerateMailState = create<StateType>((set) => {
  const INIT_STATE: Pick<
    StateType,
    'promptParams' | 'mailContent' | 'isReply'
  > = {
    promptParams: {
      situation: '',
      message: '',
      casual: 3,
      action: '',
      context: '',
      otherContext: '',
      recipient: '',
      recipientAttr: '',
      sender: '',
    },
    mailContent: '',
    isReply: true,
  };
  return {
    ...INIT_STATE,
    setPromptParams: (params: GenerateMailParams) => {
      set(() => ({
        promptParams: params,
      }));
    },
    setMailContent: (s: string) => {
      set(() => ({
        mailContent: s,
      }));
    },
    setIsReply: (b: boolean) => {
      set(() => ({
        isReply: b,
      }));
    },
    clear: () => {
      set(INIT_STATE);
    },
  };
});

const GenerateMail: React.FC = () => {
  const {
    promptParams,
    setPromptParams,
    mailContent,
    setMailContent,
    isReply,
    setIsReply,
    clear,
  } = useGenerateMailState();

  const { state, pathname } = useLocation();
  const { postChat, isEmpty } = useChat(pathname);

  const {
    predict: predictTextToJson,
    loading: loadingTextToJson,
    isError: isErrorTextToJson,
  } = useTextToJson();

  useEffect(() => {
    if (state !== null) {
      setPromptParams(state);
      setMailContent(state.mailContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const disabledExec = useMemo(() => {
    return (
      promptParams.situation === '' || promptParams.message === '' || !isEmpty
    );
  }, [promptParams, isEmpty]);

  const onClickAutoFill = useCallback(async () => {
    const metadata = await predictTextToJson(
      mailContent,
      GenerateMailPrompt.autoFillContext,
      GenerateMailPrompt.autoFillFormat(isReply)
    );

    // メタデータが取得できなかった場合は、エラーということなので処理中断
    if (!metadata) {
      return;
    }

    if (isReply) {
      setPromptParams({
        ...promptParams,
        ...GenerateMailPrompt.fillReplyMailParams(metadata),
      });
    } else {
      setPromptParams({
        ...promptParams,
        ...GenerateMailPrompt.fillNewMailParams(metadata),
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailContent, isReply]);

  const onClickExec = useCallback(() => {
    postChat(GenerateMailPrompt.generationContext(promptParams));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParams]);

  const onClickClear = useCallback(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PromptTemplatePageBase
      title="メール生成"
      systemContext={GenerateMailPrompt.systemContext}>
      <Card label="生成条件">
        <ExpandedField
          label="メール本文を元に各情報を設定する"
          optional
          // MEMO: デモ用のコード
          defaultOpened={state ? !!state.mailContent : false}>
          <div className="my-3 text-sm font-light">
            生成系 AI
            を使って、メール本文から画面の各情報を自動設定することができます。
          </div>
          {isErrorTextToJson && (
            <Alert
              className="my-3"
              severity="error"
              title="自動設定に失敗しました">
              処理中にエラーが発生したため、メール本文から各情報を自動設定することができませんでした。
            </Alert>
          )}

          <Textarea
            label="メール本文"
            placeholder="各情報を設定するためのメール本文を入力してください"
            value={mailContent}
            onChange={(newVal) => {
              setMailContent(newVal);
            }}
          />

          <Checkbox
            label="上記のメールの返信メールとして各情報を自動設定する"
            value={isReply}
            onChange={setIsReply}
          />

          <div className="flex justify-end">
            <Button
              className=""
              disabled={mailContent === ''}
              loading={loadingTextToJson}
              onClick={onClickAutoFill}>
              自動設定
            </Button>
          </div>

          <div className="mt-3 border-b"></div>
        </ExpandedField>

        <Textarea
          label="送信先の情報"
          placeholder="会社名や属性などを入力してください"
          hint="例: 取引先、エンドユーザー、自社経営陣、社内向けなど"
          optional
          value={promptParams.recipientAttr}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              recipientAttr: newVal,
            });
          }}
        />

        <Textarea
          label="送信先"
          placeholder="名前、役職名、役割などを入力してください"
          optional
          value={promptParams.recipient}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              recipient: newVal,
            });
          }}
        />

        <Textarea
          label="発信者名"
          placeholder="会社名、名前などを入力してください"
          optional
          value={promptParams.sender}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              sender: newVal,
            });
          }}
        />

        <Textarea
          label="前提条件"
          placeholder="考慮して欲しい前提条件があれば、入力してください"
          optional
          value={promptParams.context}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              context: newVal,
            });
          }}
        />

        <Textarea
          label="メールを送る目的・状況"
          placeholder="メールを送信する目的や背景の情報等を具体的に入力してください"
          value={promptParams.situation}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              situation: newVal,
            });
          }}
        />

        <Textarea
          label="相手に伝えたいこと"
          placeholder="相手に伝えたいことを具体的に入力してください"
          value={promptParams.message}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              message: newVal,
            });
          }}
        />

        <Textarea
          label="相手に求めること"
          placeholder="このメールで相手に起こして欲しいアクションを具体的に入力してください"
          optional
          value={promptParams.action}
          onChange={(newVal) => {
            setPromptParams({
              ...promptParams,
              action: newVal,
            });
          }}
        />

        <ButtonGroup
          label="カジュアル度"
          hint="1:ビジネスレベル ⇔ 5:友人レベル"
          value={promptParams.casual}
          options={[
            {
              label: '1',
              value: 1,
            },
            {
              label: '2',
              value: 2,
            },
            {
              label: '3',
              value: 3,
            },
            {
              label: '4',
              value: 4,
            },
            {
              label: '5',
              value: 5,
            },
          ]}
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
  );
};

export default GenerateMail;
