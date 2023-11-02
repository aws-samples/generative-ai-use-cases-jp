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
  PiImages,
} from 'react-icons/pi';
import { ReactComponent as AwsIcon } from '../assets/aws.svg';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const demoChat = () => {
    navigate('/chat', {
      state: {
        content: `フィボナッチ数を返す Python の関数を書いてください。
引数が項で、処理は再帰で書くようにしてください。`,
      },
    });
  };

  const demoRag = () => {
    navigate('/rag', {
      state: {
        content: `Bedrock のセキュリティについて、教えてください。
なぜ Bedrock が安全に利用できるのかわかるように説明してください。`,
      },
    });
  };

  const demoGenerate = () => {
    navigate('/generate', {
      state: {
        information: `Amazon Bedrock は、AI21 Labs、Anthropic、Cohere、Meta、Stability AI、Amazon などの大手 AI 企業が提供する高性能な基盤モデル (FM) を単一の API で選択できるフルマネージド型サービスです。また、生成系 AI アプリケーションの構築に必要な幅広い機能も備えているため、プライバシーとセキュリティを維持しながら開発を簡素化できます。Amazon Bedrock の包括的な機能を使用すると、さまざまなトップ FM を簡単に試したり、微調整や検索拡張生成 (RAG) などの手法を使用してデータを使用してプライベートにカスタマイズしたり、旅行の予約や保険金請求の処理から広告キャンペーンの作成や在庫管理まで、複雑なビジネスタスクを実行するマネージドエージェントを作成したりできます。これらはすべて、コードを記述することなく行えます。Amazon Bedrock はサーバーレスであるため、インフラストラクチャを管理する必要がありません。また、使い慣れた AWS サービスを使用して、生成系 AI 機能をアプリケーションに安全に統合してデプロイできます。`,
        context:
          'プレゼンテーションのために、マークダウン形式で章立てして、それぞれ端的に説明を',
      },
    });
  };

  const demoSummarize = () => {
    navigate('/summarize', {
      state: {
        sentence:
          'Amazon Bedrock は、Amazon や主要な AI スタートアップ企業が提供する基盤モデル (FM) を API を通じて利用できるようにする完全マネージド型サービスです。そのため、さまざまな FM から選択して、ユースケースに最も適したモデルを見つけることができます。Amazon Bedrock のサーバーレスエクスペリエンスにより、すぐに FM を開始したり、FM を簡単に試したり、独自のデータを使用して FM をプライベートにカスタマイズしたり、AWS のツールや機能を使用して FM をアプリケーションにシームレスに統合してデプロイしたりできます。Amazon Bedrock のエージェントは、開発者が独自の知識源に基づいて最新の回答を提供し、幅広いユースケースのタスクを完了できるジェネレーティブ AI アプリケーションを開発者が簡単に作成できるようにする完全マネージド機能です。Bedrock のサーバーレスエクスペリエンスにより、インフラストラクチャを管理することなく、すぐに使用を開始し、独自のデータを使用して FM をプライベートにカスタマイズし、使い慣れた AWS ツールや機能を使用してそれらをアプリケーションに簡単に統合してデプロイできます (さまざまなモデルをテストするための実験や FM を大規模に管理するためのパイプラインなどの Amazon SageMaker の ML 機能との統合を含みます)。',
        additionalContext: '',
      },
    });
  };

  const demoEditorial = () => {
    navigate('/editorial', {
      state: {
        sentence:
          'こんちは。私は校正を支援する完璧な AI アシスタントです。お好きな文章を入力してくさい。',
      },
    });
  };

  const demoTranslate = () => {
    navigate('/translate', {
      state: {
        sentence:
          'こんにちは。私は翻訳を支援する AI アシスタントです。お好きな文章を入力してください。',
      },
    });
  };

  const demoGenerateImage = () => {
    navigate('/image', {
      state: {
        content: `スマホ広告のデザイン案を出力してください。
可愛い、おしゃれ、使いやすい、POPカルチャー、親しみやすい、若者向け、音楽、写真、流行のスマホ、背景が街`,
      },
    });
  };

  return (
    <div className="pb-24">
      <div className="bg-aws-squid-ink flex flex-col items-center justify-center px-3 py-5 text-xl font-semibold text-white lg:flex-row">
        <AwsIcon className="mr-5 h-20 w-20" />
        生成系 AI を体験してみましょう。
      </div>

      <h1 className="mt-6 flex justify-center text-2xl font-bold">
        ユースケース一覧
      </h1>

      <div className="mx-3 mb-6 mt-5 flex flex-col items-center justify-center text-xs lg:flex-row">
        <Button className="mb-2 mr-0 lg:mb-0 lg:mr-2" onClick={() => {}}>
          デモ
        </Button>
        をクリックすることで、各ユースケースを体験できます。
      </div>

      <div className="mx-20 grid gap-x-20 gap-y-5 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo
          label="チャット"
          onClickDemo={demoChat}
          icon={<PiChatsCircle />}
          description="LLM とチャット形式で対話することができます。細かいユースケースや新しいユースケースに迅速に対応することができます。プロンプトエンジニアリングの検証用環境としても有効です。"
        />
        {ragEnabled && (
          <CardDemo
            label="RAG チャット"
            onClickDemo={demoRag}
            icon={<PiChatCircleText />}
            description="RAG (Retrieval Augmented Generation) は、情報の検索と LLM の文章生成を組み合わせる手法のことで、効果的な情報アクセスを実現できます。Amazon Kendra から取得した参考ドキュメントをベースに LLM が回答を生成してくれるため、「社内情報に対応した LLM チャット」を簡単に実現することが可能です。"
          />
        )}
        <CardDemo
          label="文章生成"
          onClickDemo={demoGenerate}
          icon={<PiPencil />}
          description="あらゆるコンテキストで文章を生成することは LLM が最も得意とするタスクの 1 つです。記事・レポート・メールなど、あらゆるコンテキストに対応します。"
        />
        <CardDemo
          label="要約"
          onClickDemo={demoSummarize}
          icon={<PiNote />}
          description="LLM は、大量の文章を要約するタスクを得意としています。要約する際に「1行で」や「子供でもわかる言葉で」などコンテキストを与えることができます。"
        />
        <CardDemo
          label="校正"
          onClickDemo={demoEditorial}
          icon={<PiPenNib />}
          description="LLM は、文章を理解することができ、誤字脱字だけでなく文章を理解し客観的に改善点を指摘することが可能です。人に見せる前に LLM に自分では気づかなかった点を客観的に指摘してもらいクオリティを上げる効果が期待できます。"
        />
        <CardDemo
          label="翻訳"
          onClickDemo={demoTranslate}
          icon={<PiTranslate />}
          description="多言語で学習した LLM は、翻訳を行うことも可能です。また、ただ翻訳するだけではなく、カジュアルさ・対象層など様々な指定されたコンテキスト情報を翻訳に反映させることが可能です。"
        />
        <CardDemo
          label="画像生成"
          onClickDemo={demoGenerateImage}
          icon={<PiImages />}
          description="画像生成 AI は、テキストや画像を元に新しい画像を生成できます。アイデアを即座に可視化することができ、デザイン作業などの効率化を期待できます。こちらの機能では、プロンプトの作成を LLM に支援してもらうことができます。"
        />
      </div>
    </div>
  );
};

export default LandingPage;
