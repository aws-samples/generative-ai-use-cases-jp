import { UseCaseInputExample } from 'generative-ai-use-cases';
import { ReactNode } from 'react';
import {
  PiCodeBold,
  PiDetectiveBold,
  PiEnvelopeSimpleBold,
  PiEraserBold,
  PiEyedropperBold,
  PiFlaskBold,
  PiListBulletsBold,
  PiMagnifyingGlassBold,
  PiNotePencilBold,
  PiQuestionBold,
  PiSquaresFourBold,
} from 'react-icons/pi';

import { TFunction } from 'i18next';

export type SamplePromptType = {
  title: string;
  description: string;
  category: string;
  promptTemplate: string;
  inputExamples: UseCaseInputExample[];
  icon: ReactNode;
  color?:
    | 'red'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'yellow'
    | 'orange'
    | 'gray';
};

export const getUseCaseBuilderSamplePrompts = (
  t: TFunction
): SamplePromptType[] => [
  {
    category: t('useCaseBuilder.contentGeneration.name', {
      ns: 'prompts',
    }),
    title: t('useCaseBuilder.contentGeneration.rewrite.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.contentGeneration.rewrite.description', {
      ns: 'prompts',
    }),
    promptTemplate: t(
      'useCaseBuilder.contentGeneration.rewrite.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.contentGeneration.rewrite.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.contentGeneration.rewrite.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.rewrite.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.contentGeneration.rewrite.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.rewrite.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiNotePencilBold />,
    color: 'blue',
  },
  {
    category: t('useCaseBuilder.contentGeneration.name', {
      ns: 'prompts',
    }),
    title: t('useCaseBuilder.contentGeneration.listWithExplanation.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.contentGeneration.listWithExplanation.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.contentGeneration.listWithExplanation.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.contentGeneration.listWithExplanation.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.contentGeneration.listWithExplanation.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.listWithExplanation.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.contentGeneration.listWithExplanation.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.listWithExplanation.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiListBulletsBold />,
    color: 'blue',
  },
  {
    category: t('useCaseBuilder.contentGeneration.name', {
      ns: 'prompts',
    }),
    title: t('useCaseBuilder.contentGeneration.createEmailResponse.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.contentGeneration.createEmailResponse.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.contentGeneration.createEmailResponse.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.contentGeneration.createEmailResponse.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.contentGeneration.createEmailResponse.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.createEmailResponse.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.contentGeneration.createEmailResponse.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentGeneration.createEmailResponse.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiEnvelopeSimpleBold />,
    color: 'blue',
  },
  {
    category: t('useCaseBuilder.classification.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.classification.mailClassification.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.classification.mailClassification.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.classification.mailClassification.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.classification.mailClassification.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.classification.mailClassification.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.classification.mailClassification.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiSquaresFourBold />,
    color: 'green',
  },
  {
    category: t('useCaseBuilder.textProcessing.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.textProcessing.emailAddressExtraction.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.textProcessing.emailAddressExtraction.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.textProcessing.emailAddressExtraction.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.textProcessing.emailAddressExtraction.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.textProcessing.emailAddressExtraction.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textProcessing.emailAddressExtraction.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiEyedropperBold />,
    color: 'orange',
  },
  {
    category: t('useCaseBuilder.textProcessing.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.textProcessing.personalInformationMasking.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.textProcessing.personalInformationMasking.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.textProcessing.personalInformationMasking.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.textProcessing.personalInformationMasking.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.textProcessing.personalInformationMasking.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textProcessing.personalInformationMasking.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiEraserBold />,
    color: 'orange',
  },
  {
    category: t('useCaseBuilder.textAnalysis.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.textAnalysis.textSimilarity.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.textAnalysis.textSimilarity.description', {
      ns: 'prompts',
    }),
    promptTemplate: t(
      'useCaseBuilder.textAnalysis.textSimilarity.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.textAnalysis.textSimilarity.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.textAnalysis.textSimilarity.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.textSimilarity.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.textAnalysis.textSimilarity.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.textSimilarity.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiMagnifyingGlassBold />,
    color: 'pink',
  },
  {
    category: t('useCaseBuilder.textAnalysis.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.textAnalysis.qaPair.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.textAnalysis.qaPair.description', {
      ns: 'prompts',
    }),
    promptTemplate: t('useCaseBuilder.textAnalysis.qaPair.promptTemplate', {
      ns: 'prompts',
    }),
    inputExamples: [
      {
        title: t('useCaseBuilder.textAnalysis.qaPair.inputExample1.title', {
          ns: 'prompts',
        }),
        examples: {
          [t(
            'useCaseBuilder.textAnalysis.qaPair.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.qaPair.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.textAnalysis.qaPair.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.qaPair.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiQuestionBold />,
    color: 'pink',
  },
  {
    category: t('useCaseBuilder.textAnalysis.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.textAnalysis.qaPairWithReference.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.textAnalysis.qaPairWithReference.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.textAnalysis.qaPairWithReference.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.textAnalysis.qaPairWithReference.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.textAnalysis.qaPairWithReference.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.qaPairWithReference.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.textAnalysis.qaPairWithReference.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.textAnalysis.qaPairWithReference.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiQuestionBold />,
    color: 'pink',
  },
  {
    category: t('useCaseBuilder.contentModeration.name', {
      ns: 'prompts',
    }),
    title: t('useCaseBuilder.contentModeration.contentModeration.title', {
      ns: 'prompts',
    }),
    description: t(
      'useCaseBuilder.contentModeration.contentModeration.description',
      { ns: 'prompts' }
    ),
    promptTemplate: t(
      'useCaseBuilder.contentModeration.contentModeration.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.contentModeration.contentModeration.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.contentModeration.contentModeration.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentModeration.contentModeration.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
      {
        title: t(
          'useCaseBuilder.contentModeration.contentModeration.inputExample2.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.contentModeration.contentModeration.inputExample2.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.contentModeration.contentModeration.inputExample2.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiDetectiveBold />,
    color: 'red',
  },
  {
    category: t('useCaseBuilder.programming.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.programming.codeGeneration.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.programming.codeGeneration.description', {
      ns: 'prompts',
    }),
    promptTemplate: t(
      'useCaseBuilder.programming.codeGeneration.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.programming.codeGeneration.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.programming.codeGeneration.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.programming.codeGeneration.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.programming.codeGeneration.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.programming.codeGeneration.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: t('useCaseBuilder.programming.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.programming.codeExplanation.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.programming.codeExplanation.description', {
      ns: 'prompts',
    }),
    promptTemplate: t(
      'useCaseBuilder.programming.codeExplanation.promptTemplate',
      { ns: 'prompts' }
    ),
    inputExamples: [
      {
        title: t(
          'useCaseBuilder.programming.codeExplanation.inputExample1.title',
          { ns: 'prompts' }
        ),
        examples: {
          [t(
            'useCaseBuilder.programming.codeExplanation.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.programming.codeExplanation.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: t('useCaseBuilder.programming.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.programming.codeFix.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.programming.codeFix.description', {
      ns: 'prompts',
    }),
    promptTemplate: t('useCaseBuilder.programming.codeFix.promptTemplate', {
      ns: 'prompts',
    }),
    inputExamples: [
      {
        title: t('useCaseBuilder.programming.codeFix.inputExample1.title', {
          ns: 'prompts',
        }),
        examples: {
          [t(
            'useCaseBuilder.programming.codeFix.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.programming.codeFix.inputExample1.parameters.value1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.programming.codeFix.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.programming.codeFix.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: t('useCaseBuilder.experimental.name', { ns: 'prompts' }),
    title: t('useCaseBuilder.experimental.rolePlay.title', {
      ns: 'prompts',
    }),
    description: t('useCaseBuilder.experimental.rolePlay.description', {
      ns: 'prompts',
    }),
    promptTemplate: t('useCaseBuilder.experimental.rolePlay.promptTemplate', {
      ns: 'prompts',
    }),
    inputExamples: [
      {
        title: t('useCaseBuilder.experimental.rolePlay.inputExample1.title', {
          ns: 'prompts',
        }),
        examples: {
          [t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.key1',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.key1',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.key2',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.value2',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.key3',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.value3',
            { ns: 'prompts' }
          ),
          [t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.key4',
            { ns: 'prompts' }
          )]: t(
            'useCaseBuilder.experimental.rolePlay.inputExample1.parameters.value4',
            { ns: 'prompts' }
          ),
        },
      },
    ],
    icon: <PiFlaskBold />,
    color: 'gray',
  },
  {
    category: 'コンテンツ生成',
    title: 'アンケートの設問・選択肢作成',
    description: 'セミナーや製品などの対象、アンケートの設問数を入力するだけでアンケートの作成を行う',
    promptTemplate: `会社の執行役員として、顧客及び社員がどんなニーズを持っていて、提供するイベントやサービス、会社制度から得られる効用がどのニーズを満たしているのか知り継続的な改善を行いたいと考えています。そのために、アンケートは現時点での評価と理由を知り今後の意思決定に必要なデータを取るために有効な手段と考えています。アンケートからデータを取り意思決定するのはごくシンプルな行動ですが、こうした行動の積み重ねはあなたの会社がデータ駆動の意思決定ができるよう変わっていくための一歩であり、あなたはアンケートの作成を企画する一人一人に模範を示す必要があります。効果的なアンケートをこれから作成するにあたり、アンケートの対象(target)、対象の情報(info)、設問数(count)をよく読んでください。
  
<target>
{{select:アンケートの対象:セミナー・イベント,研修,製品・サービス,顧客満足度,従業員満足度,市場認知度}}
</target>
<count>
{{select:アンケートの設問数:5,10,15,20}}
</count>
<info>
{{text:対象についての情報}}
</info>
  
アンケートは、タイトル、ゴール、設問の3つで構成します。タイトルは見出しとして書き、ゴールは、targetとinfoを基にどのような改善が必要な可能性があり、そのためにどのような施策が考えられ、ニーズの確度や施策の優先順位をつけるためにどのようなデータが必要なのかを他の執行役員から年次の低い若手まで全員が明確にかつ1分以内に理解できるよう作文してください。設問と回答選択肢の作成はcountの分だけ繰り返してください。選択肢の数は、「はい、いいえ」などの2値が最小で、最大は5とします。では、作成してください。`,
    inputExamples: [
      {
        title: 'セミナーアンケート',
        examples: {
          アンケートの対象: 'セミナー・イベント',
          アンケートの設問数: '20',
          対象についての情報: `セミナータイトル: AI アプリ開発プロジェクトの始め方
概要 : このセッションでは、アプリ開発を始める前に考えておくべきことから、実際にアプリ開発をする際に便利な AWS サービスの使いどころの紹介、アプリ開発が終わった後も気にすべきことなど、AI 全般のアプリ開発ジャーニーにおけるビジネス＆Tech な内容をまとめてご紹介します。`,
          },
        },
        {
          title: '製品・サービスの改善点ヒアリング',
          examples: {
            アンケートの対象: '製品・サービス',
            アンケートの設問数: '10',
            対象についての情報: '最近、利用量は下がっていないのに突然解約するユーザーが増えている。',
          },
        },
        {
          title: '働きがい調査',
          examples: {
            アンケートの対象: '従業員満足度',
            アンケートの設問数: '20',
            対象についての情報: '最近、特に若手の社員でメンタルヘルスの問題で求職・退職が増えている',
          },
        },
      ],
      icon: <PiNotePencilBold />,
      color: 'blue',
    },
];
