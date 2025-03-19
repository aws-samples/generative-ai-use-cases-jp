import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardDemo from '../components/CardDemo';
import Button from '../components/Button';
import {
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiChatsCircle,
  PiTranslate,
  PiGlobe,
  PiImages,
  PiVideoLight,
  PiNotebook,
  PiPen,
  PiRobot,
  PiVideoCamera,
  PiFlowArrow,
  PiTreeStructure,
  PiPenNib,
} from 'react-icons/pi';
import AwsIcon from '../assets/aws.svg?react';
import useInterUseCases from '../hooks/useInterUseCases';
import {
  AgentPageQueryParams,
  ChatPageQueryParams,
  GenerateImagePageQueryParams,
  GenerateVideoPageQueryParams,
  GenerateTextPageQueryParams,
  InterUseCaseParams,
  RagPageQueryParams,
  SummarizePageQueryParams,
  TranslatePageQueryParams,
  WebContentPageQueryParams,
  VideoAnalyzerPageQueryParams,
  DiagramPageQueryParams,
} from '../@types/navigate';
import queryString from 'query-string';
import { MODELS } from '../hooks/useModel';
import useUseCases from '../hooks/useUseCases';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const ragKnowledgeBaseEnabled: boolean =
  import.meta.env.VITE_APP_RAG_KNOWLEDGE_BASE_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const inlineAgents: boolean = import.meta.env.VITE_APP_INLINE_AGENTS === 'true';
const { visionEnabled, flowChatEnabled } = MODELS;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { enabled } = useUseCases();
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

  const demoWriter = () => {
    navigate(`/writer`);
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

  const demoGenerateVideo = () => {
    const params: GenerateVideoPageQueryParams = {
      prompt: 'A banana is dancing in the middle of the ocean',
    };
    navigate(`/video?${queryString.stringify(params)}`);
  };

  const demoVideoAnalyzer = () => {
    const params: VideoAnalyzerPageQueryParams = {
      content:
        '映っているものを説明してください。もし映っているものに文字が書かれている場合はそれも読んでください。',
    };
    navigate(`/video-analyzer?${queryString.stringify(params)}`);
  };

  const demoGenerateDiagram = () => {
    const params: DiagramPageQueryParams = {
      content: `会社の一般的な経費生産フローを色つきで図示してください。`,
    };
    navigate(`/diagram?${queryString.stringify(params)}`);
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

  const demoFlowChat = () => {
    navigate(`/flow-chat`);
  };

  return (
    <div className="pb-24">
      <div className="bg-aws-squid-ink flex flex-col items-center justify-center px-3 py-5 text-xl font-semibold text-white lg:flex-row">
        <AwsIcon className="mr-5 size-20" />
        ではじめる生成 AI
      </div>

      <div className="mx-3 mb-6 mt-5 flex flex-col items-center justify-center text-xs lg:flex-row">
        <Button className="mb-2 mr-0 lg:mb-0 lg:mr-2" onClick={demoFlowChat}>
          試す
        </Button>
        をクリックすることで、各ユースケースを体験できます。
      </div>

      <h1 className="mb-6 flex justify-center text-2xl font-bold">
        ユースケース一覧
      </h1>

      <div className="mx-4 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:mx-20 xl:grid-cols-2">
        <CardDemo
          label="チャット"
          onClickDemo={demoChat}
          icon={<PiChatsCircle />}
          description="LLM とチャット形式で対話することができます。細かいユースケースや新しいユースケースに迅速に対応することができます。プロンプトエンジニアリングの検証用環境としても有効です。"
        />
        {ragEnabled && (
          <CardDemo
            label="RAG チャット"
            sub="Amazon Kendra"
            onClickDemo={demoRag}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) は、情報の検索と LLM の文章生成を組み合わせる手法のことで、効果的な情報アクセスを実現できます。Amazon Kendra から取得した参考ドキュメントをベースに LLM が回答を生成してくれるため、「社内情報に対応した LLM チャット」を簡単に実現することが可能です。"
          />
        )}
        {ragKnowledgeBaseEnabled && (
          <CardDemo
            label="RAG チャット"
            sub="Knowledge Base"
            onClickDemo={demoRagKnowledgeBase}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) は、情報の検索と LLM の文章生成を組み合わせる手法のことで、効果的な情報アクセスを実現できます。Knowledge Base の Hybrid Search を利用して参考ドキュメントを取得し、LLM が回答を生成します。"
          />
        )}
        {agentEnabled && !inlineAgents && (
          <CardDemo
            label="Agent チャット"
            onClickDemo={demoAgent}
            icon={<PiRobot />}
            description="Agent チャットユースケースでは Agents for Amazon Bedrock を利用してアクションを実行させたり、Knowledge Bases for Amazon Bedrock のベクトルデータベースを参照することが可能です。"
          />
        )}
        {flowChatEnabled && (
          <CardDemo
            label="Flow チャット"
            onClickDemo={demoFlowChat}
            icon={<PiFlowArrow />}
            description="Flow を使用して、複数のステップを持つ対話型チャットフローを作成します。ユーザーの入力に基づいて、動的に次のステップを決定し、より複雑な対話シナリオを実現します。"
          />
        )}
        {enabled('generate') && (
          <CardDemo
            label="文章生成"
            onClickDemo={demoGenerate}
            icon={<PiPencil />}
            description="あらゆるコンテキストで文章を生成することは LLM が最も得意とするタスクの 1 つです。記事・レポート・メールなど、あらゆるコンテキストに対応します。"
          />
        )}
        {enabled('summarize') && (
          <CardDemo
            label="要約"
            onClickDemo={demoSummarize}
            icon={<PiNote />}
            description="LLM は、大量の文章を要約するタスクを得意としています。要約する際に「1行で」や「子供でもわかる言葉で」などコンテキストを与えることができます。"
          />
        )}
        {enabled('writer') && (
          <CardDemo
            label="執筆"
            onClickDemo={demoWriter}
            icon={<PiPenNib />}
            description="多言語で学習した LLM は、翻訳を行うことも可能です。また、ただ翻訳するだけではなく、カジュアルさ・対象層など様々な指定されたコンテキスト情報を翻訳に反映させることが可能です。"
          />
        )}
        {enabled('translate') && (
          <CardDemo
            label="翻訳"
            onClickDemo={demoTranslate}
            icon={<PiTranslate />}
            description="多言語で学習した LLM は、翻訳を行うことも可能です。また、ただ翻訳するだけではなく、カジュアルさ・対象層など様々な指定されたコンテキスト情報を翻訳に反映させることが可能です。"
          />
        )}
        {enabled('webContent') && (
          <CardDemo
            label="Web コンテンツ抽出"
            onClickDemo={demoWebContent}
            icon={<PiGlobe />}
            description="ブログやドキュメントなどの Web コンテンツを抽出します。LLM によって不要な情報はそぎ落とし、成立した文章として整形します。抽出したコンテンツは要約、翻訳などの別のユースケースで利用できます。"
          />
        )}
        {enabled('image') && (
          <CardDemo
            label="画像生成"
            onClickDemo={demoGenerateImage}
            icon={<PiImages />}
            description="画像生成 AI は、テキストや画像を元に新しい画像を生成できます。アイデアを即座に可視化することができ、デザイン作業などの効率化を期待できます。こちらの機能では、プロンプトの作成を LLM に支援してもらうことができます。"
          />
        )}
        {enabled('video') && (
          <CardDemo
            label="動画生成"
            onClickDemo={demoGenerateVideo}
            icon={<PiVideoLight />}
            description="動画生成 AI はテキストから短い動画を生成します。生成した動画は素材としてさまざまなシーンで活用できます。"
          />
        )}
        {visionEnabled && enabled('video') && (
          <CardDemo
            label="映像分析"
            onClickDemo={demoVideoAnalyzer}
            icon={<PiVideoCamera />}
            description="マルチモーダルモデルによってテキストのみではなく、画像を入力することが可能になりました。こちらの機能では、映像の画像フレームとテキストを入力として LLM に分析を依頼します。"
          />
        )}
        {enabled('diagram') && (
          <CardDemo
            label="ダイアグラム生成"
            onClickDemo={demoGenerateDiagram}
            icon={<PiTreeStructure />}
            description="自然言語による説明、文書やコードから、フローチャート、シーケンス図、マインドマップなどの様々な図を自動的に作成できます。システム設計、ビジネスフロー、プロジェクト計画などの複雑な関係性を、視覚的に表現し理解を効率化します。"
          />
        )}
      </div>

      {
        // いずれかのユースケース連携が有効であれば表示する
        // ブログ記事作成
        (enabled('webContent', 'generate', 'summarize', 'image') ||
          // 議事録作成
          enabled('generate')) && (
          <>
            <h1 className="mb-6 mt-12 flex justify-center text-2xl font-bold">
              ユースケース連携
            </h1>

            <div className="mx-4 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:mx-20 xl:grid-cols-2">
              {enabled('webContent', 'generate', 'summarize', 'image') && (
                <CardDemo
                  label="ブログ記事作成"
                  onClickDemo={demoBlog}
                  icon={<PiPen />}
                  description="複数のユースケースを組み合わせて、ブログ記事を生成します。記事の概要とサムネイル画像も自動生成することで、OGP の設定も容易になります。例として、AWS 公式サイトの情報を元に生成 AI を紹介するブログ記事を生成します。"
                />
              )}

              {enabled('generate') && (
                <CardDemo
                  label="議事録作成"
                  onClickDemo={demoMeetingReport}
                  icon={<PiNotebook />}
                  description="複数のユースケースを組み合わせて、会議の録音データから議事録を自動作成します。録音データの文字起こし、文字起こし結果の整形、議事録作成を人的コストをかけずに行うことが可能です。"
                />
              )}
            </div>
          </>
        )
      }
    </div>
  );
};

export default LandingPage;
