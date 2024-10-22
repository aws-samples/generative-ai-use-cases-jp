import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from './Card';
import InputChatContent from './InputChatContent';
import Select from './Select';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import { PiLightbulbFilamentBold, PiWarningFill } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import Button from './Button';

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

  const scrollToBottom = useCallback(() => {
    const elementId = 'image-assistant-chat';
    document.getElementById(elementId)?.scrollTo({
      top: document.getElementById(elementId)?.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

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
          scrollToBottom();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, scrollToBottom]);

  const onSend = useCallback(() => {
    postChat(props.content);
    props.onChangeContent('');
    scrollToBottom();
  }, [postChat, props, scrollToBottom]);

  const onRetrySend = useCallback(() => {
    popMessage();
    const lastMessage = popMessage();
    postChat(lastMessage?.content ?? '');
  }, [popMessage, postChat]);

  return (
    <div className="relative size-full">
      <Card
        label="Image generation in chat format"
        help="It automatically generates and configures prompts in chat format and generates images."
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
                Hints
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                Let's make sure to give specific and detailed instructions. It's
                important to express accurately using adjectives and adverbs.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                Instead of saying "The dog is playing," let's give more specific
                instructions like "The Shiba Inu is happily running around in
                the meadow."
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                If it's difficult to write in sentences, you don't need to write
                in sentences. Let's give instructions by listing features, such
                as "energetic, playing with a ball, jumping."
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                You can also specify elements you want to exclude. For example,
                "humans do not output" and so on.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                LLMs can consider the flow of conversation, so conversational
                instructions like "Actually, let's make it a cat instead of a
                dog" are possible.
              </div>
              <div className="m-1 rounded border p-2 text-sm">
                If the intended image cannot be generated with the prompt, try
                changing the initial image settings or parameters.
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
                    Error
                  </div>
                  <div className="text-gray-600">
                    An error occurred while generating the prompt.
                  </div>
                  <div className="mt-3 flex w-full justify-center">
                    <Button outlined onClick={onRetrySend}>
                      Re-generate
                    </Button>
                  </div>
                </div>
              )}
              {c.role === 'assistant' &&
                c.content.prompt === null &&
                !c.content.error && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    Generating prompts...
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
                        Prompt generation complete
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                        Generating images...
                      </div>
                    </>
                  ) : (
                    <>
                      {c.content.comment.split('\n').map((m, idx) => (
                        <div key={idx}>{m}</div>
                      ))}
                      <div className="mt-3">
                        <div className="font-bold">Recommended StylePreset</div>
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
                            Unset
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
            placeholder="Enter a description of the image you want to output"
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
