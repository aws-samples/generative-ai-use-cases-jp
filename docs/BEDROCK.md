# Amazon Bedrock 의 다른 모델을 이용하고 싶은 경우

이 솔루션은 기본적으로 `us-east-1` 의 `anthropic.claude-v2` 을 이용하고 있습니다.

CDK Deploy 할 떼, 파라미터 등을 `packages/cdk/cdk.json` 에서 Context 로 지정하여 지역, 모델, 프롬프트를 변경할 수 있습니다.

```bash
npm run cdk:deploy -- -c modelRegion=<Region> -c modelName=<Model Name> -c promptTemplate=<Prompt Tempalte File>
```

promptTemplate 은 프롬프트를 구축 하기 위한 템플릿으로 JSON 타입의 파일을 지정합니다. (예: `llama2.json`)
프롬프트 템플릿 예제는 `prompt-templates` 폴더를 참고합니다.

## 배포 예시

**ap-northeast-1 (도쿄) 의 Amazon Bedrock Claude Instant 를 이용합니다**

> **현재、모델의 리전 (modelRegion) 으로 도쿄 (ap-northeast-1) 를 지정한 경우、이미지 생성의 기능은 동작하지 않습니다. 도쿄 지역의 Amazon Bedrock 에서 Stable Diffusion XL 모델이 지원되는 즉시 사용가능합니다.**

```bash
npm run cdk:deploy -- -c modelRegion=ap-northeast-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```

**us-east-1 (버지니아) 의 Amazon Bedrock Claude Instant 를 이용합니다**

```bash
npm run cdk:deploy -- -c modelRegion=us-east-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```
