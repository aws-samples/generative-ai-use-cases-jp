import { ReactNode } from 'react';
import { PiListBulletsBold, PiNotePencilBold } from 'react-icons/pi';

type SamplePrompt = {
  title: string;
  description: string;
  icon: ReactNode;
  category: string;
  promptTemplate: string;
};

export const useCaseBuilderSamplePrompts: SamplePrompt[] = [
  {
    title: 'テキストの書き換え',
    description: '入力したテキストを指示に従って書き換えます。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーは <text></text> の xml タグに囲われたテキストと、<instruction></instruction> の xml タグに囲われた指示を与えるので、AI は テキストの内容を指示どおりに書き替えてください。
ただし、AI の出力は <output>からはじめ、書き換えた内容だけを出力した後、</output> タグで出力を終えてください。`,
    category: 'コンテンツ生成',
    icon: <PiNotePencilBold />,
  },
  {
    title: '箇条書きに説明をつける',
    description: '入力したテキストを指示に従って書き換えます。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーは <content></content> の xml タグに囲まれたコンテンツ と、コンテンツの特徴の要点を記した箇条書きを <list></list> の xml タグ内に与えます。
AI それぞれの箇条書きの要点の説明に対して、一字一句間違えずそのままコピーした後、詳しい説明を記述してください。
ただし、AI の出力は <output> からはじめ、それぞれの箇条書きの説明をアスタリスクから始めた後改行を入れて対応する詳しい説明を記述し、</output> タグで出力を終えてください。`,
    category: 'コンテンツ生成',
    icon: <PiListBulletsBold />,
  },
];
