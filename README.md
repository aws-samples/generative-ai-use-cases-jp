> **이 Repository는 한국어에 최적화 되었습니다**

## Original Repo : Generative AI Use Cases JP
> https://github.com/aws-samples/generative-ai-use-cases-jp/tree/main

# Generative AI Use Cases KR

Generative AI（생성형 AI）는、혁신적인 비즈니스 가능성을 제공합니다. 이 Repository에서는 Generative AI를 활용한 비즈니스 사용 사례를 소개합니다.

![sc_lp.png](/imgs/sc_lp.png)

> **생성형 AI가 발전함에 따라 변화가 심한 경우가 종종 있습니다. 오류 발생시, 메인 브랜치의 업데이트를 확인 부탁드립니다.**

## 기능목록

> :white_check_mark: 구현되어 있음、:construction: ... 아직 구현되어 있지 않음.

- :white_check_mark: Amazon Bedrock 을 LLM 으로 사용
- :white_check_mark: Amazon Bedrock Fine-tuning 을 위한 데이터 수집
- :construction: Amazon Bedrock Fine-tuning 을 위한 데이터 라벨링
- :construction: Amazon Bedrock Fine-tuning 실행

## 사용 사례 목록

> 사용 사례는 수시로 추가될 예정입니다. 요청이 있으시다면 [Issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues) 에 작성 부탁드립니다.

<details>
  <summary>채팅</summary>

  LLM 과 채팅 형식으로 대화할 수 있습니다. LLM과 직접 대화할 수 있는 플랫폼이 존재 한다면, 세세한 사용 사례나 새로운 사용 사례에 대해서 빠르게 대응 할 수 있습니다. 또한 프롬프트 엔지니어링의 검증용 환경으로도 유용합니다.

  <img src="/imgs/usecase_chat.gif"/>
</details>

<details>
   <summary>RAG 채팅</summary>

  RAG 는 LLM 이 잘 모르는 최신 정보나 도메인 지식을 외부에서 알려줌으로써 LLM 이 답변할 수 없는 내용도 답변할 수 있도록 하는 방식입니다. 동시에 근거에 기반한 답변만 허용하기 때문에 LLM 에서 발생하는 "잘못된 정보"를 포함한 답변을 방지하는 효과도 있습니다. 예를 들어, 사내 문서를 LLM 에게 전달하면서 사내 문의 대응을 자동화 할 수 있습니다. 이 Repository에서는 Amazon Kendra를 이용하고 있습니다.

  <img src="/imgs/usecase_rag.gif"/>
</details>

<details>
   <summary>문장 생성</summary>

   LLM 의 장점은 어떤 문맥의 문장이던 생성 가능하다는 것입니다. 기사, 보고서, 이메일 등의 목적으로 사용 할 수 있습니다.

  <img src="/imgs/usecase_generate_text.gif"/>
</details>

<details>
  <summary>요약</summary>

  LLM 은 대량의 문장을 요약하는 작업에 특화되어 있습니다. 단순히 요약하는데 그치지 않고, 문장을 입력하여 필요한 정보를 대화 형식으로 이끌어낼 수도 있습니다. 예를 들어, 계약서를 불러와 "XXX의 조건은?" "YYY의 금액은?" 등의 정보를 얻을 수 있습니다.

  <img src="/imgs/usecase_summarize.gif"/>
</details>

<details>
  <summary>교정</summary>

  LLM 은 문장의 오탈자 뿐만이 아니라 문장을 이해하고 개선점을 지적할 수 있습니다. 자신이 작성한 보고서를 남에게 보여주기 전에 LLM 에게 자신이 미처 발견하지 못한 부분을 객관적으로 첨삭받아 품질을 높이는 효과를 기대할 수 있습니다.

  <img src="/imgs/usecase_editorial.gif"/>
</details>

<details>
  <summary>번역</summary>

  다국어로 학습한 LLM은 번역도 가능합니다. 또한, 단순히 번역만 하는 것이 아니라, 캐주얼성, 대상층 등 다양한 지정 컨텍스트 정보를 번역에 반영 할 수 있습니다.

  <img src="/imgs/usecase_translate.gif"/>
</details>


<details>
  <summary>이미지 생성</summary>

  이미지 생성 AI는 텍스트와 이미지를 기반으로 새로운 이미지를 생성할 수 있습니다. 아이디어를 즉시 시각화할 수 있어 디자인 작업 등의 효율화를 기대할 수 있습니다. 이 기능에서는 LLM 이 프롬프트를 생성하는데 도움을 줄 수 있습니다.

  <img src="/imgs/usecase_generate_image.gif"/>
</details>


## 아키텍쳐

이 샘플에서는, 프론트엔드는 React 을 사용하여 구현하였고、정적 파일은 Amazon CloudFront + Amazon S3 을 통하여 전달하고 있습니다. 백엔드는 Amazon API Gateway + AWS Lambda、인증은 Amazon Congito 을 사용하고 있습니다. 또한, LLM 은 Amazon Bedrock 을 사용하였으며, RAG 의 데이터소스는 Amazon Kendra 을 사용하였습니다.

![arch.png](/imgs/arch.png)

## 배포

**이 Repository에서는 기본적으로 버지니아 북부 (us-east-1) 리전의 Anthropic Claude 모델을 사용하도록 되어 있습니다. [Model access 화면](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) 을 열고、「Edit」 → 「Anthropic Claude 에 체크」 → 「Save changes」 를 눌러서 버지니아 북부 리전에서 Amazon Bedrock (기반 모델: Claude) 을 사용할 수 있도록 설정 바랍니다. 도쿄 리전 모델을 사용하는 경우 등 설정 변경 방법은  [모델/리전 변경](#모델리전변경) 을 참고바랍니다.**

[AWS Cloud Development Kit](https://aws.amazon.com/jp/cdk/)（이하 CDK） 를 이용하여 배포합니다. 먼저 npm 패키지를 설치해주세요. 모든 명령어는 루트 디렉토리에 실행바랍니다. 또한, [이 동영상(일본어)](https://www.youtube.com/watch?v=9sMA17OKP1k)에서도 배포 절차를 확인할 수 있습니다

```bash
npm ci
```

CDK 를 이용한적이 없는 경우, 최초 1회의 [Bootstrap](https://docs.aws.amazon.com/ko_kr/cdk/v2/guide/bootstrapping.html) 작업이 필요합니다. 이미 Bootstrap 이 완료된 환경이라면 다음 명령어가 필요하지 않습니다.

```bash
npx -w packages/cdk cdk bootstrap
```

이어서 다음 명령어로 AWS 리소스를 배포합니다. 배포가 완료될 떄까지 기다리세요 (약 20분 소요)

```bash
npm run cdk:deploy
```

- [참고 (다른 모델 혹은 리전을 사용하고 싶은 경우)](/docs/BEDROCK.md)

### RAG 활성화

RAG 사용 사례를 이용하고자 하는 경우, RAG 활성화 및 Kendra 의 Data source 을 수동으로 동기화 해야합니다.

먼저, RAG 를 활성화 하고 재배포합니다.
`packages/cdk/cdk.json` 을 열고、`context` 의 `ragEnabled` 을 `true` 로 변경합니다.
이후 다음 명령어로 재배포합니다.

```bash
npm run cdk:deploy
```

이어서、Kendra 의 Data source 의 동기화를 다음과 같이 진행합니다.

1. [Amazon Kendra 콘솔](https://console.aws.amazon.com/kendra/home) 을 엽니다.
1. generative-ai-use-cases-index 를 클릭힙니다.
1. Data sources 를 클릭합니다.
1. WebCrawler 클릭
1. Sync now 클릭

Sync run history 의 Status / Summary 에 Completed 가 표시되면 완료된 것입니다. AWS 의 Amazon Bedrock 관련 페이지를 크롤링하여、자동으로 문서가 추가됩니다.

### 이미지 생성 활성화

이미지 생성 기능을 사용하려면、Stability AI 의 Stable Diffusion XL 모델을 활성화해야 합니다. [Model access 화면](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) 을 열고、「Edit」 → 「Stable Diffusion XL 에 체크」 → 「Save changes」 를 통해 작업한 뒤、버지니아 북부 리전에서 Amazon Bedrock (기반 모델: Stable Diffusion XL) 을 사용가능 한 상태로 설정해주시기 바랍니다. 참고로, 이미지 생성과 관련해서 Stable Diffusion XL 을 활성화 하지 않더라도 화면에 기능 표시되므로 주의해주십시오. 모델을 활성화하지 않은 상태에서 실행하면 오류가 발생합니다.


## 기타 문서
- 모델 및 지역 변경
  - [Amazon Bedrock 의 다른 모델/지역을 이용하고 싶은 경우](/docs/BEDROCK.md)
  - [Amazon SageMaker 를 이용하고 싶은 경우](/docs/SAGEMAKER.md)
- 개발
  - [로컬 개발 환경 구축 절차](/docs/DEVELOPMENT.md)
  - [사용 사례 추가 방법 (블로그: Amazon Bedrock 에서  Interpreter 를 개발하다!)(일본어)](https://aws.amazon.com/jp/builders-flash/202311/bedrock-interpreter/#04)


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

