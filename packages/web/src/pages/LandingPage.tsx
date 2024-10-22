import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardDemo from '../components/CardDemo';
import Button from '../components/Button';
import {
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiChatsCircle,
  PiPenNib,
  PiTranslate,
  PiGlobe,
  PiImages,
  PiNotebook,
  PiPen,
  PiRobot,
  PiVideoCamera,
  PiFlowArrow,
} from 'react-icons/pi';
import AwsIcon from '../assets/aws.svg?react';
import useInterUseCases from '../hooks/useInterUseCases';
import {
  AgentPageQueryParams,
  ChatPageQueryParams,
  EditorialPageQueryParams,
  GenerateImagePageQueryParams,
  GenerateTextPageQueryParams,
  InterUseCaseParams,
  RagPageQueryParams,
  SummarizePageQueryParams,
  TranslatePageQueryParams,
  WebContentPageQueryParams,
  VideoAnalyzerPageQueryParams,
} from '../@types/navigate';
import queryString from 'query-string';
import { MODELS } from '../hooks/useModel';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const { multiModalModelIds } = MODELS;
const multiModalEnabled: boolean = multiModalModelIds.length > 0;
const getPromptFlows = () => {
  try {
    return JSON.parse(import.meta.env.VITE_APP_PROMPT_FLOWS);
  } catch (e) {
    return [];
  }
};
const promptFlows = getPromptFlows();
const promptFlowChatEnabled: boolean = promptFlows.length > 0;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsShow, init } = useInterUseCases();

  const demoChat = () => {
    const params: ChatPageQueryParams = {
      content: `フィボナッチ数を返す Python の関数を書いてください。また、実装を解説してください。
引数が項で、処理は再帰で書くようにしてください。出力はマークダウンにしてください。`,
      systemContext: '',
    };
    navigate(`/chat?${queryString.stringify(params)}`);
  };

  const demoRag = () => {
    const params: RagPageQueryParams = {
      content: `Claude のパラメータを説明し、その設定方法も教えてください。`,
    };
    navigate(`/rag?${queryString.stringify(params)}`);
  };

  const demoRagKnowledgeBase = () => {
    const params: RagPageQueryParams = {
      content: `Claude のパラメータを説明し、その設定方法も教えてください。`,
    };
    navigate(`/rag-knowledge-base?${queryString.stringify(params)}`);
  };

  const demoAgent = () => {
    const params: AgentPageQueryParams = {
      content: `generative-ai-use-cases-jp とはなんですか？`,
    };
    navigate(`/agent?${queryString.stringify(params)}`);
  };

  const demoGenerate = () => {
    const params: GenerateTextPageQueryParams = {
      information: `Amazon Bedrock は、AI21 Labs、Anthropic、Cohere、Meta、Stability AI、Amazon などの大手 AI 企業が提供する高性能な基盤モデル (FM) を単一の API で選択できるフルマネージド型サービスです。また、生成 AI アプリケーションの構築に必要な幅広い機能も備えているため、プライバシーとセキュリティを維持しながら開発を簡素化できます。Amazon Bedrock の包括的な機能を使用すると、さまざまなトップ FM を簡単に試したり、微調整や検索拡張生成 (RAG) などの手法を使用してデータを使用してプライベートにカスタマイズしたり、旅行の予約や保険金請求の処理から広告キャンペーンの作成や在庫管理まで、複雑なビジネスタスクを実行するマネージドエージェントを作成したりできます。これらはすべて、コードを記述することなく行えます。Amazon Bedrock はサーバーレスであるため、インフラストラクチャを管理する必要がありません。また、使い慣れた AWS サービスを使用して、生成 AI 機能をアプリケーションに安全に統合してデプロイできます。`,
      context:
        'プレゼンテーションのために、マークダウン形式で章立てして、それぞれ端的に説明を',
    };
    navigate(`/generate?${queryString.stringify(params)}`);
  };

  const demoSummarize = () => {
    const params: SummarizePageQueryParams = {
      sentence:
        'Amazon Bedrock は、Amazon や主要な AI スタートアップ企業が提供する基盤モデル (FM) を API を通じて利用できるようにする完全マネージド型サービスです。そのため、さまざまな FM から選択して、ユースケースに最も適したモデルを見つけることができます。Amazon Bedrock のサーバーレスエクスペリエンスにより、すぐに FM を開始したり、FM を簡単に試したり、独自のデータを使用して FM をプライベートにカスタマイズしたり、AWS のツールや機能を使用して FM をアプリケーションにシームレスに統合してデプロイしたりできます。Amazon Bedrock のエージェントは、開発者が独自の知識源に基づいて最新の回答を提供し、幅広いユースケースのタスクを完了できるジェネレーティブ AI アプリケーションを開発者が簡単に作成できるようにする完全マネージド機能です。Bedrock のサーバーレスエクスペリエンスにより、インフラストラクチャを管理することなく、すぐに使用を開始し、独自のデータを使用して FM をプライベートにカスタマイズし、使い慣れた AWS ツールや機能を使用してそれらをアプリケーションに簡単に統合してデプロイできます (さまざまなモデルをテストするための実験や FM を大規模に管理するためのパイプラインなどの Amazon SageMaker の ML 機能との統合を含みます)。',
      additionalContext: '',
    };
    navigate(`/summarize?${queryString.stringify(params)}`);
  };

  const demoEditorial = () => {
    const params: EditorialPageQueryParams = {
      sentence:
        'こんちは。私は校正を支援する完璧な AI アシスタントです。お好きな文章を入力してくさい。',
    };
    navigate(`/editorial?${queryString.stringify(params)}`);
  };

  const demoTranslate = () => {
    const params: TranslatePageQueryParams = {
      sentence:
        'こんにちは。私は翻訳を支援する AI アシスタントです。お好きな文章を入力してください。',
      additionalContext: '',
      language: '英語',
    };
    navigate(`/translate?${queryString.stringify(params)}`);
  };

  const demoWebContent = () => {
    const params: WebContentPageQueryParams = {
      url: 'https://aws.amazon.com/jp/bedrock/',
      context: '',
    };
    navigate(`/web-content?${queryString.stringify(params)}`);
  };

  const demoGenerateImage = () => {
    const params: GenerateImagePageQueryParams = {
      content: `スマホ広告のデザイン案を出力してください。
可愛い、おしゃれ、使いやすい、POPカルチャー、親しみやすい、若者向け、音楽、写真、流行のスマホ、背景が街`,
    };
    navigate(`/image?${queryString.stringify(params)}`);
  };

  const demoVideoAnalyzer = () => {
    const params: VideoAnalyzerPageQueryParams = {
      content:
        '映っているものを説明してください。もし映っているものに文字が書かれている場合はそれも読んでください。',
    };
    navigate(`/video?${queryString.stringify(params)}`);
  };

  const demoBlog = () => {
    setIsShow(true);
    init('ブログ記事作成', [
      {
        title: '参考情報の取得',
        description: `URL を指定して、記事の参考となる情報を自動取得します。
追加コンテキストを設定することで、自分の欲しい情報のみを抽出可能です。`,
        path: 'web-content',
        params: {
          url: {
            value: 'https://aws.amazon.com/jp/what-is/generative-ai/',
          },
          context: {
            value:
              '生成AIの概要、仕組みを解説している部分、AWSについて説明している部分のみ抽出してください。',
          },
        } as InterUseCaseParams<WebContentPageQueryParams>,
      },
      {
        title: '記事の生成',
        description:
          '参考情報を元にブログの記事を自動生成します。コンテキストを詳細に設定することで、自分の意図した内容で記事が生成されやすくなります。',
        path: 'generate',
        params: {
          context: {
            value: `生成AIの仕組みの解説とAWSで生成AIを利用するメリットを解説するブログ記事を生成してください。記事を生成する際は、<rules></rules>を必ず守ってください。
<rules>
- マークダウン形式で章立てして書いてください。
- 生成AIおよび、AWS初心者をターゲットにした記事にしてください。
- IT初心者が分からないような用語は使わないか、分かりやすい言葉に置き換えてください。
- 生成AIで何ができるのかがわかる記事にしてください。
- 文章量が少ないと読者が満足しないので、一般的な情報は補完しながら文量を多くしてください。
- 読者の興味を惹きつけるような文章にしてください。
</rules>`,
          },
          information: {
            value: '{content}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
      {
        title: '記事の要約',
        description:
          'OGP（記事のリンクをシェアする際に表示される記事のプレビュー）用に、記事を要約します。OGP を適切に設定することで、記事がシェアされた際に記事の概要を正しく伝えることができます。',
        path: 'summarize',
        params: {
          sentence: {
            value: '{text}',
          },
        } as InterUseCaseParams<SummarizePageQueryParams>,
      },
      {
        title: '記事のサムネイル生成',
        description:
          'OGP（記事のリンクをシェアする際に表示される記事のプレビュー）用に、サムネイルを生成します。OGP にキャッチーなサムネイルを設定することで、読者の関心を惹くことができるかもしれません。',
        path: 'image',
        params: {
          content: {
            value: `ブログ記事のOGP用にサムネイル画像を生成してください。クラウドやAIの記事であることが一目でわかる画像にしてください。
ブログ記事の概要は<article></article>に設定されています。
<article>
{summarizedSentence}
</article>`,
          },
        } as InterUseCaseParams<GenerateImagePageQueryParams>,
      },
    ]);
  };

  const demoMeetingReport = () => {
    setIsShow(true);
    init('議事録作成', [
      {
        title: '文字起こし',
        description: `「音声認識」の機能を使って、録音データから会話の内容を文字起こしします。任意の音声ファイルで実行してください。
音声認識が完了したら、「整形」ボタンを押してください（音声認識結果は自動でコピーされます）。`,
        path: 'transcribe',
      },
      {
        title: '整形',
        description:
          '「文章生成」の機能を使って、文字起こしファイルを整形します。フィラーワードの除去や音声認識が正しくできていない部分などを補正し、人間が理解しやすいようにします。',
        path: 'generate',
        params: {
          context: {
            value: `録音データの文字起こし結果が入力されているので、<rules></rules>の通りに整形してください。
<rules>
- フィラーワードを除去してください。
- 文字起こしの誤認識と思われる内容は正しい内容に書き換えてください。
- 接続詞などが省略されている場合は、読みやすいように補完してください。
- 質疑応答も省略せず、記載してください。
</rules>`,
          },
          information: {
            value: '{transcript}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
      {
        title: '議事録作成',
        description:
          '「文章生成」の機能を使って、議事録を生成します。コンテキストを詳細に指定することで、議事録のフォーマットや記載の粒度を指示できます。',
        path: 'generate',
        params: {
          context: {
            value: `会議の発言内容を元にマークダウン形式の議事録を作成してください。
会議で話したテーマごとに章立てし、議論した内容、決定事項、宿題事項をまとめてください。`,
          },
          information: {
            value: '{text}',
          },
        } as InterUseCaseParams<GenerateTextPageQueryParams>,
      },
    ]);
  };

  const demoPromptFlowChat = () => {
    navigate(`/prompt-flow-chat`);
  };

  return (
    <div className="pb-24">
      <div className="bg-aws-squid-ink flex flex-col items-center justify-center px-3 py-5 text-xl font-semibold text-white lg:flex-row">
        Generative AI on
        <AwsIcon className="ml-5 size-20" />
      </div>

      <div className="mx-3 mb-6 mt-5 flex flex-col items-center justify-center text-xs lg:flex-row">
        By clicking
        <Button className="mx-0 mb-2 lg:mx-2 lg:mb-0" onClick={() => {}}>
          Try
        </Button>
        you can experience each use case.
      </div>

      <h1 className="mb-6 flex justify-center text-2xl font-bold">Use Cases</h1>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label="Chat"
          onClickDemo={demoChat}
          icon={<PiChatsCircle />}
          description="You can interact with large language models (LLMs) in a chat format. Thanks to platforms that allow direct interaction with LLMs, we can quickly respond to specific use cases and new use cases. It is also an effective environment for verifying prompt engineering."
        />
        {ragEnabled && (
          <CardDemo
            label="RAG Chat"
            sub="Amazon Kendra"
            onClickDemo={demoRag}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) is a method that combines information retrieval and LLM text generation, enabling effective information access. Since LLM generates responses based on reference documents obtained from Amazon Kendra, it is possible to easily realize LLM chat that corresponds to internal information."
          />
        )}
        {ragKnowledgeBaseEnabled && (
          <CardDemo
            label="RAG Chat"
            sub="Knowledge Base"
            onClickDemo={demoRagKnowledgeBase}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) is a method that combines information retrieval and LLM text generation, enabling effective information access. Since LLM generates responses based on reference documents obtained from Knowledge Base, it is possible to easily realize LLM chat that corresponds to internal information."
          />
        )}
        {agentEnabled && (
          <CardDemo
            label="Agent Chat"
            onClickDemo={demoAgent}
            icon={<PiRobot />}
            description="Agent is a method that enables LLMs to perform various tasks by integrating with APIs. In this solution, we implement an Agent that investigates necessary information using a search engine and provides answers as a sample implementation."
          />
        )}
        {promptFlowChatEnabled && (
          <CardDemo
            label="Prompt Flow Chat"
            onClickDemo={demoPromptFlowChat}
            icon={<PiFlowArrow />}
            description="With Amazon Bedrock Prompt Flows, you can create workflows by connecting prompts, base models, and other AWS services. The Prompt Flow Chat use case provides a chat interface for selecting and running pre-created Flows."
          />
        )}
        <CardDemo
          label="Text Generation"
          onClickDemo={demoGenerate}
          icon={<PiPencil />}
          description="Generating text in various contexts is one of the tasks that LLMs excel at. It can handle articles, reports, emails, and more in any context."
        />
        <CardDemo
          label="Summarization"
          onClickDemo={demoSummarize}
          icon={<PiNote />}
          description="LLMs are skilled at summarizing large amounts of text. Not only can they summarize, but they can also extract necessary information through a conversational format by providing the text as context. For example, you can load a contract and retrieve information such as What are the conditions for XXX? or What is the amount for YYY?"
        />
        <CardDemo
          label="Proofreading"
          onClickDemo={demoEditorial}
          icon={<PiPenNib />}
          description="LLMs can not only check for spelling and grammatical errors but also suggest improvements from a more objective perspective, considering the flow and content of the text. By having an LLM objectively check for points you may have missed before presenting your work, you can expect to improve the quality."
        />
        <CardDemo
          label="Translation"
          onClickDemo={demoTranslate}
          icon={<PiTranslate />}
          description="LLMs trained on multiple languages are capable of translation. Furthermore, they can reflect various specified contextual information, such as casualness or target audience, into the translation."
        />
        <CardDemo
          label="Web Content Extraction"
          onClickDemo={demoWebContent}
          icon={<PiGlobe />}
          description="Extracts web content such as blogs and documents. LLMs remove unnecessary information and format the extracted content into coherent sentences. The extracted content can be used in other use cases such as summarization and translation."
        />
        <CardDemo
          label="Image Generation"
          onClickDemo={demoGenerateImage}
          icon={<PiImages />}
          description="Image generation AI can create new images based on text or images. It allows you to instantly visualize ideas, which can be expected to improve efficiency in tasks like design work. In this feature, you can have an LLM assist in creating prompts."
        />
        {multiModalEnabled && (
          <CardDemo
            label="Video Analysis"
            onClickDemo={demoVideoAnalyzer}
            icon={<PiVideoCamera />}
            description="With multimodal models, it has become possible to input not only text but also images. In this feature, we provide image frames and text from a video as input for an LLM to analyze."
          />
        )}
      </div>

      <h1 className="mb-6 mt-12 flex justify-center text-2xl font-bold">
        Use Case Integration
      </h1>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label="Blog Post Creation"
          onClickDemo={demoBlog}
          icon={<PiPen />}
          description="It combines multiple use cases to generate blog posts. By automatically generating article summaries and thumbnail images, it also makes it easy to set up OGP. As an example, it generates a blog post introducing AI generation based on information from the AWS official website."
        />
        <CardDemo
          label="Minutes generation"
          onClickDemo={demoMeetingReport}
          icon={<PiNotebook />}
          description="It combines multiple use cases to automatically generate minutes from meeting recording data. It is possible to transcribe recording data, format transcription results, and create minutes without human cost."
        />
      </div>
    </div>
  );
};

export default LandingPage;
