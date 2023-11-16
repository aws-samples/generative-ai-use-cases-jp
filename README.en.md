>**This repository is optimized for Japanese with English language translations provided by Amazon Translate. It still needs more work editing the English translations for minor improvements and broken links and images.**

# Generative AI Use Cases

Generative AI (Generative AI) brings revolutionary possibilities to business transformation. This repository demonstrates business use cases utilizing Generative AI.

<FIX THESE IMAGES LATER>
! [sc_lp.png] (/imgs/sc_lp.png)

> **As generative AI evolves, disruptive changes are often made. If an error occurs, first check if there are any updates to the main branch. **

## Features List

> :white_check_mark:... Implemented, :construction:... Not implemented yet

- :white_check_mark: Use Amazon Bedrock as LLM
- :white_check_mark: data collection for Amazon Bedrock Fine-Tuning
-: Construction: Labeling Data for Amazon Bedrock Fine-Tuning
-: Construction: Execute Amazon Bedrock Fine-Tuning

## Use Case List

> Use cases will be added over time. If you have a request, please file a vote on [Issue] (https://github.com/aws-samples/generative-ai-use-cases-jp/issues).

<details>
 <summary>chat</summary>

 You can interact with LLM in a chat format. Thanks to the existence of a platform that directly interacts with LLM, it is possible to respond quickly to detailed use cases and new use cases. It is also effective as a verification environment for prompt engineering.

 <img src="/imgs/usecase_chat.gif"/></details>

<details>
 <summary>RAG chat</summary>

 RAG is a method of conveying the latest information and domain knowledge from outside that LLM is not good at, so that it is possible to answer content that could not be answered originally. At the same time, since only evidence-based answers are allowed, it also has the effect of not having them answer “such incorrect information,” which is common in LLM. For example, if internal documents are passed to LLM, internal inquiry handling can be automated. This repository retrieves information from Amazon Kendra.

 <img src="/imgs/usecase_rag.gif"/></details>

<details>
 <summary>Text generation</summary>

 Generating sentences in every context is one of the tasks LLM excels at. It supports all kinds of contexts, such as articles, reports, emails, etc.

 <img src="/imgs/usecase_generate_text.gif"/></details>

<details>
 <summary>summary</summary>

 LLM excels at the task of summarizing large amounts of sentences. In addition to simply summarizing, it is also possible to pull out necessary information in an interactive format after giving sentences as context. For example, let me read the contract and ask “What are the conditions of XXX?” “How much is YYY?” It is possible to obtain such information.

 <img src="/imgs/usecase_summarize.gif"/></details>

<details>
 <summary>proofreading</summary>

 In addition to checking for typos and omissions, LLM can also suggest improvements from a more objective point of view that takes into account the flow and content of sentences. You can expect the effect of improving quality by having LLM objectively check points you weren't aware of before showing them to others.

 <img src="/imgs/usecase_editorial.gif"/></details>

<details>
 <summary>translation</summary>

 LLM learned in multiple languages can also be translated. Also, in addition to simply translating, it is possible to reflect various specified context information such as casuality and target groups in the translation.

 <img src="/imgs/usecase_translate.gif"/></details>


<details>
 <summary>image generation</summary>

 Image generation AI can generate new images based on text and images. Ideas can be immediately visualized, and efficiency in design work etc. can be expected to improve. With this feature, you can get LLM to help you create prompts.

 <img src="/imgs/usecase_generate_image.gif"/></details>


## Architecture

In this sample, the front end is implemented using React, and the static files are delivered by Amazon CloudFront+ Amazon S3. We use Amazon API Gateway+ AWS Lambda for the backend and Amazon Congito for authentication. Also, LLM uses Amazon Bedrock. The RAG data source is Amazon Kendra.

! [arch.png] (/imgs/arch.png)

## Deploy

**This repository is set to use the Northern Virginia (us-east-1) region's Anthropic Claude models by default. To make sure they're enabled, go to the [Model Access screen](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) in Bedrock and click "Manage Model Access," check the desired Anthropic Claude models, and click “Save changes.” This will enable Anthropic models to be used in the Northern Virginia region. Please read [if you want to use a different model of Amazon Bedrock](/docs/Bedrock.md) for more information about how to change settings, such as when using Claude Instant. **

Applications are deployed using the [AWS Cloud Development Kit](https://aws.amazon.com/en/cdk/)（hereafter "CDK"). You can check more detailed instructions in [this document](https://catalog.workshops.aws/generative-ai-use-cases-jp), which explains how to prepare a CDK environment, explain deployment procedures, and add security features. You can also check out the deployment instructions in [this video](https://www.youtube.com/watch?v=9sMA17OKP1k).

The deployment procedure is described below.

```bash
npm ci
```

If you haven't used CDK, you only need to do [Bootstrap](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/bootstrapping.html) for the first time. The following command is unnecessary in an environment that is already Bootstrapped.

```bash
npx -w packages/cdk cdk bootstrap
```

Next, deploy the AWS resources with the following command. Please wait until the deployment is complete (this may take up to 20 minutes).

```bash
npm run cdk:deploy
```

- [Reference (if you want to use a different model or region)] (/docs/bedrock.md)

### RAG enabled

If you're trying out the RAG use case, you'll need to enable RAG and manually sync Kendra's data source.

First, enable RAG and redeploy.
Open `packages/cdk/cdk.json` and change `rageenabled` in `context` to `true`.
Then redeploy with the following command.

```bash
npm run cdk:deploy
```

Next, follow the steps below to sync Kendra's Data Source.

1. Open [Amazon Kendra console screen] (https://console.aws.amazon.com/kendra/home)
1. Click generative-ai-use-cases-index
1. Click on Data Sources
1. Click WebCrawler
1. Click Sync Now

If Completed is displayed in the Status/ Summary of the sync run history, then you're done. Pages related to Amazon Bedrock on AWS are crawled, and documentation is automatically added.

### Enabling image generation

When using image generation use cases, it is necessary to enable Stability AI's Stable Diffusion XL model. [Model access screen] (https://us-east-1.console.aws.amazon.com/bedrock/home? Open region=us-east-1#/modelaccess) and operate “Edit” → “Check Stable Diffusion XL” → “Save changes” so that Amazon Bedrock (base model: Stable Diffusion XL) can be used in the Northern Virginia region. Note that image generation is displayed on the screen as a use case even when Stable Diffusion XL is not enabled, so be aware. If you run the model without being enabled, an error will occur.

## Other documentation
- Deployment options
 - [If you want to use a different model region of Amazon Bedrock] (/docs/Bedrock.md)
 - [If you want to use Amazon SageMaker] (/docs/SageMaker.md)
 - [security-related] (/docs/security.md)
- development
 - [Procedure for building a local development environment] (/docs/development.md)
 - [How to add use cases (blog: Develop an Interpreter with Amazon Bedrock!)] (https://aws.amazon.com/jp/builders-flash/202311/bedrock-interpreter/#04)
 - [How to delete resources] (/docs/destroy.md)

## Security

See [CONTRIBUTING.MD #security -issue-notifications) for more information.

## License

This library is licensed under the MIT-0 license. See the LICENSE file.

