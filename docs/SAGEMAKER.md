# Amazon SageMaker 의 커스텀 모델을 이용하는 경우

>해당 가이드는 일본어 사용을 기준으로 되어 있습니다. 참고해주세요.

Amazon SageMaker 에 배포된 LLM을 이용할 수 있습니다.

Text Generation Inference (TGI) 의 Huggingface Container 를 사용한 SageMaker Endpoint 에 대응합니다.

이 모델은 사용자와 AI가 번갈아 가면서 말하는 채팅 형식의 프롬프트를 지원하는 것이 이상적입니다.

**현재 이미지 생성의 경우에는 Amazon SageMaker Endpoint에서 지원되지 않으므로 참고바랍니다.**

## SageMaker Endpoint 배포

**사용 가능한 모델**

- [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [elyza/ELYZA-japanese-Llama-2-7b-instruct](https://github.com/aws-samples/aws-ml-jp/blob/f57da0343d696d740bb980dc16ebf28b1221f90e/tasks/generative-ai/text-to-text/fine-tuning/instruction-tuning/Transformers/Elyza_Inference_TGI_ja.ipynb)

이 모델 외에도 Text Generation Inference 에 배포한 모델은 사용 할 수 있습니다.

## SageMaker Endpoint를 대상으로 솔루션 배포하기

미리 배포된 SageMaker Endpoint를 타깃 솔루션으로 배포할 때는, 다음과 같이 명령어의 Argument로 지정 할 수 있습니다.

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=<SageMaker Endpoint Region> -c modelName=<SageMaker Endpoint Name> -c promptTemplate=<Prompt Template File>
```

promptTemplate 은 프롬프트를 구축하기 위한 템플릿을 JSON 으로 만든 파일명을 지정합니다. (예: `llama2.json`)
프롬프트 템플릿 예제는 `prompt-templates` 폴더를 참고합니다.

## 배포 예시:

**Rinna 3.6B**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16 -c promptTemplate=rinna.json
```

**Bilingual Rinna 4B**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16 -c promptTemplate=bilingualRinna.json
```

**ELYZA-japanese-Llama-2-7b-instruct**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=elyza-7b-inference -c promptTemplate=llama2.json
```
