import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from './Card';
import InputChatContent from './InputChatContent';
import Select from './Select';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import { PiLightbulbFilamentBold, PiWarningFill } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import Button from './Button';
import useScroll from '../hooks/useScroll';

type Props = BaseProps & {
  modelId: string;
  onChangeModel: (s: string) => void;
  modelIds: string[];
  content: string;
  isGeneratingImage: boolean;
  onChangeContent: (s: string) => void;
  onGenerate: (
    prompt: string,
    negativePrompt: string,
    stylePreset?: string
  ) => Promise<void>;
};

const GenerateImageAssistant: React.FC<Props> = (props) => {
  const { pathname } = useLocation();
  const { loading, messages, postChat, popMessage } = useChat(pathname);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const { scrollToBottom } = useScroll();
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('image-assistant-chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const contents = useMemo<
    (
      | {
          role: 'user';
          content: string;
        }
      | {
          role: 'assistant';
          content: {
            prompt: string | null;
            negativePrompt: string | null;
            comment: string;
            recommendedStylePreset: string[];
            error?: boolean;
          };
        }
    )[]
  >(() => {
    return messages.flatMap((m, idx) => {
      if (m.role === 'user') {
        return {
          role: 'user',
          content: m.content,
        };
      } else {
        if (loading && messages.length - 1 === idx) {
          return {
            role: 'assistant',
            content: {
              prompt: null,
              negativePrompt: null,
              comment: '',
              recommendedStylePreset: [],
            },
          };
        }
        try {
          return {
            role: 'assistant',
            content: JSON.parse(m.content),
          };
        } catch (e) {
          console.error(e);
          return {
            role: 'assistant',
            content: {
              prompt: null,
              negativePrompt: null,
              comment: '',
              error: true,
              recommendedStylePreset: [],
            },
          };
        }
      }
    });
  }, [loading, messages]);

  useEffect(() => {
    // メッセージ追加時の画像の自動生成
    const _length = contents.length;
    if (contents.length === 0) {
      return;
    }

    const message = contents[_length - 1];
    if (
      !loading &&
      message.role === 'assistant' &&
      message.content.prompt &&
      message.content.negativePrompt
    ) {
      setIsAutoGenerating(true);
      props
        .onGenerate(message.content.prompt, message.content.negativePrompt)
        .finally(() => {
          setIsAutoGenerating(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const onSend = useCallback(() => {
    postChat(props.content);
    props.onChangeContent('');
  }, [postChat, props]);

  const onRetrySend = useCallback(() => {
    popMessage();
    const lastMessage = popMessage();
    postChat(lastMessage?.content ?? '');
  }, [popMessage, postChat]);

  return (
    <div className="relative size-full">
      <Card
        label="チャット形式で画像生成"
        help="チャット形式でプロンプトの生成と設定、画像生成を自動で行います。"
        className={`${props.className ?? ''} h-full pb-32`}>
        <div className="mb-2 flex w-full">
          <Select
            value={props.modelId}
            onChange={props.onChangeModel}
            options={props.modelIds.map((m) => {
              return { value: m, label: m };
            })}
          />
        </div>
        <div
          id="image-assistant-chat"
          className="h-full overflow-y-auto overflow-x-hidden pb-16">
          {contents.length === 0 && (
            <div className="rounded border border-gray-400 bg-gray-100/50 p-2 text-gray-600">
              <div className="flex items-center font-bold">
                <PiLightbulbFilamentBold className="mr-2" />
                ヒント
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                具体的かつ詳細な指示を出すようにしましょう。
                形容詞や副詞を使って、正確に表現することが重要です。
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                「犬が遊んでいる」ではなく、「柴犬が草原で楽しそうに走り回っている」のように具体的に指示をしましょう。
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                文章で書くことが難しい場合は、文章で書く必要はありません。「元気、ボール遊び、ジャンプしている」のように、特徴を羅列して指示をしましょう。
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                除外して欲しい要素も指示することができます。「人間は出力しない」など。
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                LLM
                が会話の流れを考慮してくれるので、「やっぱり犬じゃなくて猫にして」などの会話形式の指示もできます。
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                プロンプトで意図した画像が生成できない場合は、初期画像の設定やパラメータの変更を試してみましょう。
              </div>
            </div>
          )}

          {contents.map((c, idx) => (
            <div
              key={idx}
              className={`mb-1 rounded border border-black/30 p-2 ${
                c.role === 'user' ? 'bg-gray-100' : ''
              }`}>
              {c.role === 'user' && (
                <>
                  {c.content.split('\n').map((m, idx) => (
                    <div key={idx}>{m}</div>
                  ))}
                </>
              )}
              {c.role === 'assistant' && c.content.error && (
                <div>
                  <div className="flex items-center gap-2 font-bold text-red-500">
                    <PiWarningFill />
                    エラー
                  </div>
                  <div className="text-gray-600">
                    プロンプト生成中にエラーが発生しました。
                  </div>
                  <div className="mt-3 flex w-full justify-center">
                    <Button outlined onClick={onRetrySend}>
                      再実行
                    </Button>
                  </div>
                </div>
              )}
              {c.role === 'assistant' &&
                c.content.prompt === null &&
                !c.content.error && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    プロンプト生成中
                  </div>
                )}
              {c.role === 'assistant' && c.content.prompt !== null && (
                <>
                  {contents.length - 1 === idx &&
                  props.isGeneratingImage &&
                  isAutoGenerating ? (
                    <>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="size-5 rounded-full border-4 border-gray-600"></div>
                        プロンプト生成完了
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                        画像生成中
                      </div>
                    </>
                  ) : (
                    <>
                      {c.content.comment.split('\n').map((m, idx) => (
                        <div key={idx}>{m}</div>
                      ))}
                      <div className="mt-3">
                        <div className="font-bold">おすすめの StylePreset</div>
                        <div className="mt-1 grid grid-cols-2 gap-1 xl:flex xl:gap-3">
                          {c.content.recommendedStylePreset.flatMap(
                            (preset, idx) => (
                              <Button
                                key={idx}
                                onClick={() => {
                                  props.onGenerate(
                                    c.content.prompt ?? '',
                                    c.content.negativePrompt ?? '',
                                    preset
                                  );
                                }}>
                                {preset}
                              </Button>
                            )
                          )}
                          <Button
                            outlined
                            onClick={() => {
                              props.onGenerate(
                                c.content.prompt ?? '',
                                c.content.negativePrompt ?? '',
                                ''
                              );
                            }}>
                            未設定
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 z-0 -ml-2 flex w-full items-end justify-center pr-6">
          <InputChatContent
            placeholder="出力したい画像の概要を入力"
            fullWidth
            hideReset
            content={props.content}
            loading={loading || props.isGeneratingImage}
            onChangeContent={props.onChangeContent}
            onSend={onSend}
          />
        </div>
      </Card>
    </div>
  );
};

export default GenerateImageAssistant;
