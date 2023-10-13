import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardDemo from '../components/CardDemo';
import Button from '../components/Button';
import {
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiEnvelope,
  PiListMagnifyingGlass,
  PiChatsCircle,
  PiPenNib,
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

  const demoSummarize = () => {
    navigate('/summarize', {
      state: {
        sentence:
          'Amazon Bedrock は、Amazon や主要な AI スタートアップ企業が提供する基盤モデル (FM) を API を通じて利用できるようにする完全マネージド型サービスです。そのため、さまざまな FM から選択して、ユースケースに最も適したモデルを見つけることができます。Amazon Bedrock のサーバーレスエクスペリエンスにより、すぐに FM を開始したり、FM を簡単に試したり、独自のデータを使用して FM をプライベートにカスタマイズしたり、AWS のツールや機能を使用して FM をアプリケーションにシームレスに統合してデプロイしたりできます。Amazon Bedrock のエージェントは、開発者が独自の知識源に基づいて最新の回答を提供し、幅広いユースケースのタスクを完了できるジェネレーティブ AI アプリケーションを開発者が簡単に作成できるようにする完全マネージド機能です。Bedrock のサーバーレスエクスペリエンスにより、インフラストラクチャを管理することなく、すぐに使用を開始し、独自のデータを使用して FM をプライベートにカスタマイズし、使い慣れた AWS ツールや機能を使用してそれらをアプリケーションに簡単に統合してデプロイできます (さまざまなモデルをテストするための実験や FM を大規模に管理するためのパイプラインなどの Amazon SageMaker の ML 機能との統合を含みます)。',
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

  const demoEmail = () => {
    navigate('mail', {
      state: {
        recipient: '田中部長',
        recipientAttr: 'ABC株式会社',
        sender: '鈴木',
        context: '契約してもらっている AAA プランについて',
        situation: '契約更新時期が近づいてきた',
        message: '契約更新手続きを行ってほしい',
        action: '弊社のSaaSにログインして、設定ページから契約更新',
        casual: 1,
        otherContext:
          'エンタープライズプランにアップグレードしてもらうと24時間サポートがつく',
      },
    });
  };

  const demoReolayEmail = () => {
    navigate('mail', {
      state: {
        mailContent: `田中部長 様

ABC株式会社の鈴木です。いつもお世話になっております。

この度、契約更新時期が近づいてまいりましたので、ご連絡差し上げました。

弊社のSaaSをご利用頂いておりますが、契約の更新手続きを行っていただきたく存じます。

具体的な手続き方法といたしましては、まずは弊社のウェブサイトにアクセスし、ログインしていただくことから始めます。

ログイン後は、設定ページから契約更新の手続きを行っていただけます。

なお、今回の契約更新に合わせて、エンタープライズプランへのアップグレードもご検討いただければと思います。アップグレードいただけますと、24時間体制のサポートがご利用いただけますので、より円滑な業務運営が可能となります。

ご不明点やお困りごとがございましたら、お気軽にお問い合わせください。弊社担当者が丁寧にお答えいたします。

ご対応いただければ幸いです。

引き続き、ABC株式会社のご支援に努めてまいりますので、今後ともよろしくお願い申し上げます。

鈴木
        `,
        recipient: '',
        recipientAttr: '',
        sender: '',
        context: '',
        situation: '',
        message: '',
        action: '',
        casual: 3,
        otherContext: '',
      },
    });
  };

  const demoCs = () => {
    navigate('cs', {
      state: {
        context: 'SaaS のサポート業務に従事',
        situation: 'お客様からの問い合わせを受けている',
        casual: 1,
        recipientMessage: '機能Xを使いたいが、画面にない',
        senderMessage: 'プランAを契約する必要がある',
      },
    });
  };

  return (
    <div className="pb-24">
      <div className="mx-3 my-5 flex items-center justify-center text-xl font-semibold">
        <AwsIcon className="mr-5 h-20 w-20" />
        生成系 AI を体験してみましょう。
      </div>

      <div className="mx-3 mb-6 mt-10 flex flex-col items-center justify-center lg:flex-row">
        <Button className="mb-4 mr-0 lg:mb-0 lg:mr-2" onClick={() => {}}>
          デモ
        </Button>
        をクリックすることで、主要なユースケースを体験できます。
      </div>

      <div className="mx-20 grid gap-x-20 gap-y-10 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo label="チャット" onClickDemo={demoChat}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiChatsCircle />
            </div>
            <div className="text-sm">
              LLM
              とチャット形式で対話することができます。細かいユースケースや新しいユースケースに迅速に対応することができます。プロンプトエンジニアリングの検証用環境としても有効です。
            </div>
          </div>
        </CardDemo>
        {ragEnabled && (
          <CardDemo label="RAG チャット" onClickDemo={demoRag}>
            <div className="flex flex-row items-start">
              <div className="mr-4 text-7xl">
                <PiChatCircleText />
              </div>
              <div className="text-sm">
                RAG (Retrieval Augmented Generation) は、情報の検索と LLM
                の文章生成を組み合わせる手法のことで、効果的な情報アクセスを実現できます。Amazon
                Kendra から取得した参考ドキュメントをベースに LLM
                が回答を生成してくれるため、「社内情報に対応した LLM
                チャット」を簡単に実現することが可能です。
              </div>
            </div>
          </CardDemo>
        )}
        <CardDemo label="要約" onClickDemo={demoSummarize}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiNote />
            </div>
            <div className="text-sm">
              LLM
              は、大量の文章を要約するタスクを得意としています。ただ要約するだけでなく、文章をコンテキストとして与えた上で、必要な情報を対話形式で引き出すこともできます。例えば、契約書を読み込ませて「XXX
              の条件は？」「YYY
              の金額は？」といった情報を取得することが可能です。
            </div>
          </div>
        </CardDemo>
        <CardDemo label="校正" onClickDemo={demoEditorial}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiPenNib />
            </div>
            <div className="text-sm">
              LLM
              は、文章を理解することができ、誤字脱字だけでなく文章を理解し客観的に改善点を指摘することが可能です。
              人に見せる前に LLM
              に自分では気づかなかった点を客観的に指摘してもらいクオリティを上げる効果が期待できます。
            </div>
          </div>
        </CardDemo>

        <CardDemo label="メール生成" onClickDemo={demoEmail}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiEnvelope />
            </div>
            <div className="text-sm">
              LLM
              を活用することで、メールを作成する際の冗長なタスクを極力減らし、ルーチンワークにかかる時間を大幅に削減することが可能です。単に補完するだけでなく、誤字脱字の防止という効果も期待できます。
            </div>
          </div>
        </CardDemo>

        <CardDemo label="情報抽出" onClickDemo={demoReolayEmail}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiListMagnifyingGlass />
            </div>
            <div className="text-sm">
              文章を LLM に読み込ませることで、必要な情報を抽出できます。LLM
              は文章を的確に理解し、文体に気を使うことなく情報を抽出することが可能です。
              このデモでは、メール本文を読み込むことで、返信メールを生成する際に必要な情報を抽出します。
            </div>
          </div>
        </CardDemo>

        <CardDemo label="CS 業務効率化" onClickDemo={demoCs}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiPencil />
            </div>
            <div className="text-sm">
              お客様からの問い合わせに対して「OK」や「無理です」といった単純な返答から、「承知いたしました。直ちに対応いたします。」や「申し訳ございません。お客様のプランではその機能の有効化はできません。」などの表現への変換が可能です。
            </div>
          </div>
        </CardDemo>
      </div>
    </div>
  );
};

export default LandingPage;
