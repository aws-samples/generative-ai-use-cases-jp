import React, { useCallback, useMemo, useState } from 'react';
import Card from './Card';
import InputChatContent from './InputChatContent';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import imagePrompt from '../prompts/image-prompt';
import Textarea from './Textarea';
import Button from './Button';
import { PiArrowLineLeft } from 'react-icons/pi';

type Props = {
  onCopyPrompt: (prompt: string) => void;
  onCopyNegativePrompt: (negativePrompt: string) => void;
};

const GenerateImageAssistant: React.FC<Props> = (props) => {
  const [content, setContent] = useState('');

  const { pathname } = useLocation();
  const { loading, messages, postChat } = useChat(
    pathname,
    imagePrompt.systemPrompt
  );

  const contents = useMemo<
    (
      | {
          role: 'user';
          content: string;
        }
      | {
          role: 'assistant';
          content: {
            prompt: string;
            negativePrompt: string;
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
              prompt: '',
              negativePrompt: '',
            },
          };
        }
        return {
          role: 'assistant',
          content: JSON.parse(m.content),
        };
      }
    });
  }, [loading, messages]);

  const onSend = useCallback(() => {
    postChat(content);
    setContent('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="relative w-1/2">
      <Card
        label="AIアシスタント"
        className=" h-[730px]  overflow-y-auto overflow-x-hidden pb-16">
        {contents.map((c, idx) => (
          <div
            key={idx}
            className={`mb-1 rounded border border-black/30 p-2 ${
              c.role === 'user' ? 'bg-gray-100' : ''
            }`}>
            {c.role === 'user' && <>{c.content}</>}
            {c.role === 'assistant' && c.content.prompt === '' && (
              <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
            )}

            {c.role === 'assistant' && c.content.prompt !== '' && (
              <div>
                <div className="mb-2 font-bold">
                  プロンプトが提案されました。
                </div>
                <div>
                  <div className="text-sm">プロンプト</div>
                  <Textarea value={c.content.prompt} onChange={() => {}} />
                  <Button
                    className="-mt-3 mb-3 text-sm"
                    onClick={() => {
                      props.onCopyPrompt(c.content.prompt);
                    }}>
                    <PiArrowLineLeft className="mr-2" />
                    生成条件へ転記
                  </Button>
                </div>
                <div className="my-2 w-full border-b"></div>
                <div>
                  <div className="text-sm">ネガティブプロンプト</div>
                  <Textarea
                    value={c.content.negativePrompt}
                    onChange={() => {}}
                  />
                  <Button
                    className="-mt-3 mb-3 text-sm"
                    onClick={() => {
                      props.onCopyNegativePrompt(c.content.negativePrompt);
                    }}>
                    <PiArrowLineLeft className="mr-2" />
                    生成条件へ転記
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="absolute bottom-0 z-0 -mb-4 -ml-2 flex w-full items-end justify-center pr-6">
          <InputChatContent
            placeholder="出力したい画像の概要を入力してください"
            fullWidth
            hideReset
            content={content}
            onChangeContent={setContent}
            onSend={onSend}
          />
        </div>
      </Card>
    </div>
  );
};

export default GenerateImageAssistant;
