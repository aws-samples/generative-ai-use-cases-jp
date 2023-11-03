import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from './Card';
import InputChatContent from './InputChatContent';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import { PiLightbulbFilamentBold, PiWarningFill } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import Button from './Button';

type Props = BaseProps & {
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
  const [isAutoGenerationg, setIsAutoGenerationg] = useState(false);

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
      setIsAutoGenerationg(true);
      props
        .onGenerate(message.content.prompt, message.content.negativePrompt)
        .finally(() => {
          setIsAutoGenerationg(false);
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
    <div className="relative h-full w-full">
      <Card
        label="채팅 형식으로 이미지 생성"
        help="채팅 형식으로 프롬프트 생성 및 설정, 이미지 생성을 자동으로 실시합니다."
        className={`${props.className ?? ''} h-full pb-32`}>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {contents.length === 0 && (
            <div className="m-2 rounded border border-gray-400 bg-gray-100/50 p-2 text-gray-600">
              <div className="flex items-center font-bold">
                <PiLightbulbFilamentBold className="mr-2" />
                힌트
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                구체적이고 상세한 지시를 내리도록 합시다.
                형용사나 부사어를 사용해서 정확하게 표현하는 것이 중요합니다.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                "개가 놀고 있다"가 아니라 "시바견이 초원에서 즐겁게 뛰어다닌다"처럼 구체적으로 지시를 해주세요.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                글로 쓰기 어려운 경우에는 글로 쓸 필요가 없습니다."건강, 공놀이, 점프하고 있다"와 같이 특징을 나열해서 지시를 해 주세요.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                제외했으면 하는 요소도 지시할 수 있습니다. "인간은 출력하지 않는다" 등.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                LLM
                이 대화의 흐름을 고려해주기 때문에 "그냥 개 말고 고양이로 해"와 같은 대화 형식의 지시도 할 수 있습니다.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                프롬프트에서 의도한 이미지를 생성할 수 없는 경우 초기 이미지 설정이나 파라미터 변경을 시도해 봅시다.
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
                    에러
                  </div>
                  <div className="text-gray-600">
                    프롬프트 생성 중 오류가 발생했습니다.
                  </div>
                  <div className="mt-3 flex w-full justify-center">
                    <Button outlined onClick={onRetrySend}>
                      재실행
                    </Button>
                  </div>
                </div>
              )}
              {c.role === 'assistant' &&
                c.content.prompt === null &&
                !c.content.error && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    프롬프트 생성중
                  </div>
                )}
              {c.role === 'assistant' && c.content.prompt !== null && (
                <>
                  {contents.length - 1 === idx &&
                  props.isGeneratingImage &&
                  isAutoGenerationg ? (
                    <>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="h-5 w-5 rounded-full border-4 border-gray-600"></div>
                        프롬프트 생성완료
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                        이미지 생성중
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
                            미설정
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
            placeholder="출력하고 싶은 이미지의 개요를 입력하세요."
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
