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
        content: `피보나치 수열을 출력하는 Python함수를 적어주세요. 인수가 항이고 처리는 재귀로 작성하세요. `,
      },
    });
  };

  const demoRag = () => {
    navigate('/rag', {
      state: {
        content: `Bedrock 보안에 대해 알려주세요.
왜 Bedrock를 안전하게 이용할 수 있는지 알 수 있도록 설명해 주세요.`,
      },
    });
  };

  const demoGenerate = () => {
    navigate('/generate', {
      state: {
        information: `Amazon Bedrock 은 AI21 Labs、Anthropic、Cohere、Meta、Stability AI、Amazon 등 대형 AI 기업이 제공하는 고성능 기반 모델(FM)을 단일 API로 선택할 수 있는 풀 매니지드형 서비스입니다. 또한 생성형 AI 애플리케이션 구축에 필요한 폭넓은 기능도 갖추고 있어 프라이버시와 보안을 유지하면서 개발을 간소화할 수 있습니다.Amazon Bedrock의 포괄적인 기능을 사용하면 다양한 상위 FM을 쉽게 시도하거나 미세 조정 및 검색 확장 생성(RAG)과 같은 기법을 사용하여 데이터를 사용하여 필요에 맞게 제작하거나 여행 예약 및 보험금 청구 처리부터 광고 캠페인 작성 및 재고 관리까지 복잡한 비즈니스 작업을 수행하는 관리 에이전트를 만들 수 있습니다. 이것들을 모두 코드를 직접 작성하지 않고도 할 수 있습니다.Amazon Bedrock 은 서버리스이기 때문에 인프라를 관리할 필요가 없습니다. 또, 익숙한 AWS 서비스를 사용하여 생성형 AI 기능을 애플리케이션에 안전하게 통합하여 배포할 수 있습니다.`,
        context:
          '프레젠테이션을 위해서 마크다운 형식으로 작성하여 각각 자세하게 설명을 해주세요.',
      },
    });
  };

  const demoSummarize = () => {
    navigate('/summarize', {
      state: {
        sentence:
          'Amazon Bedrock 은、Amazon 및 AI 스타트업 기업이 제공하는 기반 모델 (FM) 을 API를 통해 이용할 수 있도록 하는 완전 관리형 서비스입니다. 따라서 다양한 FM 중 선택하여 사용사례에 가장 적합한 모델을 찾을 수 있습니다.Amazon Bedrock 서버리스 경험을 통해 즉시 FM을 시작하거나 FM을 쉽게 이용하거나 자체 데이터를 사용하여 FM을 개인 맞춤 제작하거나 AWS의 도구 및 기능을 사용하여 FM을 애플리케이션에 심리스하게 통합하여 배포할 수 있습니다.Amazon Bedrock 에이전트는 개발자가 자체 데이터를 기반으로 최신 답변을 제공하여 폭넓은 사용 사례 작업을 할 수 있는 Generative AI 애플리케이션을 개발자가 쉽게 만들 수 있도록 하는 완전 관리 기능입니다.Bedrock의 서버리스 경험으로 인프라 관리 없이 바로 사용을 시작하고 자체 데이터를 사용하여 FM을 개인 맞춤 제작하여 익숙한 AWS 툴이나 기능을 사용하여 애플리케이션에 쉽게 통합하여 배포할 수 있습니다. (다양한 모델을 테스트하기 위한 실험이나 FM을 대규모로 관리하기 위한 파이프라인 등의 Amazon SageMaker의 ML 기능과의 통합을 포함합니다).',
        additionalContext: '',
      },
    });
  };

  const demoEditorial = () => {
    navigate('/editorial', {
      state: {
        sentence:
          '안녕하세요. 저는 교정을 지원하는 AI 어시스턴트 입니다. 좋아하는 문장을 입력해주세요.',
      },
    });
  };

  const demoTranslate = () => {
    navigate('/translate', {
      state: {
        sentence:
          '안녕하세요. 저는 번역을 지원하는 AI 어시스턴트 입니다. 좋아하는 문장을 입력해주세요.',
      },
    });
  };

  const demoGenerateImage = () => {
    navigate('/image', {
      state: {
        content: `스마트폰광고의 디자인안을 출력해주세요. 귀엽다, 멋지다, 사용하기 쉬운, POP컬쳐, 친숙한, 젊은 사람들을 위한, 음악, 사진, 유행하는 스마트폰, 배경이 거리`,
      },
    });
  };

  return (
    <div className="pb-24">
      <div className="mx-3 my-5 flex items-center justify-center text-xl font-semibold">
        <AwsIcon className="mr-5 h-20 w-20" />
        생성형 AI를 체험해 봅시다.
      </div>

      <div className="mx-3 mb-6 mt-10 flex flex-col items-center justify-center lg:flex-row">
        <Button className="mb-4 mr-0 lg:mb-0 lg:mr-2" onClick={() => {}}>
          버튼
        </Button>
        을 클릭하면, 주요 사용 사례를 체험할 수 있습니다.
      </div>

      <div className="mx-20 grid gap-x-20 gap-y-10 md:grid-cols-1 xl:grid-cols-2">
        <CardDemo label="채팅" onClickDemo={demoChat}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiChatsCircle />
            </div>
            <div className="text-sm">
              LLM
              과 채팅 형식으로 대화할 수 있습니다.세세하거나 새로운 사용사례에 신속하게 대응할 수 있습니다. 프롬프트 엔지니어링의 검증용 환경으로의 사용도 가능합니다.
            </div>
          </div>
        </CardDemo>
        {ragEnabled && (
          <CardDemo label="RAG 채팅" onClickDemo={demoRag}>
            <div className="flex flex-row items-start">
              <div className="mr-4 text-7xl">
                <PiChatCircleText />
              </div>
              <div className="text-sm">
                AG (Retrieval Augmented Generation) 는 정보검색과 LLM
                의 문장 생성을 조합하는 방법으로 효과적인 정보 접근을 실현할 수 있습니다.Amazon
                Kendra 에서 획득한 참고 문서를 기반으로 LLM
                가 답변을 생성해 주기 때문에, "사내 정보에 대응한 LLM
                채팅" 같은 예시를 쉽게 구현할 수 있습니다.
              </div>
            </div>
          </CardDemo>
        )}
        <CardDemo label="문장생성" onClickDemo={demoGenerate}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiPencil />
            </div>
            <div className="text-sm">
              모든 컨텍스트에서 문장을 생성하는 것은 LLM
              가 가장 잘하는 작업 중 하나입니다.
              기사·리포트·메일 등, 모든 콘텍스트에 대응합니다.
            </div>
          </div>
        </CardDemo>
        <CardDemo label="요약" onClickDemo={demoSummarize}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiNote />
            </div>
            <div className="text-sm">
              LLM
              는 대량의 문장을 요약하는 작업을 잘합니다. 단순히 요약하는 것이 아니라 문장을 컨텍스트로 준 다음, 필요한 정보를 대화 형식으로 끌어낼수도 있습니다. 예를 들어 계약서를 읽어들여 XXXX
              의 조건은?" "YYY
              의 금액은?'과 같은 정보를 획득할 수 있습니다.
            </div>
          </div>
        </CardDemo>
        <CardDemo label="교정" onClickDemo={demoEditorial}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiPenNib />
            </div>
            <div className="text-sm">
              LLM
              은 문장을 이해 할 수 있고 오탈자뿐만 아니라 문장을 이해하고 객관적으로 개선점을 지적할 수 있습니다.
              남에게 보여주기 전에 LLM
              에게 스스로 깨닫지 못한 점을 객관적으로 지적받아 퀄리티를 높이는 효과를 기대할 수 있습니다.
            </div>
          </div>
        </CardDemo>
        <CardDemo label="번역" onClickDemo={demoTranslate}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiTranslate />
            </div>
            <div className="text-sm">
              다국어로 학습한 LLM은 번역을 할 수도 있습니다.
              또한 단순히 번역만 하는 것이 아니라 캐주얼함, 대상층 등의 정보를 번역에 반영하는 것 또한 가능합니다.
            </div>
          </div>
        </CardDemo>
        <CardDemo label="이미지생성" onClickDemo={demoGenerateImage}>
          <div className="flex flex-row items-start">
            <div className="mr-4 text-7xl">
              <PiImages />
            </div>
            <div className="text-sm">
              이미지 생성 AI
              는 텍스트나 이미지를 바탕으로 새로운 이미지를 생성할 수 있습니다. 아이디어를 즉시 가시화할 수 있어 디자인 작업 등의 효율화를 기대할 수 있습니다. 이 기능에서는 프롬프트 작성을
              LLM에서 지원받을 수 있습니다.
            </div>
          </div>
        </CardDemo>
      </div>
    </div>
  );
};

export default LandingPage;
