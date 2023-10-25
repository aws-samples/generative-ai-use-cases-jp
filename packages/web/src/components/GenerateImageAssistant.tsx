import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from './Card';
import InputChatContent from './InputChatContent';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import { PiLightbulbFilamentBold } from 'react-icons/pi';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  isGeneratingImage: boolean;
  onGetPrompt: (prompt: string, negativePrompt: string) => void;
};

const GenerateImageAssistant: React.FC<Props> = (props) => {
  const [content, setContent] = useState('');

  const { pathname, state } = useLocation();
  const { loading, messages, postChat } = useChat(pathname);

  // LandingPage のデモデータ設定
  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
  }, [state]);

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
            comment: string;
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

  useEffect(() => {
    const _length = contents.length;
    if (contents.length === 0) {
      return;
    }

    const message = contents[_length - 1];
    if (!loading && message.role === 'assistant') {
      props.onGetPrompt(message.content.prompt, message.content.negativePrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const onSend = useCallback(() => {
    postChat(content);
    setContent('');
  }, [content, postChat]);

  return (
    <div className="relative h-full w-full">
      <Card
        label="チャット形式で画像生成"
        help="チャット形式でプロンプトの生成と設定、画像生成を自動で行います。"
        className={`${
          props.className ?? ''
        } h-full overflow-y-auto overflow-x-hidden pb-16`}>
        {contents.length === 0 && (
          <div className="m-2 rounded border border-gray-400 bg-gray-100/50 p-2 text-gray-600">
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
            {c.role === 'assistant' && c.content.prompt === '' && (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                プロンプト生成中
              </div>
            )}
            {c.role === 'assistant' && c.content.prompt !== '' && (
              <>
                {contents.length - 1 === idx && props.isGeneratingImage ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="border-aws-sky h-5 w-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    画像生成中
                  </div>
                ) : (
                  <>
                    {c.content.comment.split('\n').map((m, idx) => (
                      <div key={idx}>{m}</div>
                    ))}
                  </>
                )}
              </>
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
